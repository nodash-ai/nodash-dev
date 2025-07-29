import { performance } from 'perf_hooks';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface TestMetric {
  testName: string;
  testFile: string;
  suite: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'passed' | 'failed' | 'skipped';
  errorMessage?: string;
  memoryUsage?: NodeJS.MemoryUsage;
  apiCalls?: number;
  timestamp: string;
}

export interface TestSuiteMetrics {
  suiteId: string;
  suiteName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalDuration: number;
  avgTestDuration: number;
  maxTestDuration: number;
  minTestDuration: number;
  timestamp: string;
  testMetrics: TestMetric[];
}

export interface TestQualityReport {
  reportId: string;
  timestamp: string;
  totalSuites: number;
  totalTests: number;
  overallPassRate: number;
  avgSuiteDuration: number;
  slowestTests: TestMetric[];
  mostFailingTests: TestMetric[];
  memoryTrends: Array<{ test: string; memory: number }>;
  recommendations: string[];
  suiteMetrics: TestSuiteMetrics[];
}

export class TestMetricsCollector {
  private metrics: TestMetric[] = [];
  private currentTest: Partial<TestMetric> | null = null;
  private apiCallCount = 0;
  private metricsDir = './test-metrics';

  constructor() {
    this.ensureMetricsDirectory();
  }

