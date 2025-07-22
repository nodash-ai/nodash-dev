import { 
  StoreSelector, 
  EventAdapter, 
  UserAdapter, 
  RateLimitAdapter, 
  DeduplicationAdapter 
} from '../interfaces/storage.js';
import { Config } from '../types/core.js';
import { FlatFileEventAdapter } from './flatfile-event-adapter.js';
import { FlatFileUserAdapter } from './flatfile-user-adapter.js';
import { MemoryRateLimitAdapter } from './memory-rate-limiter.js';
import { MemoryDeduplicationAdapter } from './memory-deduplication.js';

export class AdapterStoreSelector implements StoreSelector {
  private config: Config;
  private eventAdapter?: EventAdapter;
  private userAdapter?: UserAdapter;
  private rateLimitAdapter?: RateLimitAdapter;
  private deduplicationAdapter?: DeduplicationAdapter;
  private initialized = false;

  constructor(config: Config) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log('🔧 Initializing storage adapters...');
    
    // Initialize event adapter
    console.log(`📊 Events storage: ${this.config.stores.events}`);
    this.eventAdapter = await this.createEventAdapter();
    
    // Initialize user adapter
    console.log(`👥 Users storage: ${this.config.stores.users}`);
    this.userAdapter = await this.createUserAdapter();
    
    // Initialize rate limit adapter
    console.log(`🚦 Rate limiting storage: ${this.config.stores.rateLimits}`);
    this.rateLimitAdapter = await this.createRateLimitAdapter();
    
    // Initialize deduplication adapter (always memory for Phase 0)
    console.log(`🔄 Deduplication storage: memory`);
    this.deduplicationAdapter = await this.createDeduplicationAdapter();
    
    this.initialized = true;
    console.log('✅ All storage adapters initialized successfully');
  }

  getEventAdapter(): EventAdapter {
    this.ensureInitialized();
    return this.eventAdapter!;
  }

  getUserAdapter(): UserAdapter {
    this.ensureInitialized();
    return this.userAdapter!;
  }

  getRateLimitAdapter(): RateLimitAdapter {
    this.ensureInitialized();
    return this.rateLimitAdapter!;
  }

  getDeduplicationAdapter(): DeduplicationAdapter {
    this.ensureInitialized();
    return this.deduplicationAdapter!;
  }

  async healthCheck(): Promise<{
    eventStore: boolean;
    userStore: boolean;
    rateLimiter: boolean;
    deduplication: boolean;
  }> {
    this.ensureInitialized();
    
    const [eventStore, userStore, rateLimiter, deduplication] = await Promise.all([
      this.eventAdapter!.healthCheck(),
      this.userAdapter!.healthCheck(),
      this.rateLimitAdapter!.healthCheck(),
      this.deduplicationAdapter!.healthCheck(),
    ]);
    
    return {
      eventStore,
      userStore,
      rateLimiter,
      deduplication,
    };
  }

  async close(): Promise<void> {
    if (!this.initialized) return;
    
    console.log('🔚 Closing storage adapters...');
    
    const closePromises = [];
    
    if (this.eventAdapter) {
      closePromises.push(this.eventAdapter.close());
    }
    
    if (this.userAdapter) {
      closePromises.push(this.userAdapter.close());
    }
    
    if (this.rateLimitAdapter) {
      closePromises.push(this.rateLimitAdapter.close());
    }
    
    if (this.deduplicationAdapter) {
      closePromises.push(this.deduplicationAdapter.close());
    }
    
    await Promise.all(closePromises);
    
    this.initialized = false;
    console.log('✅ All storage adapters closed');
  }

  private async createEventAdapter(): Promise<EventAdapter> {
    switch (this.config.stores.events) {
      case 'flatfile':
        return new FlatFileEventAdapter(this.config.paths.events, 'daily');
      
      case 'clickhouse':
        // TODO: Implement ClickHouse adapter in Phase 1
        throw new Error('ClickHouse event adapter not yet implemented. Use STORE_EVENTS=flatfile for Phase 0');
      
      case 'bigquery':
        // TODO: Implement BigQuery adapter in Phase 1
        throw new Error('BigQuery event adapter not yet implemented. Use STORE_EVENTS=flatfile for Phase 0');
      
      default:
        throw new Error(`Unsupported event storage type: ${this.config.stores.events}`);
    }
  }

  private async createUserAdapter(): Promise<UserAdapter> {
    switch (this.config.stores.users) {
      case 'flatfile':
        return new FlatFileUserAdapter(this.config.paths.users, true);
      
      case 'postgres':
        // TODO: Implement PostgreSQL adapter in Phase 1
        throw new Error('PostgreSQL user adapter not yet implemented. Use STORE_USERS=flatfile for Phase 0');
      
      case 'dynamodb':
        // TODO: Implement DynamoDB adapter in Phase 1
        throw new Error('DynamoDB user adapter not yet implemented. Use STORE_USERS=flatfile for Phase 0');
      
      default:
        throw new Error(`Unsupported user storage type: ${this.config.stores.users}`);
    }
  }

  private async createRateLimitAdapter(): Promise<RateLimitAdapter> {
    switch (this.config.stores.rateLimits) {
      case 'memory':
        return new MemoryRateLimitAdapter();
      
      case 'redis':
        // TODO: Implement Redis adapter in Phase 1
        throw new Error('Redis rate limit adapter not yet implemented. Use STORE_RATELIMIT=memory for Phase 0');
      
      default:
        throw new Error(`Unsupported rate limit storage type: ${this.config.stores.rateLimits}`);
    }
  }

  private async createDeduplicationAdapter(): Promise<DeduplicationAdapter> {
    // For Phase 0, always use memory-based deduplication
    return new MemoryDeduplicationAdapter();
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('StoreSelector not initialized. Call initialize() first.');
    }
  }
}