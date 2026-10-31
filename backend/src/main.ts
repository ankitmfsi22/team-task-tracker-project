import { startServer } from './server.js';

try {
  const server = await startServer(process.env);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : address;
  console.log(`API listening on port ${String(port)}`);
} catch (err) {
  console.error(err instanceof Error ? err.message : 'Failed to start the server');
  process.exit(1);
}
