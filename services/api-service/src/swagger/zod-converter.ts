import { z, ZodSchema, ZodType } from 'zod';
import { OpenAPIV3 } from 'openapi-types';

export interface ConversionOptions {
  includeExamples?: boolean;
  includeDescriptions?: boolean;
}

export class ZodToOpenAPIConverter {
  private options: Required<ConversionOptions>;

  constructor(options: ConversionOptions = {}) {
    this.options = {
      includeExamples: options.includeExamples ?? true,
      includeDescriptions: options.includeDescriptions ?? true,
    };
  }

  convertSchema(zodSchema: ZodSchema): { schema: OpenAPIV3.SchemaObject; errors: string[]; warnings: string[] } {
    try {
      const schema = this.zodToOpenApiSchema(zodSchema);
      return { schema, errors: [], warnings: [] };
    } catch (error) {
      return {
        schema: { type: 'object', description: 'Schema conversion failed' },
        errors: [`Failed to convert Zod schema: ${error instanceof Error ? error.message : String(error)}`],
        warnings: [],
      };
    }
  }

  private zodToOpenApiSchema(zodSchema: ZodSchema): OpenAPIV3.SchemaObject {
    const zodType = (zodSchema._def as any).typeName;

    switch (zodType) {
      case 'ZodString':
        return this.convertZodString(zodSchema as z.ZodString);
      case 'ZodNumber':
        return this.convertZodNumber(zodSchema as z.ZodNumber);
      case 'ZodBoolean':
        return { type: 'boolean' };
      case 'ZodDate':
        return { type: 'string', format: 'date-time' };
      case 'ZodArray':
        return this.convertZodArray(zodSchema as z.ZodArray<any>);
      case 'ZodObject':
        return this.convertZodObject(zodSchema as z.ZodObject<any>);
      case 'ZodOptional':
        return this.zodToOpenApiSchema((zodSchema as z.ZodOptional<any>)._def.innerType);
      case 'ZodNullable':
        const innerSchema = this.zodToOpenApiSchema((zodSchema as z.ZodNullable<any>)._def.innerType);
        return { ...innerSchema, nullable: true };
      case 'ZodEnum':
        return this.convertZodEnum(zodSchema as z.ZodEnum<any>);
      case 'ZodLiteral':
        return { type: typeof (zodSchema as z.ZodLiteral<any>)._def.value as any, enum: [(zodSchema as z.ZodLiteral<any>)._def.value] };
      case 'ZodUnion':
        return { oneOf: (zodSchema as z.ZodUnion<any>)._def.options.map((option: ZodType) => this.zodToOpenApiSchema(option)) };
      default:
        return { type: 'object', description: `Unsupported Zod type: ${zodType}` };
    }
  }

  private convertZodString(zodString: z.ZodString): OpenAPIV3.SchemaObject {
    const schema: OpenAPIV3.SchemaObject = { type: 'string' };
    const checks = (zodString as any)._def.checks || [];
    
    checks.forEach((check: any) => {
      switch (check.kind) {
        case 'min': schema.minLength = check.value; break;
        case 'max': schema.maxLength = check.value; break;
        case 'email': schema.format = 'email'; break;
        case 'url': schema.format = 'uri'; break;
        case 'uuid': schema.format = 'uuid'; break;
        case 'regex': schema.pattern = check.regex.source; break;
      }
    });

    return schema;
  }

  private convertZodNumber(zodNumber: z.ZodNumber): OpenAPIV3.SchemaObject {
    const schema: OpenAPIV3.SchemaObject = { type: 'number' };
    const checks = (zodNumber as any)._def.checks || [];
    
    checks.forEach((check: any) => {
      switch (check.kind) {
        case 'min': 
          schema.minimum = check.value;
          if (check.inclusive === false) schema.exclusiveMinimum = true;
          break;
        case 'max': 
          schema.maximum = check.value;
          if (check.inclusive === false) schema.exclusiveMaximum = true;
          break;
        case 'int': schema.type = 'integer'; break;
      }
    });

    return schema;
  }

  private convertZodArray(zodArray: z.ZodArray<any>): OpenAPIV3.SchemaObject {
    const schema: OpenAPIV3.SchemaObject = {
      type: 'array',
      items: this.zodToOpenApiSchema(zodArray._def.type),
    };

    if (zodArray._def.minLength) schema.minItems = zodArray._def.minLength.value;
    if (zodArray._def.maxLength) schema.maxItems = zodArray._def.maxLength.value;

    return schema;
  }

  private convertZodObject(zodObject: z.ZodObject<any>): OpenAPIV3.SchemaObject {
    const shape = zodObject._def.shape();
    const properties: Record<string, OpenAPIV3.SchemaObject> = {};
    const required: string[] = [];

    Object.entries(shape).forEach(([key, value]) => {
      const zodType = value as ZodType;
      properties[key] = this.zodToOpenApiSchema(zodType);
      
      if ((zodType._def as any).typeName !== 'ZodOptional') {
        required.push(key);
      }
    });

    const schema: OpenAPIV3.SchemaObject = { type: 'object', properties };
    if (required.length > 0) schema.required = required;

    return schema;
  }

  private convertZodEnum(zodEnum: z.ZodEnum<any>): OpenAPIV3.SchemaObject {
    return { type: 'string', enum: zodEnum._def.values };
  }
}