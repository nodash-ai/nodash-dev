#!/usr/bin/env node

import { mkdirSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Render.com startup script
 * Ensures data directories exist before starting the server
 */

console.log('🚀 Starting Nodash Backend on Render.com...');

// Ensure data directories exist
const dataDir = process.env.RENDER_DATA_DIR || './data';
const eventsDir = path.join(dataDir, 'events');
const usersDir = path.join(dataDir, 'users');

try {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    console.log('✅ Created data directory:', dataDir);
  }
  
  if (!existsSync(eventsDir)) {
    mkdirSync(eventsDir, { recursive: true });
    console.log('✅ Created events directory:', eventsDir);
  }
  
  if (!existsSync(usersDir)) {
    mkdirSync(usersDir, { recursive: true });
    console.log('✅ Created users directory:', usersDir);
  }
} catch (error) {
  console.error('❌ Failed to create data directories:', error.message);
  process.exit(1);
}

// Start the application
console.log('🎯 Starting Nodash Backend server...');
const server = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: process.env.PORT || '10000'
  }
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`🛑 Server process exited with code ${code}`);
  process.exit(code);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📡 Received SIGTERM, shutting down gracefully...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('📡 Received SIGINT, shutting down gracefully...');
  server.kill('SIGINT');
});