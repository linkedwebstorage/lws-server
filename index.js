#!/usr/bin/env node

/**
 * LWS Server CLI
 * Minimal Linked Web Storage server
 */

import { createServer } from './lib/server.js';

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  port: 3126,
  host: '0.0.0.0',
  root: './data',
  logger: true
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--port' || arg === '-p') {
    options.port = parseInt(args[++i], 10);
  } else if (arg === '--host' || arg === '-h') {
    options.host = args[++i];
  } else if (arg === '--root' || arg === '-r') {
    options.root = args[++i];
  } else if (arg === '--quiet' || arg === '-q') {
    options.logger = false;
  } else if (arg === '--help') {
    console.log(`
LWS Server - Minimal Linked Web Storage

Usage:
  lws-server [options]

Options:
  -p, --port <number>     Port to listen on (default: 3126)
  -h, --host <address>    Host to bind to (default: 0.0.0.0)
  -r, --root <path>       Data directory (default: ./data)
  -q, --quiet             Disable logging
  --help                  Show this help message

Examples:
  lws-server
  lws-server --port 8080 --root /var/data
  lws-server --quiet

Environment Variables:
  DATA_ROOT              Data directory path

Documentation:
  https://github.com/linkedwebstorage/lws-server

W3C LWS Protocol:
  https://github.com/w3c/lws-protocol
`);
    process.exit(0);
  } else {
    console.error(`Unknown option: ${arg}`);
    console.error('Use --help for usage information');
    process.exit(1);
  }
}

// Create and start server
const server = createServer(options);

await server.start();

console.log(`
┌─────────────────────────────────────────┐
│  LWS Server                             │
│  Linked Web Storage                     │
├─────────────────────────────────────────┤
│  Port:   ${options.port.toString().padEnd(30)} │
│  Host:   ${options.host.padEnd(30)} │
│  Root:   ${options.root.padEnd(30)} │
└─────────────────────────────────────────┘

Server running at http://${options.host}:${options.port}

Press Ctrl+C to stop
`);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.close();
  process.exit(0);
});
