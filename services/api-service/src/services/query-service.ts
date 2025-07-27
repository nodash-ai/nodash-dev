import { StoreSelector } from '../interfaces/storage.js';
import {
  QueryOptions,
  UserQueryOptions,
  QueryResult,
  UserQueryResult,
  QueryFilter,
  UserQueryFilter,
  AnalyticsEvent,
  UserRecord,
  PaginationInfo,
} from '../types/core.js';

export class QueryService {
  private storeSelector: StoreSelector;

  constructor(storeSelector: StoreSelector) {
    this.storeSelector = storeSelector;
  }

  async queryEvents(
    tenantId: string,
    options: QueryOptions
  ): Promise<QueryResult> {
    const startTime = Date.now();

    // Build filter from options
    const filter = this.buildEventFilter(tenantId, options);

    // Get events from storage
    const eventAdapter = this.storeSelector.getEventAdapter();
    const result = await eventAdapter.query(filter);

    // Apply client-side sorting and pagination if needed
    let events = result.events;

    // Apply sorting if specified
    if (options.sortBy) {
      events = this.sortEvents(
        events,
        options.sortBy,
        options.sortOrder || 'asc'
      );
    }

    // Apply pagination
    const paginatedResult = this.paginateResults(
      events,
      options.limit,
      options.offset
    );

    const executionTime = Date.now() - startTime;

    return {
      events: paginatedResult.data,
      totalCount: events.length,
      hasMore: paginatedResult.hasMore,
      pagination: paginatedResult.pagination,
      executionTime,
    };
  }

  async queryUsers(
    tenantId: string,
    options: UserQueryOptions
  ): Promise<UserQueryResult> {
    const startTime = Date.now();

    // Build filter from options
    const filter = this.buildUserFilter(tenantId, options);

    // Get users from storage
    const userAdapter = this.storeSelector.getUserAdapter();
    const result = await userAdapter.query(filter);

    // Apply client-side sorting and pagination if needed
    let users = result.users;

    // Apply sorting if specified
    if (options.sortBy) {
      users = this.sortUsers(users, options.sortBy, options.sortOrder || 'asc');
    }

    // Apply pagination
    const paginatedResult = this.paginateResults(
      users,
      options.limit,
      options.offset
    );

    const executionTime = Date.now() - startTime;

    return {
      users: paginatedResult.data,
      totalCount: users.length,
      hasMore: paginatedResult.hasMore,
      pagination: paginatedResult.pagination,
      executionTime,
    };
  }

  private buildEventFilter(
    tenantId: string,
    options: QueryOptions
  ): QueryFilter {
    const filter: QueryFilter = {
      tenantId,
    };

    if (options.eventTypes && options.eventTypes.length > 0) {
      filter.eventTypes = options.eventTypes;
    }

    if (options.userId) {
      filter.userId = options.userId;
    }

    if (options.startDate) {
      filter.startTime = options.startDate;
    }

    if (options.endDate) {
      filter.endTime = options.endDate;
    }

    if (options.properties) {
      filter.properties = options.properties;
    }

    // Set default limit if not specified
    filter.limit = options.limit || 100;
    filter.offset = options.offset || 0;

    if (options.sortBy) {
      filter.sortBy = options.sortBy;
      filter.sortOrder = options.sortOrder || 'asc';
    }

    return filter;
  }

  private buildUserFilter(
    tenantId: string,
    options: UserQueryOptions
  ): UserQueryFilter {
    const filter: UserQueryFilter = {
      tenantId,
    };

    if (options.userId) {
      filter.userId = options.userId;
    }

    if (options.activeSince) {
      filter.activeSince = options.activeSince;
    }

    if (options.activeUntil) {
      filter.activeUntil = options.activeUntil;
    }

    if (options.properties) {
      filter.properties = options.properties;
    }

    // Set default limit if not specified
    filter.limit = options.limit || 100;
    filter.offset = options.offset || 0;

    if (options.sortBy) {
      filter.sortBy = options.sortBy;
      filter.sortOrder = options.sortOrder || 'asc';
    }

    return filter;
  }

  private sortEvents(
    events: AnalyticsEvent[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): AnalyticsEvent[] {
    return events.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'timestamp':
          aValue = a.timestamp;
          bValue = b.timestamp;
          break;
        case 'eventName':
          aValue = a.eventName;
          bValue = b.eventName;
          break;
        case 'userId':
          aValue = a.userId || '';
          bValue = b.userId || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  private sortUsers(
    users: UserRecord[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): UserRecord[] {
    return users.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'firstSeen':
          aValue = a.firstSeen;
          bValue = b.firstSeen;
          break;
        case 'lastSeen':
          aValue = a.lastSeen;
          bValue = b.lastSeen;
          break;
        case 'eventCount':
          aValue = a.eventCount;
          bValue = b.eventCount;
          break;
        case 'sessionCount':
          aValue = a.sessionCount;
          bValue = b.sessionCount;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  private paginateResults<T>(
    data: T[],
    limit?: number,
    offset?: number
  ): {
    data: T[];
    hasMore: boolean;
    pagination: PaginationInfo;
  } {
    const actualLimit = limit || 100;
    const actualOffset = offset || 0;

    const startIndex = actualOffset;
    const endIndex = startIndex + actualLimit;

    const paginatedData = data.slice(startIndex, endIndex);
    const hasMore = endIndex < data.length;

    const pagination: PaginationInfo = {
      limit: actualLimit,
      offset: actualOffset,
    };

    if (hasMore) {
      pagination.nextOffset = endIndex;
    }

    return {
      data: paginatedData,
      hasMore,
      pagination,
    };
  }
}
