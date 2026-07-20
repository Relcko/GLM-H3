import { ConfigurationError } from '@relcko/errors';

export type ConfigValue = string | number | boolean;

export type ConfigSchema = Record<string, { type: 'string' | 'number' | 'boolean'; required?: boolean; default?: ConfigValue }>;

export type InferredConfig<T extends ConfigSchema> = {
  [K in keyof T]: T[K]['type'] extends 'number'
    ? number
    : T[K]['type'] extends 'boolean'
      ? boolean
      : string;
};

export class ConfigLoader {
  private readonly env: Record<string, string | undefined>;

  constructor(env?: Record<string, string | undefined>) {
    this.env = env ?? process.env;
  }

  load<T extends ConfigSchema>(schema: T): InferredConfig<T> {
    const config = {} as Record<string, ConfigValue>;

    for (const [key, definition] of Object.entries(schema)) {
      const rawValue = this.env[key];

      if (rawValue === undefined || rawValue === '') {
        if (definition.required && definition.default === undefined) {
          throw new ConfigurationError(`Missing required environment variable: ${key}`);
        }
        if (definition.default !== undefined) {
          config[key] = definition.default;
        }
        continue;
      }

      switch (definition.type) {
        case 'number': {
          const parsed = Number(rawValue);
          if (Number.isNaN(parsed)) {
            throw new ConfigurationError(
              `Environment variable ${key} must be a number, got: ${rawValue}`,
            );
          }
          config[key] = parsed;
          break;
        }
        case 'boolean': {
          const normalized = rawValue.toLowerCase();
          if (!['true', 'false', '1', '0'].includes(normalized)) {
            throw new ConfigurationError(
              `Environment variable ${key} must be a boolean, got: ${rawValue}`,
            );
          }
          config[key] = normalized === 'true' || normalized === '1';
          break;
        }
        case 'string': {
          config[key] = rawValue;
          break;
        }
      }
    }

    return config as InferredConfig<T>;
  }
}

export const appConfigSchema = {
  NODE_ENV: { type: 'string' as const, required: true, default: 'development' },
  LOG_LEVEL: { type: 'string' as const, required: true, default: 'info' },
  LOG_FORMAT: { type: 'string' as const, required: true, default: 'json' },
  APP_NAME: { type: 'string' as const, required: true, default: 'relcko' },
  APP_VERSION: { type: 'string' as const, required: true, default: '0.1.0' },
  APP_PORT: { type: 'number' as const, required: true, default: 3000 },
  EVENT_STORE_URL: { type: 'string' as const, required: true, default: 'postgresql://localhost:5432/relcko' },
} as const satisfies ConfigSchema;

export type AppConfig = InferredConfig<typeof appConfigSchema>;
