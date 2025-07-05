/**
 * @nodash/api-interfaces
 * 
 * Public API interface definitions for the Nodash analytics platform.
 * These interfaces define the contracts between client SDKs and Nodash servers.
 * 
 * This package is published from our private infrastructure and consumed
 * by public client tools to ensure type safety and API compatibility.
 */

// Export all analytics interfaces
export * from './analytics';

// Export all monitoring interfaces  
export * from './monitoring';

// Export all common interfaces
export * from './common';

// Package version and metadata
export const PACKAGE_VERSION = '1.0.0';
export const API_VERSION = 'v1';

// Supported service endpoints
export const SERVICES = {
  ANALYTICS: 'analytics',
  MONITORING: 'monitoring',
  BI: 'bi'
} as const;

export type ServiceName = typeof SERVICES[keyof typeof SERVICES]; 