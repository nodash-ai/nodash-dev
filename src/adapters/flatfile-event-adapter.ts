import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { EventAdapter } from '../interfaces/storage.js';
import { 
  AnalyticsEvent, 
  InsertResult, 
  QueryFilter, 
  QueryResult, 
  ExportResult 
} from '../types/core.js';

export class FlatFileEventAdapter implements EventAdapter {
  private basePath: string;
  private partitionStrategy: 'daily' | 'hourly';

  constructor(basePath: string, partitionStrategy: 'daily' | 'hourly' = 'daily') {
    this.basePath = basePath;
    this.partitionStrategy = partitionStrategy;
  }

  async insert(event: AnalyticsEvent): Promise<InsertResult> {
    try {
      const filePath = this.getFilePath(event.tenantId, event.timestamp);
      await this.ensureDirectoryExists(dirname(filePath));
      
      const eventLine = JSON.stringify(event) + '\n';
      await fs.appendFile(filePath, eventLine, 'utf8');
      
      return {
        success: true,
        eventId: event.eventId
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to insert event: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async insertBatch(events: AnalyticsEvent[]): Promise<InsertResult[]> {
    const results: InsertResult[] = [];
    
    // Group events by file path for efficient writing
    const eventsByFile = new Map<string, AnalyticsEvent[]>();
    
    for (const event of events) {
      const filePath = this.getFilePath(event.tenantId, event.timestamp);
      if (!eventsByFile.has(filePath)) {
        eventsByFile.set(filePath, []);
      }
      eventsByFile.get(filePath)!.push(event);
    }
    
    // Write events to their respective files
    for (const [filePath, fileEvents] of eventsByFile) {
      try {
        await this.ensureDirectoryExists(dirname(filePath));
        
        const lines = fileEvents.map(event => JSON.stringify(event) + '\n').join('');
        await fs.appendFile(filePath, lines, 'utf8');
        
        // Add success results for all events in this file
        for (const event of fileEvents) {
          results.push({
            success: true,
            eventId: event.eventId
          });
        }
      } catch (error) {
        // Add error results for all events in this file
        for (const event of fileEvents) {
          results.push({
            success: false,
            error: `Failed to insert event: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    }
    
    return results;
  }

  async query(filter: QueryFilter): Promise<QueryResult> {
    try {
      const events: AnalyticsEvent[] = [];
      const filePaths = await this.getFilePathsForDateRange(filter.tenantId, filter.startTime, filter.endTime);
      
      for (const filePath of filePaths) {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const eventData = JSON.parse(line);
              const event: AnalyticsEvent = {
                ...eventData,
                timestamp: new Date(eventData.timestamp),
                receivedAt: new Date(eventData.receivedAt),
              };
              
              // Apply filters
              if (filter.eventName && event.eventName !== filter.eventName) continue;
              if (filter.userId && event.userId !== filter.userId) continue;
              if (filter.startTime && event.timestamp < filter.startTime) continue;
              if (filter.endTime && event.timestamp > filter.endTime) continue;
              
              events.push(event);
            } catch (parseError) {
              console.warn(`Failed to parse event line: ${line}`, parseError);
            }
          }
        } catch (fileError) {
          console.warn(`Failed to read file: ${filePath}`, fileError);
        }
      }
      
      // Sort by timestamp descending
      events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      // Apply pagination
      const offset = filter.offset || 0;
      const limit = filter.limit || 100;
      const paginatedEvents = events.slice(offset, offset + limit);
      
      return {
        events: paginatedEvents,
        totalCount: events.length,
        hasMore: offset + limit < events.length
      };
    } catch (error) {
      throw new Error(`Failed to query events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async export(startTime: Date, endTime: Date, format: 'json' | 'csv'): Promise<ExportResult> {
    try {
      const allEvents: AnalyticsEvent[] = [];
      const tenantDirs = await this.getAllTenantDirectories();
      
      for (const tenantId of tenantDirs) {
        const filePaths = await this.getFilePathsForDateRange(tenantId, startTime, endTime);
        
        for (const filePath of filePaths) {
          try {
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              try {
                const eventData = JSON.parse(line);
                const event: AnalyticsEvent = {
                  ...eventData,
                  timestamp: new Date(eventData.timestamp),
                  receivedAt: new Date(eventData.receivedAt),
                };
                if (event.timestamp >= startTime && event.timestamp <= endTime) {
                  allEvents.push(event);
                }
              } catch (parseError) {
                console.warn(`Failed to parse event line: ${line}`, parseError);
              }
            }
          } catch (fileError) {
            console.warn(`Failed to read file: ${filePath}`, fileError);
          }
        }
      }
      
      let data: string;
      if (format === 'json') {
        data = JSON.stringify(allEvents, null, 2);
      } else {
        // CSV format
        if (allEvents.length === 0) {
          data = 'eventId,tenantId,userId,eventName,timestamp,receivedAt,properties\n';
        } else {
          const headers = 'eventId,tenantId,userId,eventName,timestamp,receivedAt,properties\n';
          const rows = allEvents.map(event => [
            event.eventId,
            event.tenantId,
            event.userId || '',
            event.eventName,
            event.timestamp.toISOString(),
            event.receivedAt.toISOString(),
            JSON.stringify(event.properties).replace(/"/g, '""')
          ].join(',')).join('\n');
          data = headers + rows;
        }
      }
      
      return {
        format,
        data,
        recordCount: allEvents.length
      };
    } catch (error) {
      throw new Error(`Failed to export events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

  private getFilePath(tenantId: string, timestamp: Date): string {
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getDate()).padStart(2, '0');
    
    let filename: string;
    if (this.partitionStrategy === 'hourly') {
      const hour = String(timestamp.getHours()).padStart(2, '0');
      filename = `events-${year}-${month}-${day}-${hour}.jsonl`;
    } else {
      filename = `events-${year}-${month}-${day}.jsonl`;
    }
    
    return join(this.basePath, tenantId, year.toString(), month, filename);
  }

  private async getFilePathsForDateRange(tenantId: string, startTime?: Date, endTime?: Date): Promise<string[]> {
    const tenantPath = join(this.basePath, tenantId);
    const filePaths: string[] = [];
    
    try {
      const yearDirs = await fs.readdir(tenantPath);
      
      for (const year of yearDirs) {
        const yearPath = join(tenantPath, year);
        try {
          const monthDirs = await fs.readdir(yearPath);
          
          for (const month of monthDirs) {
            const monthPath = join(yearPath, month);
            try {
              const files = await fs.readdir(monthPath);
              
              for (const file of files) {
                if (file.endsWith('.jsonl')) {
                  filePaths.push(join(monthPath, file));
                }
              }
            } catch {
              // Skip inaccessible month directory
            }
          }
        } catch {
          // Skip inaccessible year directory
        }
      }
    } catch {
      // Tenant directory doesn't exist
      return [];
    }
    
    return filePaths;
  }

  private async getAllTenantDirectories(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.basePath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch {
      return [];
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