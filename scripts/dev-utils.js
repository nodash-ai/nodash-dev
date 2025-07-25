#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

class DevUtils {
  constructor() {
    this.startTime = Date.now();
  }

  async runCommand(command, args, description) {
    console.log(`\n🔧 ${description}...`);
    
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        cwd: process.cwd()
      });

      const startTime = Date.now();
      
      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        const success = code === 0;
        
        if (success) {
          console.log(`✅ ${description} completed in ${duration}ms`);
        } else {
          console.log(`❌ ${description} failed with code ${code} after ${duration}ms`);
        }
        
        resolve(success);
      });

      child.on('error', (error) => {
        console.error(`❌ Failed to start ${description}:`, error.message);
        resolve(false);
      });
    });
  }

  async setupDev() {
    console.log('🚀 Setting up development environment...\n');

    // Install dependencies
    const installSuccess = await this.runCommand('npm', ['install'], 'Installing dependencies');
    if (!installSuccess) return false;

    // Run type checking
    const typecheckSuccess = await this.runCommand('npm', ['run', 'typecheck'], 'Type checking');
    if (!typecheckSuccess) return false;

    // Build the project
    const buildSuccess = await this.runCommand('npm', ['run', 'build'], 'Building project');
    if (!buildSuccess) return false;

    // Run tests
    const testSuccess = await this.runCommand('npm', ['run', 'test:fast'], 'Running fast tests');
    if (!testSuccess) return false;

    console.log('\n🎉 Development environment setup complete!');
    console.log('\nNext steps:');
    console.log('  npm run dev        - Start development server');
    console.log('  npm run dev:debug  - Start with debugger');
    console.log('  npm run test:all   - Run comprehensive tests');
    
    return true;
  }

  async cleanAll() {
    console.log('🧹 Cleaning all build artifacts and caches...\n');

    const tasks = [
      { command: 'npm', args: ['run', 'clean'], description: 'Clean dist directory' },
      { command: 'rm', args: ['-rf', 'node_modules/.vitest'], description: 'Clean test cache' },
      { command: 'rm', args: ['-rf', 'coverage'], description: 'Clean coverage reports' },
      { command: 'rm', args: ['-rf', 'test-data'], description: 'Clean test data' },
      { command: 'rm', args: ['-rf', 'integration-test-data'], description: 'Clean integration test data' },
      { command: 'rm', args: ['-rf', 'e2e-test-data'], description: 'Clean E2E test data' }
    ];

    let allSuccess = true;
    for (const task of tasks) {
      const success = await this.runCommand(task.command, task.args, task.description);
      if (!success) allSuccess = false;
    }

    if (allSuccess) {
      console.log('\n🎉 All cleanup tasks completed successfully!');
    } else {
      console.log('\n⚠️  Some cleanup tasks failed, but this is usually not critical.');
    }

    return allSuccess;
  }

  async checkHealth() {
    console.log('🏥 Checking project health...\n');

    const checks = [];

    // Check if package.json exists and is valid
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      checks.push({ name: 'package.json', status: 'pass', details: `Version: ${packageJson.version}` });
    } catch (error) {
      checks.push({ name: 'package.json', status: 'fail', details: error.message });
    }

    // Check if TypeScript config exists
    if (fs.existsSync('tsconfig.json')) {
      checks.push({ name: 'tsconfig.json', status: 'pass' });
    } else {
      checks.push({ name: 'tsconfig.json', status: 'fail', details: 'Missing TypeScript config' });
    }

    // Check if source directory exists
    if (fs.existsSync('src')) {
      const srcFiles = fs.readdirSync('src').length;
      checks.push({ name: 'src directory', status: 'pass', details: `${srcFiles} files` });
    } else {
      checks.push({ name: 'src directory', status: 'fail', details: 'Missing source directory' });
    }

    // Check if test directory exists
    if (fs.existsSync('test')) {
      const testFiles = fs.readdirSync('test', { recursive: true }).length;
      checks.push({ name: 'test directory', status: 'pass', details: `${testFiles} files` });
    } else {
      checks.push({ name: 'test directory', status: 'fail', details: 'Missing test directory' });
    }

    // Check if build artifacts exist
    if (fs.existsSync('dist')) {
      const distFiles = fs.readdirSync('dist').length;
      checks.push({ name: 'build artifacts', status: 'pass', details: `${distFiles} files` });
    } else {
      checks.push({ name: 'build artifacts', status: 'warn', details: 'No build artifacts (run npm run build)' });
    }

    // Print results
    console.log('Health Check Results:');
    console.log('='.repeat(50));
    
    checks.forEach(check => {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
      const details = check.details ? ` (${check.details})` : '';
      console.log(`${icon} ${check.name}${details}`);
    });

    const passed = checks.filter(c => c.status === 'pass').length;
    const warned = checks.filter(c => c.status === 'warn').length;
    const failed = checks.filter(c => c.status === 'fail').length;

    console.log('='.repeat(50));
    console.log(`📊 Results: ${passed} passed, ${warned} warnings, ${failed} failed`);

    return failed === 0;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const utils = new DevUtils();
  const command = process.argv[2] || 'help';
  
  switch (command) {
    case 'setup':
      utils.setupDev().catch(error => {
        console.error('❌ Setup failed:', error);
        process.exit(1);
      });
      break;
    case 'clean':
      utils.cleanAll().catch(error => {
        console.error('❌ Clean failed:', error);
        process.exit(1);
      });
      break;
    case 'health':
      utils.checkHealth().then(success => {
        process.exit(success ? 0 : 1);
      }).catch(error => {
        console.error('❌ Health check failed:', error);
        process.exit(1);
      });
      break;
    case 'help':
    default:
      console.log('🛠️  Development Utilities');
      console.log('');
      console.log('Usage: node scripts/dev-utils.js <command>');
      console.log('');
      console.log('Commands:');
      console.log('  setup   - Set up development environment');
      console.log('  clean   - Clean all build artifacts and caches');
      console.log('  health  - Check project health');
      console.log('  help    - Show this help message');
      break;
  }
}

export default DevUtils;