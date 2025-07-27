import { DeduplicationAdapter } from '../interfaces/storage.js';

interface DeduplicationRecord {
  processedAt: Date;
  ttl?: number;
}

export class MemoryDeduplicationAdapter implements DeduplicationAdapter {
  private processed = new Map<string, DeduplicationRecord>();
  private maxRecords: number;

  constructor(maxRecords: number = 50000) {
    this.maxRecords = maxRecords;

    // Cleanup expired records every 5 minutes
    setInterval(() => {
      this.cleanup(3600); // Remove records older than 1 hour by default
    }, 300000);
  }

  async isDuplicate(tenantId: string, eventId: string): Promise<boolean> {
    const key = this.getKey(tenantId, eventId);
    const record = this.processed.get(key);

    if (!record) {
      return false;
    }

    // Check if record has expired
    if (record.ttl) {
      const age = (Date.now() - record.processedAt.getTime()) / 1000;
      if (age > record.ttl) {
        this.processed.delete(key);
        return false;
      }
    }

    return true;
  }

  async markProcessed(
    tenantId: string,
    eventId: string,
    ttlSeconds?: number
  ): Promise<void> {
    const key = this.getKey(tenantId, eventId);

    const record: DeduplicationRecord = {
      processedAt: new Date(),
    };

    if (ttlSeconds !== undefined) {
      record.ttl = ttlSeconds;
    }

    this.processed.set(key, record);

    // Implement LRU eviction if we have too many records
    if (this.processed.size > this.maxRecords) {
      this.evictOldestRecords();
    }
  }

  async cleanup(olderThanSeconds: number): Promise<number> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, record] of this.processed) {
      const age = (now - record.processedAt.getTime()) / 1000;

      // Remove if older than specified time or if TTL has expired
      if (
        age > olderThanSeconds ||
        (record.ttl !== undefined && age > record.ttl)
      ) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.processed.delete(key);
    }

    return expiredKeys.length;
  }

  async healthCheck(): Promise<boolean> {
    return true; // Memory-based implementation is always healthy
  }

  async close(): Promise<void> {
    this.processed.clear();
  }

  private getKey(tenantId: string, eventId: string): string {
    return `${tenantId}:${eventId}`;
  }

  private evictOldestRecords(): void {
    // Convert to array and sort by processed time
    const entries = Array.from(this.processed.entries());
    entries.sort(
      (a, b) => a[1].processedAt.getTime() - b[1].processedAt.getTime()
    );

    // Remove oldest 10% of records
    const toRemove = Math.floor(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      const entry = entries[i];
      if (entry) {
        this.processed.delete(entry[0]);
      }
    }
  }
}
