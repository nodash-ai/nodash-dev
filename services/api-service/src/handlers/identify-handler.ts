import { Request, Response } from 'express';
import { StoreSelector } from '../interfaces/storage.js';
import { UserRecord, IdentifyRequest } from '../types/core.js';

export class IdentifyHandler {
  private storeSelector: StoreSelector;

  constructor(storeSelector: StoreSelector) {
    this.storeSelector = storeSelector;
  }

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const identifyRequest = req.validatedBody as IdentifyRequest;
      const tenantId = req.tenantInfo!.tenantId;
      const requestId = req.requestId!;

      // Parse timestamp or use current time
      const timestamp = identifyRequest.timestamp
        ? new Date(identifyRequest.timestamp)
        : new Date();

      const userAdapter = this.storeSelector.getUserAdapter();

      // Get existing user or create new one
      const existingUser = await userAdapter.get(
        tenantId,
        identifyRequest.userId
      );

      let sessionCount = 0;
      if (existingUser) {
        const timeSinceLastSeen =
          timestamp.getTime() - existingUser.lastSeen.getTime();
        const thirtyMinutesInMs = 30 * 60 * 1000;

        sessionCount =
          timeSinceLastSeen > thirtyMinutesInMs
            ? existingUser.sessionCount + 1
            : existingUser.sessionCount;
      } else {
        sessionCount = 1;
      }

      const userRecord: UserRecord = {
        userId: identifyRequest.userId,
        tenantId,
        properties: existingUser
          ? { ...existingUser.properties, ...(identifyRequest.traits || {}) }
          : identifyRequest.traits || {},
        firstSeen: existingUser?.firstSeen || timestamp,
        lastSeen: timestamp,
        sessionCount,
        eventCount: existingUser?.eventCount || 0,
      };

      // Store the user record
      const result = await userAdapter.upsert(userRecord);

      if (!result.success) {
        res.status(500).json({
          error: 'Failed to store user data',
          message: result.error || 'Unknown storage error',
          statusCode: 500,
          timestamp: new Date(),
          requestId,
        });
        return;
      }

      // Return success response
      res.status(200).json({
        success: true,
        userId: identifyRequest.userId,
        created: result.created,
        timestamp: new Date(),
        requestId,
      });
    } catch (error) {
      console.error('Identify handler error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process identify request',
        statusCode: 500,
        timestamp: new Date(),
        requestId: req.requestId,
      });
    }
  }
}
