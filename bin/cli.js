#!/usr/bin/env node
import { createServer } from '../src/server.js'

const args = process.argv.slice(2)
const options = {}

// Simple arg parsing
for (let i = 0; i < args.length; i++) {
  if (args[i] === '-p' || args[i] === '--port') {
    options.port = parseInt(args[++i])
  } else if (args[i] === '-d' || args[i] === '--data') {
    options.dataDir = args[++i]
  } else if (args[i] === '-h' || args[i] === '--help') {
    console.log(`
lws-server v0.0.2 - Linked Web Storage Server

Usage: lws-server [options]

Options:
  -p, --port <port>    Port to listen on (default: 3456, or LWS_PORT env)
  -d, --data <dir>     Data directory (default: ./data, or LWS_DATA_DIR env)
  -h, --help           Show this help

Examples:
  lws-server                    # Start on port 3456
  lws-server -p 8080            # Start on port 8080
  lws-server -d /var/lws/data   # Use custom data directory

Quick Start:
  1. Start server:  lws-server
  2. Register:      curl -X POST http://localhost:3456/auth/register -d '{"username":"alice"}'
  3. Get token:     curl -X POST http://localhost:3456/auth/token -d '{"username":"alice","secret":"<secret>"}'
  4. Write data:    curl -X PUT http://localhost:3456/storage/alice/hello.json -H "Authorization: Bearer <token>" -d '{"hello":"world"}'
  5. Read data:     curl http://localhost:3456/storage/alice/hello.json
`)
    process.exit(0)
  }
}

createServer(options).listen()
