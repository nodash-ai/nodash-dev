import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { FlatFileUserAdapter } from '../../src/adapters/flatfile-user-adapter.js';
import { UserRecord } from '../../src/types/core.js';

describe('FlatFileUserAdapter', () => {
  let adapter: FlatFileUserAdapter;
  let testDir: string;

  beforeEach(async () => {
    testDir = './test-flatfile-users';
    adapter = new FlatFileUserAdapter(testDir);

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

  describe('upsert', () => {
    it('should create a new user record', async () => {
      const user: UserRecord = {
        userId: 'user-123',
        tenantId: 'tenant-1',
        properties: {
          email: 'user@example.com',
          name: 'John Doe',
          plan: 'premium',
        },
        firstSeen: new Date('2025-01-15T10:00:00Z'),
        lastSeen: new Date('2025-01-15T10:00:00Z'),
        sessionCount: 1,
        eventCount: 0,
      };

      const result = await adapter.upsert(user);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.created).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify file was created
      const expectedFile = join(testDir, 'tenant-1', 'users', 'user-123.json');
      const fileContent = await fs.readFile(expectedFile, 'utf8');
      const savedUser = JSON.parse(fileContent);

      expect(savedUser.userId).toBe('user-123');
      expect(savedUser.tenantId).toBe('tenant-1');
      expect(savedUser.properties.email).toBe('user@example.com');
    });

    it('should update an existing user record', async () => {
      const initialUser: UserRecord = {
        userId: 'user-123',
        tenantId: 'tenant-1',
        properties: {
          email: 'user@example.com',
          name: 'John Doe',
        },
        firstSeen: new Date('2025-01-15T10:00:00Z'),
        lastSeen: new Date('2025-01-15T10:00:00Z'),
        sessionCount: 1,
        eventCount: 5,
      };

      // Create initial user
      await adapter.upsert(initialUser);

      // Update user with new properties
      const updatedUser: UserRecord = {
        userId: 'user-123',
        tenantId: 'tenant-1',
        properties: {
          email: 'user@example.com',
          name: 'John Smith', // Changed name
          plan: 'premium', // New property
        },
        firstSeen: new Date('2025-01-15T10:00:00Z'),
        lastSeen: new Date('2025-01-15T12:00:00Z'), // Updated last seen
        sessionCount: 2, // Incremented
        eventCount: 10, // Incremented
      };

      const result = await adapter.upsert(updatedUser);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.created).toBe(false);

      // Verify file was updated
      const expectedFile = join(testDir, 'tenant-1', 'users', 'user-123.json');
      const fileContent = await fs.readFile(expectedFile, 'utf8');
      const savedUser = JSON.parse(fileContent);

      expect(savedUser.properties.name).toBe('John Smith');
      expect(savedUser.properties.plan).toBe('premium');
      expect(savedUser.sessionCount).toBe(1); // User adapter preserves existing session count
      expect(savedUser.eventCount).toBe(5); // User adapter preserves existing event count
      expect(new Date(savedUser.lastSeen)).toEqual(new Date('2025-01-15T12:00:00Z'));
    });

    it('should merge properties when updating', async () => {
      const initialUser: UserRecord = {
        userId: 'user-123',
        tenantId: 'tenant-1',
        properties: {
          email: 'user@example.com',
          name: 'John Doe',
          age: 30,
        },
        firstSeen: new Date('2025-01-15T10:00:00Z'),
        lastSeen: new Date('2025-01-15T10:00:00Z'),
        sessionCount: 1,
        eventCount: 5,
      };

      await adapter.upsert(initialUser);

      // Update with partial properties
      const partialUpdate: UserRecord = {
        userId: 'user-123',
        tenantId: 'tenant-1',
        properties: {
          name: 'John Smith', // Update existing
          plan: 'premium', // Add new
          // email and age should be preserved
        },
        firstSeen: new Date('2025-01-15T10:00:00Z'),
        lastSeen: new Date('2025-01-15T12:00:00Z'),
        sessionCount: 2,
        eventCount: 10,
      };

      await adapter.upsert(partialUpdate);

      const savedUser = await adapter.get('tenant-1', 'user-123');

      expect(savedUser).not.toBeNull();
      expect(savedUser!.properties.email).toBe('user@example.com'); // Preserved
      expect(savedUser!.properties.name).toBe('John Smith'); // Updated
      expect(savedUser!.properties.age).toBe(30); // Preserved
      expect(savedUser!.properties.plan).toBe('premium'); // Added
    });

    it('should isolate users by tenant', async () => {
      const user1: UserRecord = {
        userId: 'user-123',
        tenantId: 'tenant-1',
        properties: { email: 'user1@example.com' },
        firstSeen: new Date(),
        lastSeen: new Date(),
        sessionCount: 1,
        eventCount: 0,
      };

      const user2: UserRecord = {
        userId: 'user-123', // Same user ID, different tenant
        tenantId: 'tenant-2',
        properties: { email: 'user2@example.com' },
        firstSeen: new Date(),
        lastSeen: new Date(),
        sessionCount: 1,
        eventCount: 0,
      };

      await adapter.upsert(user1);
      await adapter.upsert(user2);

      // Verify users are stored in separate tenant directories
      const tenant1File = join(testDir, 'tenant-1', 'users', 'user-123.json');
      const tenant2File = join(testDir, 'tenant-2', 'users', 'user-123.json');

      const tenant1Content = await fs.readFile(tenant1File, 'utf8');
      const tenant2Content = await fs.readFile(tenant2File, 'utf8');

      const tenant1User = JSON.parse(tenant1Content);
      const tenant2User = JSON.parse(tenant2Content);

      expect(tenant1User.properties.email).toBe('user1@example.com');
      expect(tenant2User.properties.email).toBe('user2@example.com');
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      // Create test user
      const user: UserRecord = {
        userId: 'user-123',
        tenantId: 'tenant-1',
        properties: {
          email: 'user@example.com',
          name: 'John Doe',
        },
        firstSeen: new Date('2025-01-15T10:00:00Z'),
        lastSeen: new Date('2025-01-15T12:00:00Z'),
        sessionCount: 2,
        eventCount: 10,
      };

      await adapter.upsert(user);
    });

    it('should retrieve an existing user', async () => {
      const user = await adapter.get('tenant-1', 'user-123');

      expect(user).not.toBeNull();
      expect(user!.userId).toBe('user-123');
      expect(user!.tenantId).toBe('tenant-1');
      expect(user!.properties.email).toBe('user@example.com');
      expect(user!.properties.name).toBe('John Doe');
      expect(user!.sessionCount).toBe(2);
      expect(user!.eventCount).toBe(10);
    });

    it('should return null for non-existent user', async () => {
      const user = await adapter.get('tenant-1', 'non-existent-user');
      expect(user).toBeNull();
    });

    it('should return null for user in different tenant', async () => {
      const user = await adapter.get('tenant-2', 'user-123');
      expect(user).toBeNull();
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      // Create test user
      const user: UserRecord = {
        userId: 'user-123',
        tenantId: 'tenant-1',
        properties: { email: 'user@example.com' },
        firstSeen: new Date(),
        lastSeen: new Date(),
        sessionCount: 1,
        eventCount: 0,
      };

      await adapter.upsert(user);
    });

    it('should delete an existing user', async () => {
      const result = await adapter.delete('tenant-1', 'user-123');
      expect(result).toBe(true);

      // Verify user is deleted
      const user = await adapter.get('tenant-1', 'user-123');
      expect(user).toBeNull();

      // Verify file is deleted
      const expectedFile = join(testDir, 'tenant-1', 'users', 'user-123.json');
      const fileExists = await fs
        .access(expectedFile)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const result = await adapter.delete('tenant-1', 'non-existent-user');
      expect(result).toBe(false);
    });
  });

  describe('getBatch', () => {
    beforeEach(async () => {
      // Create test users
      const users: UserRecord[] = [
        {
          userId: 'user-1',
          tenantId: 'tenant-1',
          properties: { email: 'user1@example.com' },
          firstSeen: new Date(),
          lastSeen: new Date(),
          sessionCount: 1,
          eventCount: 5,
        },
        {
          userId: 'user-2',
          tenantId: 'tenant-1',
          properties: { email: 'user2@example.com' },
          firstSeen: new Date(),
          lastSeen: new Date(),
          sessionCount: 2,
          eventCount: 10,
        },
        {
          userId: 'user-3',
          tenantId: 'tenant-2', // Different tenant
          properties: { email: 'user3@example.com' },
          firstSeen: new Date(),
          lastSeen: new Date(),
          sessionCount: 1,
          eventCount: 3,
        },
      ];

      for (const user of users) {
        await adapter.upsert(user);
      }
    });

    it('should retrieve multiple users by IDs', async () => {
      const users = await adapter.getBatch('tenant-1', ['user-1', 'user-2']);

      expect(users).toHaveLength(2);

      const userIds = users.map(u => u.userId);
      expect(userIds).toContain('user-1');
      expect(userIds).toContain('user-2');

      users.forEach(user => {
        expect(user.tenantId).toBe('tenant-1');
      });
    });

    it('should handle mix of existing and non-existing users', async () => {
      const users = await adapter.getBatch('tenant-1', ['user-1', 'non-existent', 'user-2']);

      expect(users).toHaveLength(2);

      const userIds = users.map(u => u.userId);
      expect(userIds).toContain('user-1');
      expect(userIds).toContain('user-2');
      expect(userIds).not.toContain('non-existent');
    });

    it('should return empty array for non-existent tenant', async () => {
      const users = await adapter.getBatch('non-existent-tenant', ['user-1', 'user-2']);
      expect(users).toHaveLength(0);
    });
  });

  describe('healthCheck', () => {
    it('should return true when adapter is healthy', async () => {
      const isHealthy = await adapter.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should return false when directory is not writable', async () => {
      // Create adapter with invalid path
      const invalidAdapter = new FlatFileUserAdapter('/invalid/path/that/does/not/exist');

      const isHealthy = await invalidAdapter.healthCheck();
      expect(isHealthy).toBe(false);

      await invalidAdapter.close();
    });
  });
});
