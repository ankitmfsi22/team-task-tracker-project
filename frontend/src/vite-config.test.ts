import { afterEach, describe, expect, it, vi } from 'vitest';

interface ProxyEntry {
  target?: string;
}

interface ProxyHost {
  proxy?: Record<string, ProxyEntry | string>;
}

interface LoadedConfig {
  server?: ProxyHost;
  preview?: ProxyHost;
}

async function loadConfig(): Promise<LoadedConfig> {
  vi.resetModules();
  const mod = (await import('../vite.config.js')) as { default: LoadedConfig };
  return mod.default;
}

function targetOf(host: ProxyHost | undefined): string | undefined {
  const entry = host?.proxy?.['/api'];
  return typeof entry === 'string' ? entry : entry?.target;
}

describe('vite config same-origin proxy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('proxies /api for both dev server and preview to the default backend', async () => {
    vi.stubEnv('BACKEND_URL', '');
    delete process.env.BACKEND_URL;
    const config = await loadConfig();
    expect(config.server?.proxy?.['/api']).toBeDefined();
    expect(config.preview?.proxy?.['/api']).toBeDefined();
    expect(targetOf(config.server)).toBe('http://localhost:3000');
    expect(targetOf(config.preview)).toBe('http://localhost:3000');
  });

  it('uses BACKEND_URL for both proxies when set', async () => {
    vi.stubEnv('BACKEND_URL', 'http://backend.example:4000');
    const config = await loadConfig();
    expect(targetOf(config.server)).toBe('http://backend.example:4000');
    expect(targetOf(config.preview)).toBe('http://backend.example:4000');
  });
});
