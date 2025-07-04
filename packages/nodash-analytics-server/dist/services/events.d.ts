import { StorageService } from './storage.js';
import { EventSchema, EventData, SchemaDefinition } from '../types/index.js';
export declare class EventsService {
    private storage;
    constructor(storage: StorageService);
    getSchema(): Promise<Record<string, EventSchema>>;
    setEventDefinition(definition: SchemaDefinition): Promise<void>;
    queryEvents(eventName?: string, limit?: number): Promise<EventData[]>;
    trackEvent(eventName: string, data?: Record<string, any>): Promise<void>;
    batchEvents(events: EventData[]): Promise<number>;
}
//# sourceMappingURL=events.d.ts.map