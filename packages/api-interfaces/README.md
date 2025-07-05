# @nodash/api-interfaces

Public API interface definitions for the Nodash analytics platform.

## Overview

This package contains TypeScript interface definitions that define the contracts between Nodash client SDKs and server APIs. These interfaces ensure type safety and API compatibility across the entire Nodash ecosystem.

## Installation

```bash
npm install @nodash/api-interfaces
```

## Usage

```typescript
import { 
  AnalyticsClientInterface,
  EventData,
  BatchEventRequest,
  MonitoringClientInterface,
  APIConfig 
} from '@nodash/api-interfaces';

// Use interfaces to implement type-safe clients
class MyAnalyticsClient implements AnalyticsClientInterface {
  async batchEvents(request: BatchEventRequest) {
    // Implementation here
  }
  // ... other methods
}
```

## Available Interfaces

### Analytics
- `AnalyticsClientInterface` - Main analytics client contract
- `EventData` - Event data structure
- `BatchEventRequest/Response` - Batch event handling
- `SchemaDefinition` - Event schema management

### Monitoring  
- `MonitoringClientInterface` - Main monitoring client contract
- `MetricData` - Metrics data structure
- `HealthCheckResponse` - Health check responses
- `AlertRule` - Alert rule definitions

### Common
- `APIConfig` - Base API configuration
- `APIResponse<T>` - Standard API response wrapper
- `APIError` - Standard error structure
- `RequestOptions` - Request configuration options

## Publishing

This package is automatically published from our private infrastructure when server APIs are updated. The interfaces are extracted from our server implementations to ensure they stay in sync.

## License

MIT 