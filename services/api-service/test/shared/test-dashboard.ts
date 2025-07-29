import { promises as fs } from 'fs';
import { join } from 'path';
import { TestQualityReport, TestMetric, TestSuiteMetrics } from './test-metrics';

export class TestQualityDashboard {
  private dashboardDir = './test-reports';

  constructor() {
    this.ensureDashboardDirectory();
  }

  private async ensureDashboardDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.dashboardDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to create dashboard directory:', error);
    }
  }

  /**
   * Generate HTML dashboard from test quality report
   */
  async generateHtmlDashboard(report: TestQualityReport): Promise<string> {
    const html = this.createHtmlDashboard(report);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filepath = join(this.dashboardDir, `test-dashboard-${timestamp}.html`);
    
    await fs.writeFile(filepath, html);
    return filepath;
  }

  /**
   * Create HTML dashboard content
   */
  private createHtmlDashboard(report: TestQualityReport): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Quality Dashboard - ${new Date(report.timestamp).toLocaleDateString()}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 30px;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #eee;
        }
        .header h1 {
            color: #2c3e50;
            margin: 0 0 10px 0;
        }
        .timestamp {
            color: #7f8c8d;
            font-size: 14px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .metric-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .metric-card.success {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        }
        .metric-card.warning {
            background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
        }
        .metric-card.error {
            background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
        }
        .metric-value {
            font-size: 2.5em;
            font-weight: bold;
            margin: 0;
        }
        .metric-label {
            font-size: 0.9em;
            opacity: 0.9;
            margin-top: 5px;
        }
        .section {
            margin-bottom: 40px;
        }
        .section h2 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .test-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .test-table th,
        .test-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .test-table th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }
        .test-table tr:hover {
            background-color: #f8f9fa;
        }
        .status-passed {
            color: #28a745;
            font-weight: bold;
        }
        .status-failed {
            color: #dc3545;
            font-weight: bold;
        }
        .status-skipped {
            color: #ffc107;
            font-weight: bold;
        }
        .duration {
            font-family: monospace;
        }
        .recommendations {
            background: #e8f4fd;
            border-left: 4px solid #3498db;
            padding: 20px;
            border-radius: 0 8px 8px 0;
        }
        .recommendations ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .recommendations li {
            margin-bottom: 8px;
        }
        .suite-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .suite-card {
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            background: white;
        }
        .suite-card h3 {
            margin-top: 0;
            color: #495057;
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background-color: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
            transition: width 0.3s ease;
        }
        .memory-chart {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
        }
        .chart-bar {
            display: flex;
            align-items: center;
            margin: 8px 0;
        }
        .chart-label {
            width: 200px;
            font-size: 12px;
            color: #6c757d;
        }
        .chart-value {
            flex: 1;
            height: 20px;
            background: linear-gradient(90deg, #17a2b8 0%, #138496 100%);
            margin: 0 10px;
            border-radius: 10px;
            position: relative;
        }
        .chart-text {
            font-size: 12px;
            color: #495057;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Quality Dashboard</h1>
            <div class="timestamp">Generated on ${new Date(report.timestamp).toLocaleString()}</div>
        </div>

        <div class="metrics-grid">
            <div class="metric-card ${report.overallPassRate >= 95 ? 'success' : report.overallPassRate >= 80 ? 'warning' : 'error'}">
                <div class="metric-value">${report.overallPassRate.toFixed(1)}%</div>
                <div class="metric-label">Overall Pass Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.totalSuites}</div>
                <div class="metric-label">Test Suites</div>
            </div>
            <div class="metric-card ${report.avgSuiteDuration < 5000 ? 'success' : report.avgSuiteDuration < 15000 ? 'warning' : 'error'}">
                <div class="metric-value">${(report.avgSuiteDuration / 1000).toFixed(1)}s</div>
                <div class="metric-label">Avg Suite Duration</div>
            </div>
        </div>

        <div class="section">
            <h2>📊 Test Suite Overview</h2>
            <div class="suite-grid">
                ${report.suiteMetrics.map(suite => this.createSuiteCard(suite)).join('')}
            </div>
        </div>

        <div class="section">
            <h2>🐌 Slowest Tests</h2>
            <table class="test-table">
                <thead>
                    <tr>
                        <th>Test Name</th>
                        <th>Suite</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>API Calls</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.slowestTests.slice(0, 10).map(test => `
                        <tr>
                            <td>${test.testName}</td>
                            <td>${test.suite}</td>
                            <td class="duration">${(test.duration / 1000).toFixed(2)}s</td>
                            <td class="status-${test.status}">${test.status}</td>
                            <td>${test.apiCalls || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        ${report.mostFailingTests.length > 0 ? `
        <div class="section">
            <h2>❌ Most Failing Tests</h2>
            <table class="test-table">
                <thead>
                    <tr>
                        <th>Test Name</th>
                        <th>Suite</th>
                        <th>Error Message</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.mostFailingTests.map(test => `
                        <tr>
                            <td>${test.testName}</td>
                            <td>${test.suite}</td>
                            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${test.errorMessage || 'N/A'}</td>
                            <td class="duration">${(test.duration / 1000).toFixed(2)}s</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <div class="section">
            <h2>💾 Memory Usage Analysis</h2>
            <div class="memory-chart">
                ${report.memoryTrends.slice(0, 10).map((trend, index) => {
                  const maxMemory = Math.max(...report.memoryTrends.map(t => t.memory));
                  const width = (trend.memory / maxMemory) * 100;
                  return `
                    <div class="chart-bar">
                        <div class="chart-label">${trend.test.substring(0, 30)}${trend.test.length > 30 ? '...' : ''}</div>
                        <div class="chart-value" style="width: ${width}%"></div>
                        <div class="chart-text">${(trend.memory / 1024 / 1024).toFixed(1)} MB</div>
                    </div>
                  `;
                }).join('')}
            </div>
        </div>

        <div class="section">
            <h2>💡 Recommendations</h2>
            <div class="recommendations">
                <ul>
                    ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Create a suite card for the dashboard
   */
  private createSuiteCard(suite: TestSuiteMetrics): string {
    const passRate = suite.totalTests > 0 ? (suite.passedTests / suite.totalTests) * 100 : 0;
    
    return `
      <div class="suite-card">
          <h3>${suite.suiteName}</h3>
          <div class="progress-bar">
              <div class="progress-fill" style="width: ${passRate}%"></div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 10px;">
              <span><strong>${suite.passedTests}</strong> passed</span>
              <span><strong>${suite.failedTests}</strong> failed</span>
              <span><strong>${suite.skippedTests}</strong> skipped</span>
          </div>
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6;">
              <div style="display: flex; justify-content: space-between;">
                  <span>Avg Duration:</span>
                  <span class="duration">${(suite.avgTestDuration / 1000).toFixed(2)}s</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                  <span>Total Duration:</span>
                  <span class="duration">${(suite.totalDuration / 1000).toFixed(2)}s</span>
              </div>
          </div>
      </div>
    `;
  }

  /**
   * Generate markdown report
   */
  async generateMarkdownReport(report: TestQualityReport): Promise<string> {
    const markdown = this.createMarkdownReport(report);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filepath = join(this.dashboardDir, `test-report-${timestamp}.md`);
    
    await fs.writeFile(filepath, markdown);
    return filepath;
  }

  /**
   * Create markdown report content
   */
  private createMarkdownReport(report: TestQualityReport): string {
    return `# Test Quality Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}  
**Report ID:** ${report.reportId}

## 📊 Overview

| Metric | Value |
|--------|-------|
| Overall Pass Rate | ${report.overallPassRate.toFixed(1)}% |
| Total Tests | ${report.totalTests} |
| Total Suites | ${report.totalSuites} |
| Average Suite Duration | ${(report.avgSuiteDuration / 1000).toFixed(2)}s |

## 🧪 Test Suite Summary

${report.suiteMetrics.map(suite => `
### ${suite.suiteName}

- **Tests:** ${suite.totalTests} (${suite.passedTests} passed, ${suite.failedTests} failed, ${suite.skippedTests} skipped)
- **Pass Rate:** ${suite.totalTests > 0 ? ((suite.passedTests / suite.totalTests) * 100).toFixed(1) : 0}%
- **Duration:** ${(suite.totalDuration / 1000).toFixed(2)}s total, ${(suite.avgTestDuration / 1000).toFixed(2)}s average
`).join('')}

## 🐌 Slowest Tests

${report.slowestTests.slice(0, 5).map((test, index) => `
${index + 1}. **${test.testName}** (${test.suite})
   - Duration: ${(test.duration / 1000).toFixed(2)}s
   - Status: ${test.status}
   - API Calls: ${test.apiCalls || 0}
`).join('')}

${report.mostFailingTests.length > 0 ? `
## ❌ Most Failing Tests

${report.mostFailingTests.map((test, index) => `
${index + 1}. **${test.testName}** (${test.suite})
   - Error: ${test.errorMessage || 'N/A'}
   - Duration: ${(test.duration / 1000).toFixed(2)}s
`).join('')}
` : ''}

## 💾 Memory Usage Top 5

${report.memoryTrends.slice(0, 5).map((trend, index) => `
${index + 1}. **${trend.test}**: ${(trend.memory / 1024 / 1024).toFixed(1)} MB
`).join('')}

## 💡 Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

---
*Generated by Test Quality Monitoring System*
`;
  }

  /**
   * Generate JSON report for programmatic access
   */
  async generateJsonReport(report: TestQualityReport): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filepath = join(this.dashboardDir, `test-data-${timestamp}.json`);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    return filepath;
  }

  /**
   * Generate all report formats
   */
  async generateAllReports(report: TestQualityReport): Promise<{
    html: string;
    markdown: string;
    json: string;
  }> {
    const [html, markdown, json] = await Promise.all([
      this.generateHtmlDashboard(report),
      this.generateMarkdownReport(report),
      this.generateJsonReport(report)
    ]);

    return { html, markdown, json };
  }
}

export const testDashboard = new TestQualityDashboard();