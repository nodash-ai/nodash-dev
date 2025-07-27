#!/usr/bin/env node

/**
 * Comprehensive test runner for nodash backend
 * Runs all test suites and provides detailed reporting
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: 'inherit',
            shell: true,
            ...options,
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve(code);
            } else {
                reject(new Error(`Command failed with exit code ${code}`));
            }
        });

        child.on('error', (error) => {
            reject(error);
        });
    });
}

async function cleanupTestData() {
    const testDirs = [
        './test-data',
        './integration-test-data',
        './e2e-test-data',
        './test-flatfile-events',
        './test-flatfile-users',
        './test-adapter-switching',
        './test-track-handler',
        './test-identify-handler',
    ];

    for (const dir of testDirs) {
        try {
            await fs.rm(dir, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    }
}

async function runTestSuite(name, command, args = []) {
    log(`\n${'='.repeat(60)}`, colors.cyan);
    log(`Running ${name}`, colors.bright + colors.cyan);
    log(`${'='.repeat(60)}`, colors.cyan);

    const startTime = Date.now();

    try {
        await runCommand(command, args);
        const duration = Date.now() - startTime;
        log(`✅ ${name} completed successfully in ${duration}ms`, colors.green);
        return { success: true, duration, name };
    } catch (error) {
        const duration = Date.now() - startTime;
        log(`❌ ${name} failed after ${duration}ms`, colors.red);
        log(`Error: ${error.message}`, colors.red);
        return { success: false, duration, name, error: error.message };
    }
}

async function main() {
    log('🚀 Starting Nodash Backend Test Suite', colors.bright + colors.blue);
    log(`Timestamp: ${new Date().toISOString()}`, colors.blue);

    // Clean up any existing test data
    log('\n🧹 Cleaning up test data...', colors.yellow);
    await cleanupTestData();

    const results = [];
    const startTime = Date.now();

    // Run type checking
    results.push(await runTestSuite(
        'TypeScript Type Checking',
        'npm',
        ['run', 'typecheck']
    ));

    // Run linting
    results.push(await runTestSuite(
        'ESLint Code Linting',
        'npm',
        ['run', 'lint']
    ));

    // Run unit tests
    results.push(await runTestSuite(
        'Unit Tests',
        'npm',
        ['run', 'test:unit']
    ));

    // Run integration tests
    results.push(await runTestSuite(
        'Integration Tests',
        'npm',
        ['run', 'test:integration']
    ));

    // Run end-to-end tests
    results.push(await runTestSuite(
        'End-to-End Tests',
        'npm',
        ['run', 'test:e2e']
    ));

    // Final cleanup
    log('\n🧹 Final cleanup...', colors.yellow);
    await cleanupTestData();

    // Generate summary report
    const totalDuration = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    log('\n' + '='.repeat(60), colors.magenta);
    log('TEST SUITE SUMMARY', colors.bright + colors.magenta);
    log('='.repeat(60), colors.magenta);

    results.forEach(result => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        const color = result.success ? colors.green : colors.red;
        log(`${status} ${result.name} (${result.duration}ms)`, color);
        if (!result.success && result.error) {
            log(`    Error: ${result.error}`, colors.red);
        }
    });

    log('\n' + '-'.repeat(60), colors.magenta);
    log(`Total Tests: ${results.length}`, colors.bright);
    log(`Successful: ${successful}`, colors.green);
    log(`Failed: ${failed}`, failed > 0 ? colors.red : colors.green);
    log(`Total Duration: ${totalDuration}ms`, colors.bright);
    log(`Average Duration: ${Math.round(totalDuration / results.length)}ms`, colors.bright);

    if (failed > 0) {
        log('\n❌ Some tests failed. Please check the output above.', colors.red);
        process.exit(1);
    } else {
        log('\n🎉 All tests passed successfully!', colors.green);
        process.exit(0);
    }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    log(`\n💥 Uncaught Exception: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`\n💥 Unhandled Rejection: ${reason}`, colors.red);
    console.error('Promise:', promise);
    process.exit(1);
});

// Run the test suite
main().catch((error) => {
    log(`\n💥 Test runner failed: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
});