  private async ensureMetricsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.metricsDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to create metrics directory:', error);
    }
  }

  /**
   * Start tracking a test
   */
  startTest(testName: string, testFile: string, suite: string): void {
    this.currentTest = {
      testName,
      testFile,
      suite,
      startTime: performance.now(),
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage()
    };
    this.apiCallCount = 0;
  }

  /**
   * Track an API call within a test
   */
  trackApiCall(): void {
    this.apiCallCount++;
  }

  /**
   * End tracking a test
   */
  endTest(status: 'passed' | 'failed' | 'skipped', errorMessage?: string): void {
    if (!this.currentTest) return;

    const endTime = performance.now();
    const testMetric: TestMetric = {
      testName: this.currentTest.testName!,
      testFile: this.currentTest.testFile!,
      suite: this.currentTest.suite!,
      startTime: this.currentTest.startTime!,
      endTime,
      duration: endTime - this.currentTest.startTime!,
      status,
      errorMessage,
      memoryUsage: this.currentTest.memoryUsage,
      apiCalls: this.apiCallCount,
      timestamp: this.currentTest.timestamp!
    };

    this.metrics.push(testMetric);
    this.currentTest = null;
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): TestMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear collected metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Generate test suite metrics
   */
  generateSuiteMetrics(suiteName: string): TestSuiteMetrics {
    const suiteTests = this.metrics.filter(m => m.suite === suiteName);
    
    if (suiteTests.length === 0) {
      return {
        suiteId: `suite-${Date.now()}`,
        suiteName,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        totalDuration: 0,
        avgTestDuration: 0,
        maxTestDuration: 0,
        minTestDuration: 0,
        timestamp: new Date().toISOString(),
        testMetrics: []
      };
    }

    const passedTests = suiteTests.filter(t => t.status === 'passed').length;
    const failedTests = suiteTests.filter(t => t.status === 'failed').length;
    const skippedTests = suiteTests.filter(t => t.status === 'skipped').length;
    
    const durations = suiteTests.map(t => t.duration);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    
    return {
      suiteId: `suite-${suiteName}-${Date.now()}`,
      suiteName,
      totalTests: suiteTests.length,
      passedTests,
      failedTests,
      skippedTests,
      totalDuration,
      avgTestDuration: totalDuration / suiteTests.length,
      maxTestDuration: Math.max(...durations),
      minTestDuration: Math.min(...durations),
      timestamp: new Date().toISOString(),
      testMetrics: suiteTests
    };
  }

  /**
   * Generate comprehensive quality report
   */
  generateQualityReport(): TestQualityReport {
    const suiteNames = [...new Set(this.metrics.map(m => m.suite))];
    const suiteMetrics = suiteNames.map(name => this.generateSuiteMetrics(name));
    
    const totalTests = this.metrics.length;
    const passedTests = this.metrics.filter(t => t.status === 'passed').length;
    
    // Find slowest tests
    const slowestTests = [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
    
    // Find most failing tests (based on names that appear in failed tests)
    const failedTestNames = this.metrics
      .filter(t => t.status === 'failed')
      .reduce((acc, test) => {
        acc[test.testName] = (acc[test.testName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    const mostFailingTests = Object.entries(failedTestNames)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([testName, count]) => 
        this.metrics.find(m => m.testName === testName && m.status === 'failed')!
      )
      .filter(Boolean);

    // Memory usage trends
    const memoryTrends = this.metrics
      .filter(m => m.memoryUsage)
      .map(m => ({
        test: m.testName,
        memory: m.memoryUsage!.heapUsed
      }))
      .sort((a, b) => b.memory - a.memory)
      .slice(0, 10);

    // Generate recommendations
    const recommendations = this.generateRecommendations(suiteMetrics, slowestTests);

    return {
      reportId: `report-${Date.now()}`,
      timestamp: new Date().toISOString(),
      totalSuites: suiteNames.length,
      totalTests,
      overallPassRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      avgSuiteDuration: suiteMetrics.reduce((sum, s) => sum + s.totalDuration, 0) / suiteMetrics.length,
      slowestTests,
      mostFailingTests,
      memoryTrends,
      recommendations,
      suiteMetrics
    };
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(
    suiteMetrics: TestSuiteMetrics[], 
    slowestTests: TestMetric[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for slow tests
    const slowThreshold = 5000; // 5 seconds
    const slowTests = slowestTests.filter(t => t.duration > slowThreshold);
    if (slowTests.length > 0) {
      recommendations.push(
        `Consider optimizing ${slowTests.length} slow tests (>${slowThreshold}ms): ${slowTests.slice(0, 3).map(t => t.testName).join(', ')}`
      );
    }

    // Check pass rates
    const lowPassRateSuites = suiteMetrics.filter(s => 
      s.totalTests > 0 && (s.passedTests / s.totalTests) < 0.9
    );
    if (lowPassRateSuites.length > 0) {
      recommendations.push(
        `Investigate suites with low pass rates: ${lowPassRateSuites.map(s => s.suiteName).join(', ')}`
      );
    }

    // Check for skipped tests
    const skippedTestCount = suiteMetrics.reduce((sum, s) => sum + s.skippedTests, 0);
    if (skippedTestCount > 0) {
      recommendations.push(
        `Review ${skippedTestCount} skipped tests - consider fixing or removing`
      );
    }

    // Check for memory-intensive tests
    const highMemoryTests = this.metrics.filter(m => 
      m.memoryUsage && m.memoryUsage.heapUsed > 100 * 1024 * 1024 // 100MB
    );
    if (highMemoryTests.length > 0) {
      recommendations.push(
        `Monitor memory usage in ${highMemoryTests.length} high-memory tests`
      );
    }

    // Check test distribution
    const avgTestsPerSuite = suiteMetrics.reduce((sum, s) => sum + s.totalTests, 0) / suiteMetrics.length;
    const oversizedSuites = suiteMetrics.filter(s => s.totalTests > avgTestsPerSuite * 2);
    if (oversizedSuites.length > 0) {
      recommendations.push(
        `Consider splitting large test suites: ${oversizedSuites.map(s => s.suiteName).join(', ')}`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Test suite metrics look healthy! 🎉');
    }

    return recommendations;
  }

  /**
   * Save metrics to file
   */
  async saveMetrics(filename?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filepath = join(this.metricsDir, filename || `test-metrics-${timestamp}.json`);
    
    const report = this.generateQualityReport();
    
    try {
      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
      return filepath;
    } catch (error) {
      console.warn('Failed to save metrics:', error);
      throw error;
    }
  }

  /**
   * Load metrics from file
   */
  async loadMetrics(filepath: string): Promise<TestQualityReport> {
    try {
      const content = await fs.readFile(filepath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('Failed to load metrics:', error);
      throw error;
    }
  }

  /**
   * Get test performance trends over time
   */
  async getPerformanceTrends(): Promise<Array<{ date: string; avgDuration: number; passRate: number }>> {
    try {
      const files = await fs.readdir(this.metricsDir);
      const metricFiles = files.filter(f => f.startsWith('test-metrics-') && f.endsWith('.json'));
      
      const trends = [];
      for (const file of metricFiles.slice(-10)) { // Last 10 reports
        try {
          const report = await this.loadMetrics(join(this.metricsDir, file));
          trends.push({
            date: report.timestamp,
            avgDuration: report.avgSuiteDuration,
            passRate: report.overallPassRate
          });
        } catch (error) {
          // Skip corrupted files
          continue;
        }
      }
      
      return trends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.warn('Failed to get performance trends:', error);
      return [];
    }
  }
}

// Global metrics collector instance
export const testMetrics = new TestMetricsCollector();