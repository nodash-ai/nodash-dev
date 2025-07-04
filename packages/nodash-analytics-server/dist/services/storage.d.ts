import { EventSchema, EventData } from '../types/index.js';
export declare class StorageService {
    ensureDataDir(): Promise<void>;
    loadEventsSchema(): Promise<Record<string, EventSchema>>;
    saveEventsSchema(schema: Record<string, EventSchema>): Promise<void>;
    appendEventData(event: EventData): Promise<void>;
    loadEventsData(eventName?: string, limit?: number): Promise<EventData[]>;
}
//# sourceMappingURL=storage.d.ts.map