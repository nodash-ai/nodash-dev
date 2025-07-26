import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { UserAdapter } from '../interfaces/storage.js';
import { UserRecord, UpsertResult } from '../types/core.js';

export class FlatFileUserAdapter implements UserAdapter {
  private basePath: string;
  private tenantIsolation: boolean;

  constructor(basePath: string, tenantIsolation: boolean = true) {
    this.basePath = basePath;
    this.tenantIsolation = tenantIsolation;
  }

  async upsert(user: UserRecord): Promise<UpsertResult> {
    try {
      const filePath = this.getUserFilePath(user.tenantId, user.userId);
      await this.ensureDirectoryExists(dirname(filePath));

      let existingUser: UserRecord | null = null;
      let created = true;

      try {
        const existingContent = await fs.readFile(filePath, 'utf8');
        existingUser = JSON.parse(existingContent) as UserRecord;
        created = false;
      } catch {
        // File doesn't exist, this is a new user
      }

      const updatedUser: UserRecord = {
        userId: user.userId,
        tenantId: user.tenantId,
        properties: existingUser
          ? { ...existingUser.properties, ...user.properties }
          : user.properties,
        firstSeen: existingUser ? existingUser.firstSeen : user.firstSeen,
        lastSeen: user.lastSeen,
        sessionCount: existingUser ? existingUser.sessionCount : user.sessionCount,
        eventCount: existingUser ? existingUser.eventCount : user.eventCount,
      };

      await fs.writeFile(filePath, JSON.stringify(updatedUser, null, 2), 'utf8');

      return {
        success: true,
        userId: user.userId,
        created,
      };
    } catch (error) {
      return {
        success: false,
        created: false,
        error: `Failed to upsert user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async get(tenantId: string, userId: string): Promise<UserRecord | null> {
    try {
      const filePath = this.getUserFilePath(tenantId, userId);
      const content = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(content) as any;

      // Convert string dates back to Date objects
      return {
        ...parsed,
        firstSeen: new Date(parsed.firstSeen),
        lastSeen: new Date(parsed.lastSeen),
      } as UserRecord;
    } catch {
      return null;
    }
  }

  async delete(tenantId: string, userId: string): Promise<boolean> {
    try {
      const filePath = this.getUserFilePath(tenantId, userId);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getBatch(tenantId: string, userIds: string[]): Promise<UserRecord[]> {
    const users: UserRecord[] = [];

    for (const userId of userIds) {
      const user = await this.get(tenantId, userId);
      if (user) {
        users.push(user);
      }
    }

    return users;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureDirectoryExists(this.basePath);

      // Test write access
      const testFile = join(this.basePath, '.health-check');
      await fs.writeFile(testFile, 'test', 'utf8');
      await fs.unlink(testFile);

      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    // No persistent connections to close for file-based storage
  }

  private getUserFilePath(tenantId: string, userId: string): string {
    if (this.tenantIsolation) {
      return join(this.basePath, tenantId, 'users', `${userId}.json`);
    } else {
      return join(this.basePath, 'users', `${tenantId}-${userId}.json`);
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if ((error as any).code !== 'EEXIST') {
        throw error;
      }
    }
  }
}
