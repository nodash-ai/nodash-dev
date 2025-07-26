import { Request, Response } from 'express';
import { QueryService } from '../services/query-service.js';
import { QueryOptions, UserQueryOptions } from '../types/core.js';

export class QueryHandler {
  private queryService: QueryService;

  constructor(queryService: QueryService) {
    this.queryService = queryService;
  }

  async handleEventQuery(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantInfo!.tenantId;
      const requestId = req.requestId!;

      // Parse query parameters
      const options: QueryOptions = {};

      // Event type filtering
      if (req.query.eventTypes) {
        const eventTypesParam = req.query.eventTypes as string;
        options.eventTypes = eventTypesParam.split(',').map(t => t.trim());
      }

      if (req.query.eventType) {
        options.eventTypes = [req.query.eventType as string];
      }

      // User filtering
      if (req.query.userId) {
        options.userId = req.query.userId as string;
      }

      // Date filtering
      if (req.query.startDate) {
        try {
          options.startDate = new Date(req.query.startDate as string);
          if (isNaN(options.startDate.getTime())) {
            throw new Error('Invalid startDate format');
          }
        } catch (error) {
          res.status(400).json({
            error: 'Invalid startDate',
            message: 'startDate must be a valid ISO 8601 date string',
            statusCode: 400,
            timestamp: new Date(),
            requestId,
          });
          return;
        }
      }

      if (req.query.endDate) {
        try {
          options.endDate = new Date(req.query.endDate as string);
          if (isNaN(options.endDate.getTime())) {
            throw new Error('Invalid endDate format');
          }
        } catch (error) {
          res.status(400).json({
            error: 'Invalid endDate',
            message: 'endDate must be a valid ISO 8601 date string',
            statusCode: 400,
            timestamp: new Date(),
            requestId,
          });
          return;
        }
      }

      // Validate date range
      if (options.startDate && options.endDate && options.startDate > options.endDate) {
        res.status(400).json({
          error: 'Invalid date range',
          message: 'startDate must be before endDate',
          statusCode: 400,
          timestamp: new Date(),
          requestId,
        });
        return;
      }

      // Property filtering
      if (req.query.properties) {
        try {
          options.properties = JSON.parse(req.query.properties as string);
        } catch (error) {
          res.status(400).json({
            error: 'Invalid properties',
            message: 'properties must be valid JSON',
            statusCode: 400,
            timestamp: new Date(),
            requestId,
          });
          return;
        }
      }

      // Sorting
      if (req.query.sortBy) {
        const sortBy = req.query.sortBy as string;
        if (!['timestamp', 'eventName', 'userId'].includes(sortBy)) {
          res.status(400).json({
            error: 'Invalid sortBy',
            message: 'sortBy must be one of: timestamp, eventName, userId',
            statusCode: 400,
            timestamp: new Date(),
            requestId,
          });
          return;
        }
        options.sortBy = sortBy as 'timestamp' | 'eventName' | 'userId';
      }

      if (req.query.sortOrder) {
        const sortOrder = req.query.sortOrder as string;
        if (!['asc', 'desc'].includes(sortOrder)) {
          res.status(400).json({
            error: 'Invalid sortOrder',
            message: 'sortOrder must be either "asc" or "desc"',
            statusCode: 400,
            timestamp: new Date(),
            requestId,
          });
          return;
        }
        options.sortOrder = sortOrder as 'asc' | 'desc';
      }

      // Pagination
      if (req.query.limit) {
        const limit = parseInt(req.query.limit as string, 10);
        if (isNaN(limit) || limit <= 0 || limit > 1000) {
          res.status(400).json({
            error: 'Invalid limit',
            message: 'limit must be a positive integer between 1 and 1000',
            statusCode: 400,
            timestamp: new Date(),
            requestId,
          });
          return;
        }
        options.limit = limit;
      }

      if (req.query.offset) {
        const offset = parseInt(req.query.offset as string, 10);
        if (isNaN(offset) || offset < 0) {
          res.status(400).json({
            error: 'Invalid offset',
            message: 'offset must be a non-negative integer',
            statusCode: 400,
            timestamp: new Date(),
            requestId,
          });
          return;
        }
        options.offset = offset;
      }

      // Output formatting
      if (req.query.format) {
        const format = req.query.format as string;
        if (!['json', 'table', 'csv'].includes(format)) {
          res.status(400).json({
            error: 'Invalid format',
            message: 'format must be one of: json, table, csv',
            statusCode: 400,
            timestamp: new Date(),
            requestId,
          });
          return;
        }
        options.format = format as 'json' | 'table' | 'csv';
      }

      // Execute query
      const result = await this.queryService.queryEvents(tenantId, options);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date(),
        requestId,
      });
    } catch (error) {
      console.error('Event query handler error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process event query',
        statusCode: 500,
        timestamp: new Date(),
        requestId: req.requestId,
      });
    }
  }

  async handleUserQuery(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantInfo!.tenantId;
      const requestId = req.requestId!;

      // Parse query parameters
      const options: UserQueryOptions = {};

      // User filtering
      if (req.query.userId) {
        options.userId = req.query.userId as string;
      }

      // Activity date filtering
      if (req.query.activeSince) {
        try {
          options.activeSince = new Date(req.query.activeSince as string);
          if (isNaN(options.activeSince.getTime())) {
            throw new Error('Invalid activeSince format');
          }
        } catch (error) {
          res.status(400).json({
            error: 'Invalid activeSince',
            message: 'activeSince must be a valid ISO 8601 date string',
            statusCode: 400,
            timestamp: new Date(),
            requestId,
          });
          return;
        }
      }

      if (req.query.activeUntil) {
        try {
          options.activeUntil = new Date(req.query.activeUntil as string);
          if (isNaN(options.activeUntil.getTime())) {
            throw new Error('Invalid activeUntil format');
          }
        } catch (error) {
          res.status(400).json({
            error: 'Invalid activeUntil',
            message: 'activeUntil must be a valid ISO 8601 date string',
            statusCode: 400,
            timestamp: new Date(),
            requestId,
          });
          return;
        }
      }

      // Validate date range
      if (options.activeSince && options.activeUntil && options.activeSince > options.activeUntil) {
        res.status(400).json({
          error: 'Invalid date range',
          message: 'activeSince must be before activeUntil',
          statusCode: 400,
          timestamp: new Date(),
          requestId,
        });
        return;
      }

      // Property filtering
      if (req.query.properties) {
        try {
          options.properties = JSON.parse(req.query.properties as string);
        } catch (error) {
          res.status(400).json({
            error: 'Invalid properties',
            message: 'properties must be valid JSON',
            statusCode: 400,
            timestamp: new Date(),
            requestId,
          });
          return;
        }
      }

      // Sorting
      if (req.query.sortBy) {
        const sortBy = req.query.sortBy as string;
        if (!['firstSeen', 'lastSeen', 'eventCount', 'sessionCount'].includes(sortBy)) {
          res.status(400).json({
            error: 'Invalid sortBy',
            message: 'sortBy must be one of: firstSeen, lastSeen, eventCount, sessionCount',
            statusCode: 400,
            timestamp: new Date(),
            requestId,
          });
          return;
        }
        options.sortBy = sortBy as 'firstSeen' | 'lastSeen' | 'eventCount' | 'sessionCount';
      }

      if (req.query.sortOrder) {
        const sortOrder = req.query.sortOrder as string;
        if (!['asc', 'desc'].includes(sortOrder)) {
          res.status(400).json({
            error: 'Invalid sortOrder',
            message: 'sortOrder must be either "asc" or "desc"',
            statusCode: 400,
            timestamp: new Date(),
            requestId,
          });
          return;
        }
        options.sortOrder = sortOrder as 'asc' | 'desc';
      }

      // Pagination
      if (req.query.limit) {
        const limit = parseInt(req.query.limit as string, 10);
        if (isNaN(limit) || limit <= 0 || limit > 1000) {
          res.status(400).json({
            error: 'Invalid limit',
            message: 'limit must be a positive integer between 1 and 1000',
            statusCode: 400,
            timestamp: new Date(),
            requestId,
          });
          return;
        }
        options.limit = limit;
      }

      if (req.query.offset) {
        const offset = parseInt(req.query.offset as string, 10);
        if (isNaN(offset) || offset < 0) {
          res.status(400).json({
            error: 'Invalid offset',
            message: 'offset must be a non-negative integer',
            statusCode: 400,
            timestamp: new Date(),
            requestId,
          });
          return;
        }
        options.offset = offset;
      }

      // Output formatting
      if (req.query.format) {
        const format = req.query.format as string;
        if (!['json', 'table', 'csv'].includes(format)) {
          res.status(400).json({
            error: 'Invalid format',
            message: 'format must be one of: json, table, csv',
            statusCode: 400,
            timestamp: new Date(),
            requestId,
          });
          return;
        }
        options.format = format as 'json' | 'table' | 'csv';
      }

      // Execute query
      const result = await this.queryService.queryUsers(tenantId, options);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date(),
        requestId,
      });
    } catch (error) {
      console.error('User query handler error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process user query',
        statusCode: 500,
        timestamp: new Date(),
        requestId: req.requestId,
      });
    }
  }
}