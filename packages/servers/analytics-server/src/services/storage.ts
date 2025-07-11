import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

// Adapter for JSON file
export const db = new Low(new JSONFile('db.json'));

// Use db.data for storage operations 