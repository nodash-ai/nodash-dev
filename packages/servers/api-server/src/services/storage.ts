import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

// Data structure type
interface DatabaseData {
  events: any[];
}

// Default data structure
const defaultData: DatabaseData = { events: [] };

// Adapter for JSON file
export const db = new Low<DatabaseData>(new JSONFile<DatabaseData>('db.json'), defaultData);

// Storage service class
export class StorageService {
  static async init() {
    await db.read();
    if (!db.data) {
      db.data = defaultData;
      await db.write();
    }
  }

  static async ensureDataDir() {
    // Ensure .nodash directory exists
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const nodashDir = path.join(process.cwd(), '.nodash');
    try {
      await fs.access(nodashDir);
    } catch {
      await fs.mkdir(nodashDir, { recursive: true });
    }
  }

  static async saveEvent(event: any) {
    await db.read();
    if (!db.data) db.data = defaultData;
    db.data.events.push(event);
    await db.write();
  }

  static async getEvents() {
    await db.read();
    return db.data?.events || [];
  }

  static async loadEventsSchema() {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const schemaPath = path.join(process.cwd(), '.nodash', 'events_schema.json');
    try {
      const data = await fs.readFile(schemaPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  static async saveEventsSchema(schema: any) {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    await this.ensureDataDir();
    const schemaPath = path.join(process.cwd(), '.nodash', 'events_schema.json');
    await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));
  }

  static async loadEventsData(eventName?: string, limit?: number) {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const dataPath = path.join(process.cwd(), '.nodash', 'events_data.jsonl');
    try {
      const data = await fs.readFile(dataPath, 'utf-8');
      const lines = data.trim().split('\n').filter(line => line.trim());
      let events = lines.map(line => JSON.parse(line));
      
      if (eventName) {
        events = events.filter(event => event.event_name === eventName);
      }
      
      if (limit) {
        events = events.slice(-limit);
      }
      
      return events;
    } catch {
      return [];
    }
  }

  static async appendEventData(eventData: any) {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    await this.ensureDataDir();
    const dataPath = path.join(process.cwd(), '.nodash', 'events_data.jsonl');
    const eventLine = JSON.stringify(eventData) + '\n';
    await fs.appendFile(dataPath, eventLine);
  }
} 