import { StorageService } from './storage.js';
import { EventSchema, EventData, SchemaDefinition } from '../types/index.js';

export class EventsService {
  constructor() {}

  async getSchema(): Promise<Record<string, EventSchema>> {
    console.log('📋 EventsService: Loading events schema...');
    const schema = await StorageService.loadEventsSchema();
    console.log(`📋 EventsService: Loaded ${Object.keys(schema).length} event definitions`);
    return schema;
  }

  async setEventDefinition(definition: SchemaDefinition): Promise<void> {
    const { event_name, properties, description } = definition;
    console.log(`📝 EventsService: Setting definition for event "${event_name}"`);
    
    const schema = await StorageService.loadEventsSchema();
    const isNew = !schema[event_name];
    
    schema[event_name] = {
      properties,
      description: description || '',
      created_at: schema[event_name]?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await StorageService.saveEventsSchema(schema);
    console.log(`✅ EventsService: ${isNew ? 'Created' : 'Updated'} event definition "${event_name}"`);
  }

  async queryEvents(eventName?: string, limit = 100): Promise<EventData[]> {
    console.log(`🔍 EventsService: Querying events - filter: "${eventName || 'all'}", limit: ${limit}`);
    const events = await StorageService.loadEventsData(eventName, limit);
    console.log(`🔍 EventsService: Found ${events.length} events`);
    return events;
  }

  async trackEvent(eventName: string, data: Record<string, any> = {}): Promise<void> {
    console.log(`📊 EventsService: Tracking event "${eventName}" with data:`, data);
    
    const eventData: EventData = {
      event: eventName,
      properties: data,
      timestamp: new Date().toISOString(),
      source: 'test'
    };
    
    await StorageService.appendEventData(eventData);
    console.log(`✅ EventsService: Event "${eventName}" tracked successfully`);
  }

  async batchEvents(events: EventData[]): Promise<number> {
    console.log(`📦 EventsService: Processing batch of ${events.length} events`);
    let processed = 0;
    let skipped = 0;
    
    for (const event of events) {
      if (!event.event) {
        console.log(`⚠️ EventsService: Skipping invalid event (no event name)`);
        skipped++;
        continue;
      }
      
      const eventData: EventData = {
        event: event.event,
        properties: event.properties || {},
        timestamp: event.timestamp || new Date().toISOString(),
        userId: event.userId,
        sessionId: event.sessionId,
        source: 'sdk'
      };
      
      await StorageService.appendEventData(eventData);
      processed++;
    }
    
    console.log(`✅ EventsService: Batch complete - processed: ${processed}, skipped: ${skipped}`);
    return processed;
  }
} 