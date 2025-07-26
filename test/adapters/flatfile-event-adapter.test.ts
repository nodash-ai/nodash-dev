import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { FlatFileEventAdapter } from '../../src/adapters/flatfile-event-adapter.js';
import { AnalyticsEvent } from '../../src/types/core.js';

describe('FlatFileEventAdapter', () => {
  let adapter: FlatFileEventAdapter;
  let testDir: string;

  beforeEach(async () => {
    testDir = './test-flatfile-events';
    adapter = new FlatFileEventAdapter(testDir, 'daily');

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  });

  afterEach(async () => {
    await adapter.close();

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('insert', () => {
    it('should insert a single event successfully', async () => {
      const event: AnalyticsEvent = {
        eventId: 'event-123',
        tenantId: 'tenant-1',
        userId: 'user-123',
        eventName: 'page_view',
        properties: { page: '/home', source: 'web' },
        timestamp: new Date('2025-01-15T10:00:00Z'),
        receivedAt: new Date('2025-01-15T10:00:01Z'),
        sessionId: 'session-456',
        deviceId: 'device-789',
      };

      const result = await adapter.insert(event);

      expect(result.success).toBe(true);
      expect(result.eventId).toBe('event-123');
      expect(result.error).toBeUndefined();

      // Verify file was created and contains the event
      const expectedFile = join(testDir, 'tenant-1', '2025', '01', 'events-2025-01-15.jsonl');
      const fileContent = await fs.readFile(expectedFile, 'utf8');
      const savedEvent = JSON.parse(fileContent.trim());

      expect(savedEvent.eventId).toBe('event-123');
      expect(savedEvent.tenantId).toBe('tenant-1');
      expect(savedEvent.eventName).toBe('page_view');
    });

    it('should handle multiple events for the same tenant and date', async () => {
      const events: AnalyticsEvent[] = [
        {
          eventId: 'event-1',
          tenantId: 'tenant-1',
          eventName: 'page_view',
          properties: { page: '/home' },
          timestamp: new Date('2025-01-15T10:00:00Z'),
          receivedAt: new Date('2025-01-15T10:00:01Z'),
        },
        {
          eventId: 'event-2',
          tenantId: 'tenant-1',
          eventName: 'button_click',
          properties: { button: 'signup' },
          timestamp: new Date('2025-01-15T11:00:00Z'),
          receivedAt: new Date('2025-01-15T11:00:01Z'),
        },
      ];

      for (const event of events) {
        const result = await adapter.insert(event);
        expect(result.success).toBe(true);
      }

      // Verify both events are in the same file
      const expectedFile = join(testDir, 'tenant-1', '2025', '01', 'events-2025-01-15.jsonl');
      const fileContent = await fs.readFile(expectedFile, 'utf8');
      const lines = fileContent.trim().split('\n');

      expect(lines).toHaveLength(2);

      const event1 = JSON.parse(lines[0]);
      const event2 = JSON.parse(lines[1]);

      expect(event1.eventId).toBe('event-1');
      expect(event2.eventId).toBe('event-2');
    });

    it('should separate events by tenant', async () => {
      const event1: AnalyticsEvent = {
        eventId: 'event-1',
        tenantId: 'tenant-1',
        eventName: 'page_view',
        properties: {},
        timestamp: new Date('2025-01-15T10:00:00Z'),
        receivedAt: new Date('2025-01-15T10:00:01Z'),
      };

      const event2: AnalyticsEvent = {
        eventId: 'event-2',
        tenantId: 'tenant-2',
        eventName: 'page_view',
        properties: {},
        timestamp: new Date('2025-01-15T10:00:00Z'),
        receivedAt: new Date('2025-01-15T10:00:01Z'),
      };

      await adapter.insert(event1);
      await adapter.insert(event2);

      // Verify events are in separate tenant directories
      const tenant1File = join(testDir, 'tenant-1', '2025', '01', 'events-2025-01-15.jsonl');
      const tenant2File = join(testDir, 'tenant-2', '2025', '01', 'events-2025-01-15.jsonl');

      const tenant1Content = await fs.readFile(tenant1File, 'utf8');
      const tenant2Content = await fs.readFile(tenant2File, 'utf8');

      const tenant1Event = JSON.parse(tenant1Content.trim());
      const tenant2Event = JSON.parse(tenant2Content.trim());

      expect(tenant1Event.tenantId).toBe('tenant-1');
      expect(tenant2Event.tenantId).toBe('tenant-2');
    });

    it('should separate events by date', async () => {
      const event1: AnalyticsEvent = {
        eventId: 'event-1',
        tenantId: 'tenant-1',
        eventName: 'page_view',
        properties: {},
        timestamp: new Date('2025-01-15T10:00:00Z'),
        receivedAt: new Date('2025-01-15T10:00:01Z'),
      };

      const event2: AnalyticsEvent = {
        eventId: 'event-2',
        tenantId: 'tenant-1',
        eventName: 'page_view',
        properties: {},
        timestamp: new Date('2025-01-16T10:00:00Z'),
        receivedAt: new Date('2025-01-16T10:00:01Z'),
      };

      await adapter.insert(event1);
      await adapter.insert(event2);

      // Verify events are in separate date files
      const date1File = join(testDir, 'tenant-1', '2025', '01', 'events-2025-01-15.jsonl');
      const date2File = join(testDir, 'tenant-1', '2025', '01', 'events-2025-01-16.jsonl');

      expect(
        await fs
          .access(date1File)
          .then(() => true)
          .catch(() => false)
      ).toBe(true);
      expect(
        await fs
          .access(date2File)
          .then(() => true)
          .catch(() => false)
      ).toBe(true);
    });
  });

  describe('insertBatch', () => {
    it('should insert multiple events in a batch', async () => {
      const events: AnalyticsEvent[] = [
        {
          eventId: 'event-1',
          tenantId: 'tenant-1',
          eventName: 'page_view',
          properties: { page: '/home' },
          timestamp: new Date('2025-01-15T10:00:00Z'),
          receivedAt: new Date('2025-01-15T10:00:01Z'),
        },
        {
          eventId: 'event-2',
          tenantId: 'tenant-1',
          eventName: 'button_click',
          properties: { button: 'signup' },
          timestamp: new Date('2025-01-15T11:00:00Z'),
          receivedAt: new Date('2025-01-15T11:00:01Z'),
        },
        {
          eventId: 'event-3',
          tenantId: 'tenant-2',
          eventName: 'page_view',
          properties: { page: '/about' },
          timestamp: new Date('2025-01-15T12:00:00Z'),
          receivedAt: new Date('2025-01-15T12:00:01Z'),
        },
      ];

      const results = await adapter.insertBatch(events);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.eventId).toBe(events[index].eventId);
      });

      // Verify files were created correctly
      const tenant1File = join(testDir, 'tenant-1', '2025', '01', 'events-2025-01-15.jsonl');
      const tenant2File = join(testDir, 'tenant-2', '2025', '01', 'events-2025-01-15.jsonl');

      const tenant1Content = await fs.readFile(tenant1File, 'utf8');
      const tenant2Content = await fs.readFile(tenant2File, 'utf8');

      const tenant1Lines = tenant1Content.trim().split('\n');
      const tenant2Lines = tenant2Content.trim().split('\n');

      expect(tenant1Lines).toHaveLength(2);
      expect(tenant2Lines).toHaveLength(1);
    });
  });

  describe('healthCheck', () => {
    it('should return true when adapter is healthy', async () => {
      const isHealthy = await adapter.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should return false when directory is not writable', async () => {
      // Create adapter with invalid path
      const invalidAdapter = new FlatFileEventAdapter('/invalid/path/that/does/not/exist', 'daily');

      const isHealthy = await invalidAdapter.healthCheck();
      expect(isHealthy).toBe(false);

      await invalidAdapter.close();
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      // Insert test data
      const events: AnalyticsEvent[] = [
        {
          eventId: 'event-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          eventName: 'page_view',
          properties: { page: '/home' },
          timestamp: new Date('2025-01-15T10:00:00Z'),
          receivedAt: new Date('2025-01-15T10:00:01Z'),
        },
        {
          eventId: 'event-2',
          tenantId: 'tenant-1',
          userId: 'user-2',
          eventName: 'button_click',
          properties: { button: 'signup' },
          timestamp: new Date('2025-01-15T11:00:00Z'),
          receivedAt: new Date('2025-01-15T11:00:01Z'),
        },
        {
          eventId: 'event-3',
          tenantId: 'tenant-2',
          userId: 'user-1',
          eventName: 'page_view',
          properties: { page: '/about' },
          timestamp: new Date('2025-01-15T12:00:00Z'),
          receivedAt: new Date('2025-01-15T12:00:01Z'),
        },
      ];

      await adapter.insertBatch(events);
    });

    it('should query events by tenant', async () => {
      const result = await adapter.query({
        tenantId: 'tenant-1',
      });

      expect(result.events).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.hasMore).toBe(false);

      const eventIds = result.events.map(e => e.eventId);
      expect(eventIds).toContain('event-1');
      expect(eventIds).toContain('event-2');
    });

    it('should query events by event name', async () => {
      const result = await adapter.query({
        tenantId: 'tenant-1',
        eventName: 'page_view',
      });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].eventId).toBe('event-1');
      expect(result.events[0].eventName).toBe('page_view');
    });

    it('should query events by user ID', async () => {
      const result = await adapter.query({
        tenantId: 'tenant-1',
        userId: 'user-1',
      });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].eventId).toBe('event-1');
      expect(result.events[0].userId).toBe('user-1');
    });

    it('should respect limit parameter', async () => {
      const result = await adapter.query({
        tenantId: 'tenant-1',
        limit: 1,
      });

      expect(result.events).toHaveLength(1);
      expect(result.totalCount).toBe(2);
      expect(result.hasMore).toBe(true);
    });
  });
});
