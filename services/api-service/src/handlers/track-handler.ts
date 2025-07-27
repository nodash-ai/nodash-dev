import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { StoreSelector } from '../interfaces/storage.js';
import { AnalyticsEvent, TrackRequest } from '../types/core.js';

export class TrackHandler {
  private storeSelector: StoreSelector;

  constructor(storeSelector: StoreSelector) {
    this.storeSelector = storeSelector;
  }

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const trackRequest = req.validatedBody as TrackRequest;
      const tenantId = req.tenantInfo!.tenantId;
      const requestId = req.requestId!;

      // Parse timestamp or use current time
      const timestamp = trackRequest.timestamp
        ? new Date(trackRequest.timestamp)
        : new Date();
      const receivedAt = new Date();

      // Create analytics event
      const event: AnalyticsEvent = {
        eventId: uuidv4(),
        tenantId,
        eventName: trackRequest.event,
        properties: trackRequest.properties || {},
        timestamp,
        receivedAt,
        ...(trackRequest.userId && { userId: trackRequest.userId }),
        ...(trackRequest.sessionId && { sessionId: trackRequest.sessionId }),
        ...(trackRequest.deviceId && { deviceId: trackRequest.deviceId }),
      };

      // Check for duplicates
      const deduplicationAdapter = this.storeSelector.getDeduplicationAdapter();
      const isDuplicate = await deduplicationAdapter.isDuplicate(
        tenantId,
        event.eventId
      );

      if (isDuplicate) {
        // Return success for duplicate events (idempotent behavior)
        res.status(200).json({
          success: true,
          eventId: event.eventId,
          message: 'Event already processed',
          timestamp: receivedAt,
          requestId,
        });
        return;
      }

      // Store the event
      const eventAdapter = this.storeSelector.getEventAdapter();
      const result = await eventAdapter.insert(event);

      if (!result.success) {
        res.status(500).json({
          error: 'Failed to store event',
          message: result.error || 'Unknown storage error',
          statusCode: 500,
          timestamp: receivedAt,
          requestId,
        });
        return;
      }

      // Mark as processed for deduplication
      await deduplicationAdapter.markProcessed(tenantId, event.eventId, 3600); // 1 hour TTL

      // Update user record if userId is provided
      if (trackRequest.userId) {
        await this.updateUserRecord(tenantId, trackRequest.userId, timestamp);
      }

      // Return success response
      res.status(200).json({
        success: true,
        eventId: event.eventId,
        timestamp: receivedAt,
        requestId,
      });
    } catch (error) {
      console.error('Track handler error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process track request',
        statusCode: 500,
        timestamp: new Date(),
        requestId: req.requestId,
      });
    }
  }

  private async updateUserRecord(
    tenantId: string,
    userId: string,
    timestamp: Date
  ): Promise<void> {
    try {
      const userAdapter = this.storeSelector.getUserAdapter();

      // Get existing user or create new one
      const existingUser = await userAdapter.get(tenantId, userId);

      const userRecord = {
        userId,
        tenantId,
        properties: existingUser?.properties || {},
        firstSeen: existingUser?.firstSeen || timestamp,
        lastSeen: timestamp,
        sessionCount: existingUser?.sessionCount || 0,
        eventCount: (existingUser?.eventCount || 0) + 1,
      };

      await userAdapter.upsert(userRecord);
    } catch (error) {
      // Log error but don't fail the track request
      console.error('Failed to update user record:', error);
    }
  }
}
