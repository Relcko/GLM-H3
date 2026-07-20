import { describe, expect, it } from 'vitest';

import { ConfigLoader, appConfigSchema } from './index';

describe('ConfigLoader', () => {
  it('loads string values from env', () => {
    const loader = new ConfigLoader({ APP_NAME: 'test-app' });
    const config = loader.load({ APP_NAME: { type: 'string', required: true } });
    expect(config.APP_NAME).toBe('test-app');
  });

  it('loads number values from env', () => {
    const loader = new ConfigLoader({ APP_PORT: '4000' });
    const config = loader.load({ APP_PORT: { type: 'number', required: true } });
    expect(config.APP_PORT).toBe(4000);
  });

  it('loads boolean values from env', () => {
    const loader = new ConfigLoader({ FEATURE_FLAG: 'true' });
    const config = loader.load({ FEATURE_FLAG: { type: 'boolean', required: true } });
    expect(config.FEATURE_FLAG).toBe(true);
  });

  it('uses defaults for missing optional values', () => {
    const loader = new ConfigLoader({});
    const config = loader.load({
      OPTIONAL_KEY: { type: 'string', required: false, default: 'default-val' },
    });
    expect(config.OPTIONAL_KEY).toBe('default-val');
  });

  it('throws on missing required values', () => {
    const loader = new ConfigLoader({});
    expect(() =>
      loader.load({ REQUIRED_KEY: { type: 'string', required: true } }),
    ).toThrow();
  });

  it('throws on invalid number', () => {
    const loader = new ConfigLoader({ APP_PORT: 'not-a-number' });
    expect(() =>
      loader.load({ APP_PORT: { type: 'number', required: true } }),
    ).toThrow();
  });

  it('loads app config schema', () => {
    const loader = new ConfigLoader({ NODE_ENV: 'production' });
    const config = loader.load(appConfigSchema);
    expect(config.NODE_ENV).toBe('production');
    expect(config.APP_NAME).toBe('relcko');
    expect(config.APP_PORT).toBe(3000);
  });
});
