import { beforeEach, afterEach, expect } from 'vitest';
import { testMetrics, TestMetricsCollector } from './test-metrics';

/**
 * Test quality monitoring utilities that integrate with Vitest
 */
export class TestQualityMonitor {
  private static instance: TestQualityMonitor;
  private metricsCollector: TestMetricsCollector;
  private currentTestContext: any = null;

  private constructor() {
    this.metricsCollector = testMetrics;
  }

  static getInstance(): TestQualityMonitor {
    if (!TestQualityMonitor.instance) {
      TestQualityMonitor.instance = new TestQualityMonitor();
    }
    return TestQualityMonitor.instance;
  }

  /**
   * Set up test monitoring for a test suite
   */
  setupSuiteMonitoring(suiteName: string): void {
    beforeEach((context) => {
      if (context?.task?.name && context?.task?.file?.name) {
        this.currentTestContext = context;
        this.metricsCollector.startTest(
          context.task.name,
          context.task.file.name,
          suiteName
        );
      }
    });

    afterEach((context) => {
      if (this.currentTestContext && context?.task) {
        let status: 'passed' | 'failed' | 'skipped' = 'skipped';
        
        if (context.task.result) {
          if (context.task.result.state === 'pass') {
            status = 'passed';
          } else if (context.task.result.state === 'fail') {
            status = 'failed';
          }
        }
        
        const errorMessage = context.task.result?.errors?.[0]?.message;
        
        this.metricsCollector.endTest(status, errorMessage);
      }
      this.currentTestContext = null;
    });
  }

  /**
   * Track API calls in tests
   */
  trackApiCall(): void {
    this.metricsCollector.trackApiCall();
  }

  /**
   * Add custom performance assertion
   */
  expectPerformance(testName: string, maxDurationMs: number): void {
    const currentMetrics = this.metricsCollector.getMetrics();
    const testMetric = currentMetrics.find(m => m.testName === testName);
    
    if (testMetric) {
      expect(testMetric.duration).toBeLessThan(maxDurationMs);
    }
  }

  /**
   * Generate and save test quality report
   */
  async generateReport(): Promise<string> {
    return await this.metricsCollector.saveMetrics();
  }

  /**
   * Get current test metrics
   */
  getMetrics() {
    return this.metricsCollector.getMetrics();
  }

  /**
   * Clear metrics (useful for test isolation)
   */
  clearMetrics(): void {
    this.metricsCollector.clearMetrics();
  }
}

/**
 * Vitest custom matchers for test quality
 */
expect.extend({
  toCompleteWithinTime(testFunction: () => Promise<any>, maxMs: number) {
    const startTime = performance.now();
    
    return testFunction().then(() => {
      const duration = performance.now() - startTime;
      const pass = duration <= maxMs;
      
      return {
        pass,
        message: () => 
          pass 
            ? `Test completed in ${duration.toFixed(2)}ms (within ${maxMs}ms limit)`
            : `Test took ${duration.toFixed(2)}ms, exceeding ${maxMs}ms limit`
      };
    });
  },

  toHaveApiCallCount(received: any, expectedCount: number) {
    const monitor = TestQualityMonitor.getInstance();
    const metrics = monitor.getMetrics();
    const currentTest = metrics[metrics.length - 1]; // Most recent test
    
    const actualCount = currentTest?.apiCalls || 0;
    const pass = actualCount === expectedCount;
    
    return {
      pass,
      message: () =>
        pass
          ? `Test made ${actualCount} API calls (expected ${expectedCount})`
          : `Test made ${actualCount} API calls, expected ${expectedCount}`
    };
  },

  toHaveMemoryUsageBelow(received: any, maxMemoryMB: number) {
    const monitor = TestQualityMonitor.getInstance();
    const metrics = monitor.getMetrics();
    const currentTest = metrics[metrics.length - 1];
    
    const memoryUsageMB = currentTest?.memoryUsage 
      ? currentTest.memoryUsage.heapUsed / (1024 * 1024)
      : 0;
    
    const pass = memoryUsageMB <= maxMemoryMB;
    
    return {
      pass,
      message: () =>
        pass
          ? `Test used ${memoryUsageMB.toFixed(2)}MB memory (within ${maxMemoryMB}MB limit)`
          : `Test used ${memoryUsageMB.toFixed(2)}MB memory, exceeding ${maxMemoryMB}MB limit`
    };
  }
});

// Global monitor instance
export const testMonitor = TestQualityMonitor.getInstance();