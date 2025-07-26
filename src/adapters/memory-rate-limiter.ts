import { RateLimitAdapter } from '../interfaces/storage.js';
import { RateLimitKey } from '../types/core.js';

interface RateLimitBucket {
  count: number;
  windowStart: Date;
}

export class MemoryRateLimitAdapter implements RateLimitAdapter {
  private buckets = new Map<string, RateLimitBucket>();
  private maxBuckets: number;

  constructor(maxBuckets: number = 10000) {
    this.maxBuckets = maxBuckets;

    // Cleanup expired buckets every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  async checkLimit(
    key: RateLimitKey,
    limit: number,
    windowSizeSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    const bucketKey = this.getBucketKey(key);
    const now = new Date();

    let bucket = this.buckets.get(bucketKey);

    if (!bucket) {
      bucket = {
        count: 0,
        windowStart: now,
      };
      this.buckets.set(bucketKey, bucket);
    }

    // Check if we need to reset the window
    const windowAge = (now.getTime() - bucket.windowStart.getTime()) / 1000;
    if (windowAge >= windowSizeSeconds) {
      bucket.count = 0;
      bucket.windowStart = now;
    }

    const allowed = bucket.count < limit;
    const remaining = Math.max(0, limit - bucket.count);
    const resetTime = new Date(bucket.windowStart.getTime() + windowSizeSeconds * 1000);

    return { allowed, remaining, resetTime };
  }

  async increment(key: RateLimitKey, windowSizeSeconds: number): Promise<void> {
    const bucketKey = this.getBucketKey(key);
    const now = new Date();

    let bucket = this.buckets.get(bucketKey);

    if (!bucket) {
      bucket = {
        count: 1,
        windowStart: now,
      };
      this.buckets.set(bucketKey, bucket);
    } else {
      // Check if we need to reset the window
      const windowAge = (now.getTime() - bucket.windowStart.getTime()) / 1000;
      if (windowAge >= windowSizeSeconds) {
        bucket.count = 1;
        bucket.windowStart = now;
      } else {
        bucket.count++;
      }
    }

    // Implement LRU eviction if we have too many buckets
    if (this.buckets.size > this.maxBuckets) {
      this.evictOldestBuckets();
    }
  }

  async reset(key: RateLimitKey): Promise<void> {
    const bucketKey = this.getBucketKey(key);
    this.buckets.delete(bucketKey);
  }

  async getCount(key: RateLimitKey, windowSizeSeconds: number): Promise<number> {
    const bucketKey = this.getBucketKey(key);
    const bucket = this.buckets.get(bucketKey);

    if (!bucket) {
      return 0;
    }

    const now = new Date();
    const windowAge = (now.getTime() - bucket.windowStart.getTime()) / 1000;

    if (windowAge >= windowSizeSeconds) {
      return 0;
    }

    return bucket.count;
  }

  async healthCheck(): Promise<boolean> {
    return true; // Memory-based implementation is always healthy
  }

  async close(): Promise<void> {
    this.buckets.clear();
  }

  private getBucketKey(key: RateLimitKey): string {
    return `${key.tenantId}:${key.sourceIp}:${key.userId || 'anonymous'}`;
  }

  private cleanup(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, bucket] of this.buckets) {
      const age = (now.getTime() - bucket.windowStart.getTime()) / 1000;
      // Remove buckets older than 1 hour
      if (age > 3600) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.buckets.delete(key);
    }
  }

  private evictOldestBuckets(): void {
    // Convert to array and sort by window start time
    const entries = Array.from(this.buckets.entries());
    entries.sort((a, b) => a[1].windowStart.getTime() - b[1].windowStart.getTime());

    // Remove oldest 10% of buckets
    const toRemove = Math.floor(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      const entry = entries[i];
      if (entry) {
        this.buckets.delete(entry[0]);
      }
    }
  }
}
