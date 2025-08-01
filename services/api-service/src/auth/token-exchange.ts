import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Simple token exchange: API key -> JWT token
 * This allows existing API key users to get JWT tokens without OAuth complexity
 */
export function exchangeApiKeyForJWT(req: Request, res: Response) {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
        return res.status(400).json({
            error: 'API key required',
            message: 'Provide x-api-key header',
            timestamp: new Date().toISOString()
        });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return res.status(500).json({
            error: 'JWT not configured',
            message: 'Server does not support JWT tokens',
            timestamp: new Date().toISOString()
        });
    }

    // For demo purposes, we'll accept any API key and generate a JWT
    // In production, you'd validate the API key against your system
    const isValidApiKey = apiKey.startsWith('demo-api-key') || apiKey.length > 10;

    if (!isValidApiKey) {
        return res.status(401).json({
            error: 'Invalid API key',
            timestamp: new Date().toISOString()
        });
    }

    // Generate JWT token with API key as the user identifier
    const jwtToken = jwt.sign(
        {
            sub: `api-key-user-${apiKey.slice(-8)}`, // Use last 8 chars of API key as user ID
            email: `${apiKey.slice(-8)}@api-key-user.local`,
            provider: 'api-key',
            apiKey: apiKey // Include original API key for reference
        },
        jwtSecret,
        { expiresIn: '24h' }
    );

    res.json({
        token: jwtToken,
        type: 'Bearer',
        expiresIn: '24h',
        message: 'Use this token in Authorization: Bearer <token> header',
        timestamp: new Date().toISOString()
    });
}