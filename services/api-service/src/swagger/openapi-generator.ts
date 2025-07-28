import { OpenAPIV3 } from 'openapi-types';


export interface EndpointDocumentation {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  summary: string;
  description: string;
  tags: string[];
  parameters?: ParameterDocumentation[];
  requestBody?: RequestBodyDocumentation;
  responses: ResponseDocumentation[];
  security?: SecurityRequirement[];
}

export interface ParameterDocumentation {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  required: boolean;
  schema: OpenAPIV3.SchemaObject;
  description?: string;
  example?: any;
}

export interface RequestBodyDocumentation {
  description: string;
  required: boolean;
  content: {
    [mediaType: string]: {
      schema: OpenAPIV3.SchemaObject;
      example?: any;
    };
  };
}

export interface ResponseDocumentation {
  statusCode: number;
  description: string;
  content?: {
    [mediaType: string]: {
      schema: OpenAPIV3.SchemaObject;
      example?: any;
    };
  };
  headers?: {
    [headerName: string]: OpenAPIV3.HeaderObject;
  };
}

export interface SecurityRequirement {
  [securitySchemeName: string]: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class OpenAPIGenerator {
  private specification: OpenAPIV3.Document;
  private endpoints: Map<string, EndpointDocumentation> = new Map();
  private schemas: Map<string, OpenAPIV3.SchemaObject> = new Map();

  constructor(
    title: string = 'Nodash Analytics API',
    version: string = '1.0.0',
    description: string = 'Comprehensive API for Nodash Analytics platform'
  ) {
    this.specification = {
      openapi: '3.0.0',
      info: {
        title,
        version,
        description,
        contact: {
          name: 'Nodash Support',
          url: 'https://docs.nodash.ai',
          email: 'support@nodash.ai',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
        {
          url: 'https://api.nodash.ai',
          description: 'Production server',
        },
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token for API authentication',
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key',
            description: 'API key for authentication',
          },
        },
        responses: {},
      },
      security: [],
    };
  }

  /**
   * Generate the complete OpenAPI specification
   */
  generateSpecification(): OpenAPIV3.Document {
    // Add all registered schemas to components
    this.schemas.forEach((schema, name) => {
      if (this.specification.components?.schemas) {
        this.specification.components.schemas[name] = schema;
      }
    });

    // Add all registered endpoints to paths
    this.endpoints.forEach((endpoint) => {
      const pathKey = endpoint.path;
      const method = endpoint.method.toLowerCase() as keyof OpenAPIV3.PathItemObject;

      if (!this.specification.paths[pathKey]) {
        this.specification.paths[pathKey] = {};
      }

      const pathItem = this.specification.paths[pathKey] as OpenAPIV3.PathItemObject;
      
      const operation: OpenAPIV3.OperationObject = {
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags,
        operationId: this.generateOperationId(endpoint.method, endpoint.path),
        parameters: endpoint.parameters?.map(this.convertParameter),
        responses: this.convertResponses(endpoint.responses),
      };

      if (endpoint.requestBody) {
        operation.requestBody = this.convertRequestBody(endpoint.requestBody);
      }

      if (endpoint.security && endpoint.security.length > 0) {
        operation.security = endpoint.security;
      }

      (pathItem as any)[method] = operation;
    });

    return this.specification;
  }

  /**
   * Add an endpoint to the specification
   */
  addEndpoint(endpoint: EndpointDocumentation): void {
    const key = `${endpoint.method}:${endpoint.path}`;
    this.endpoints.set(key, endpoint);
  }

  /**
   * Add a schema to the specification
   */
  addSchema(name: string, schema: OpenAPIV3.SchemaObject): void {
    this.schemas.set(name, schema);
  }

  /**
   * Validate the specification for completeness and correctness
   */
  validateSpecification(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if all endpoints have proper documentation
    this.endpoints.forEach((endpoint, key) => {
      if (!endpoint.summary || endpoint.summary.trim() === '') {
        errors.push(`Endpoint ${key} is missing a summary`);
      }

      if (!endpoint.description || endpoint.description.trim() === '') {
        warnings.push(`Endpoint ${key} is missing a description`);
      }

      if (!endpoint.tags || endpoint.tags.length === 0) {
        warnings.push(`Endpoint ${key} has no tags`);
      }

      if (!endpoint.responses || endpoint.responses.length === 0) {
        errors.push(`Endpoint ${key} has no response definitions`);
      }

      // Check for success response
      const hasSuccessResponse = endpoint.responses.some(
        (response) => response.statusCode >= 200 && response.statusCode < 300
      );
      if (!hasSuccessResponse) {
        warnings.push(`Endpoint ${key} has no success response defined`);
      }
    });

    // Check for unused schemas
    const usedSchemas = new Set<string>();
    const specString = JSON.stringify(this.generateSpecification());
    this.schemas.forEach((_, name) => {
      if (specString.includes(`"$ref":"#/components/schemas/${name}"`)) {
        usedSchemas.add(name);
      }
    });

    this.schemas.forEach((_, name) => {
      if (!usedSchemas.has(name)) {
        warnings.push(`Schema ${name} is defined but not used`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Update server configuration
   */
  updateServers(servers: OpenAPIV3.ServerObject[]): void {
    this.specification.servers = servers;
  }

  /**
   * Get current specification info
   */
  getInfo(): OpenAPIV3.InfoObject {
    return this.specification.info;
  }

  /**
   * Update specification info
   */
  updateInfo(info: Partial<OpenAPIV3.InfoObject>): void {
    this.specification.info = { ...this.specification.info, ...info };
  }

  private generateOperationId(method: string, path: string): string {
    // Convert path like "/v1/events/query" to "getV1EventsQuery"
    const cleanPath = path
      .replace(/^\//, '') // Remove leading slash
      .replace(/\//g, '_') // Replace slashes with underscores
      .replace(/[{}]/g, '') // Remove path parameter braces
      .replace(/-/g, '_'); // Replace hyphens with underscores

    const methodPrefix = method.toLowerCase();
    const pathCamelCase = cleanPath
      .split('_')
      .map((part, index) => 
        index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
      )
      .join('');

    return `${methodPrefix}${pathCamelCase.charAt(0).toUpperCase()}${pathCamelCase.slice(1)}`;
  }

  private convertParameter = (param: ParameterDocumentation): OpenAPIV3.ParameterObject => ({
    name: param.name,
    in: param.in,
    required: param.required,
    schema: param.schema,
    description: param.description,
    example: param.example,
  });

  private convertRequestBody(requestBody: RequestBodyDocumentation): OpenAPIV3.RequestBodyObject {
    return {
      description: requestBody.description,
      required: requestBody.required,
      content: requestBody.content,
    };
  }

  private convertResponses(responses: ResponseDocumentation[]): OpenAPIV3.ResponsesObject {
    const convertedResponses: OpenAPIV3.ResponsesObject = {};

    responses.forEach((response) => {
      const responseObj: OpenAPIV3.ResponseObject = {
        description: response.description,
      };

      if (response.content) {
        responseObj.content = response.content;
      }

      if (response.headers) {
        responseObj.headers = response.headers;
      }

      convertedResponses[response.statusCode.toString()] = responseObj;
    });

    return convertedResponses;
  }
}