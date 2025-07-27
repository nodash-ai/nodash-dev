# Shared Libraries

## Overview

This directory is reserved for shared libraries and utilities that will be used across multiple services and applications in the Nodash monorepo:

- Common TypeScript types and interfaces
- Shared validation schemas (Zod)
- Utility functions and helpers
- Common middleware and authentication logic
- Shared configuration and constants

## Planned Architecture

- **Package Structure**: Multiple sub-packages for different concerns
- **Build System**: TypeScript compilation with declaration files
- **Distribution**: Internal npm packages within the monorepo
- **Testing**: Comprehensive unit tests for all shared utilities
- **Documentation**: JSDoc comments and usage examples

## Development Status

🚧 **Not yet implemented** - This is a placeholder for future development.

## Planned Packages

### `@nodash/types`
- Common TypeScript interfaces and types
- API request/response types
- Database model types
- Event and analytics data types

### `@nodash/validation`
- Zod schemas for data validation
- Request validation middleware
- Common validation utilities
- Type-safe validation helpers

### `@nodash/utils`
- Date and time utilities
- String manipulation helpers
- Data transformation functions
- Common algorithm implementations

### `@nodash/auth`
- JWT token utilities
- Authentication middleware
- Permission checking helpers
- Multi-tenant context utilities

### `@nodash/config`
- Environment configuration management
- Feature flag utilities
- Service discovery helpers
- Common configuration schemas

## Getting Started

These shared packages will be developed as common patterns emerge across services. When ready for development:

1. Create individual package directories with their own package.json
2. Set up TypeScript configurations extending the root config
3. Implement shared utilities with comprehensive tests
4. Configure internal package publishing and consumption
5. Document usage patterns and best practices

## Usage

Once implemented, services and apps will import shared functionality:

```typescript
import { validateApiKey } from '@nodash/auth';
import { EventSchema } from '@nodash/validation';
import { formatTimestamp } from '@nodash/utils';
```

## Related Services

- **All Services**: Will consume shared utilities and types
- **All Apps**: Will use shared validation and utility functions