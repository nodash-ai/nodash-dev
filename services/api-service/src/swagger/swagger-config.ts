import swaggerUi from 'swagger-ui-express';
import { OpenAPIGenerator } from './openapi-generator.js';
import { createHealthEndpointDocumentation } from './endpoints/health-endpoint.js';
import { createTrackEndpointDocumentation } from './endpoints/track-endpoint.js';
import { createIdentifyEndpointDocumentation } from './endpoints/identify-endpoint.js';
import { createEventQueryEndpointDocumentation, createUserQueryEndpointDocumentation } from './endpoints/query-endpoints.js';

export class SwaggerConfiguration {
  private generator: OpenAPIGenerator;

  constructor(environment: string = 'development') {
    this.generator = new OpenAPIGenerator(
      'Nodash Analytics API',
      '1.0.0',
      'Comprehensive API for Nodash Analytics platform'
    );

    // Set server configuration
    this.generator.updateServers([{
      url: '',
      description: `Current server (${environment})`,
    }]);

    // Add all endpoint documentation
    this.addEndpoints();
  }

  private addEndpoints(): void {
    this.generator.addEndpoint(createHealthEndpointDocumentation());
    this.generator.addEndpoint(createTrackEndpointDocumentation());
    this.generator.addEndpoint(createIdentifyEndpointDocumentation());
    this.generator.addEndpoint(createEventQueryEndpointDocumentation());
    this.generator.addEndpoint(createUserQueryEndpointDocumentation());
  }

  generateSpecification() {
    return this.generator.generateSpecification();
  }

  createSwaggerMiddleware() {
    const spec = this.generateSpecification();
    
    return {
      serve: swaggerUi.serve,
      setup: swaggerUi.setup(spec, {
        customSiteTitle: 'Nodash Analytics API - Documentation',
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          docExpansion: 'list',
          filter: true,
          tryItOutEnabled: true,
        },
      }),
      jsonSpec: (_: any, res: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(spec, null, 2));
      },
      yamlSpec: (_: any, res: any) => {
        res.setHeader('Content-Type', 'application/x-yaml');
        res.send(this.convertToYaml(spec));
      },
    };
  }

  private convertToYaml(spec: any): string {
    // Simple YAML conversion for basic spec info
    return `openapi: "${spec.openapi}"
info:
  title: "${spec.info.title}"
  version: "${spec.info.version}"
  description: "${spec.info.description}"
servers:
  - url: ""
    description: "Current server"
paths: {}
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT`;
  }
}

export function createDefaultSwaggerConfig(environment: string = 'development') {
  return new SwaggerConfiguration(environment);
}