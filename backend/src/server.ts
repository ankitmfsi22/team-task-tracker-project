import type { Server } from 'node:http';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

type Env = Record<string, string | undefined>;

const DEFAULT_PORT = 3000;

// Loads the configuration first, so a missing variable fails before anything listens.
export function startServer(env: Env, port?: number): Promise<Server> {
  const config = loadConfig(env);
  const app = createApp(config);
  const listenPort = port ?? Number(env['PORT'] ?? DEFAULT_PORT);
  return new Promise((resolve, reject) => {
    const server = app.listen(listenPort, () => resolve(server));
    server.once('error', reject);
  });
}
