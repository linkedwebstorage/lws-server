# LWS Server

**Minimal Linked Web Storage Server**

A lightweight, standalone implementation of the [W3C Linked Web Storage (LWS) protocol](https://github.com/w3c/lws-protocol) in JavaScript.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

## Features

- ✅ **Core LWS Protocol** - GET, PUT, POST, DELETE, OPTIONS, HEAD
- ✅ **ETag Support** - Concurrency control with If-Match/If-None-Match
- ✅ **CORS Enabled** - Cross-origin resource sharing
- ✅ **Link Headers** - LDP/LWS type headers
- ✅ **Container Support** - Hierarchical storage with POST creation
- ✅ **Minimal Dependencies** - Only 3 runtime dependencies
- ✅ **Fast Startup** - < 100ms startup time
- ✅ **Small Footprint** - ~1000 LOC, < 5MB node_modules
- ✅ **Embeddable** - Use as Node.js module
- ✅ **Zero Config** - Works out of the box

## Installation

### Global Installation (CLI)

```bash
npm install -g lws-server
lws-server --port 3000
```

### Local Installation (Library)

```bash
npm install lws-server
```

## Quick Start

### CLI Usage

```bash
# Start server on default port 3000
lws-server

# Custom port and data directory
lws-server --port 8080 --root /var/data

# Quiet mode (no logging)
lws-server --quiet
```

### CLI Options

```
-p, --port <number>     Port to listen on (default: 3000)
-h, --host <address>    Host to bind to (default: 0.0.0.0)
-r, --root <path>       Data directory (default: ./data)
-q, --quiet             Disable logging
--help                  Show help message
```

### Programmatic Usage

```javascript
import { createServer } from 'lws-server';

const server = createServer({
  port: 3000,
  root: './data',
  logger: true
});

await server.start();
console.log('LWS server running');
```

## HTTP API

### Create Resource (PUT)

```bash
curl -X PUT http://localhost:3000/data.json \
  -H "Content-Type: application/json" \
  -d '{"hello": "world"}'
```

### Create Resource (POST)

```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Slug: my-resource" \
  -d '{"created": "via POST"}'
```

### Read Resource

```bash
curl http://localhost:3000/data.json
```

### Update Resource

```bash
curl -X PUT http://localhost:3000/data.json \
  -H "Content-Type: application/json" \
  -d '{"updated": true}'
```

### Delete Resource

```bash
curl -X DELETE http://localhost:3000/data.json
```

### List Container

```bash
curl http://localhost:3000/
```

Returns JSON-LD:
```json
{
  "@context": {
    "@vocab": "http://www.w3.org/ns/ldp#",
    "contains": {
      "@id": "http://www.w3.org/ns/ldp#contains",
      "@type": "@id"
    }
  },
  "@id": "http://localhost:3000/",
  "@type": ["Container", "BasicContainer", "Resource"],
  "contains": [
    { "@id": "http://localhost:3000/data.json" }
  ]
}
```

### Create Container

```bash
curl -X POST http://localhost:3000/ \
  -H "Slug: my-folder" \
  -H "Link: <http://www.w3.org/ns/ldp#BasicContainer>; rel=\"type\""
```

## Concurrency Control

### Safe Updates with If-Match

```bash
# Get current ETag
ETAG=$(curl -sI http://localhost:3000/data.json | grep -i etag | awk '{print $2}')

# Update only if ETag matches
curl -X PUT http://localhost:3000/data.json \
  -H "If-Match: $ETAG" \
  -H "Content-Type: application/json" \
  -d '{"safe": "update"}'
```

### Prevent Overwrites with If-None-Match

```bash
# Create only if doesn't exist
curl -X PUT http://localhost:3000/new.json \
  -H "If-None-Match: *" \
  -H "Content-Type: application/json" \
  -d '{"create": "only"}'
```

## Response Headers

All responses include LWS/LDP headers:

```
Link: <http://www.w3.org/ns/ldp#Resource>; rel="type"
Link: <http://www.w3.org/ns/ldp#Container>; rel="type"
ETag: "1704963600000-42"
Access-Control-Allow-Origin: *
Allow: GET, HEAD, PUT, POST, DELETE, OPTIONS
```

## Architecture

### File Structure

```
lws-server/
├── index.js              # CLI entry point
├── lib/
│   ├── server.js         # Fastify setup
│   ├── handlers.js       # HTTP method handlers
│   ├── storage.js        # Filesystem operations
│   └── headers.js        # LWS/LDP headers
└── test/
    └── lws.test.js      # Integration tests
```

### Dependencies

```json
{
  "fastify": "^5.2.0",
  "@fastify/cors": "^10.0.1",
  "fs-extra": "^11.2.0"
}
```

**Total:** 3 runtime dependencies (~150 packages with dependencies)

**Compare to full-featured servers:**
- JavaScriptSolidServer: 22 direct dependencies
- Solid Community Server: 80+ dependencies

## Use Cases

### 1. Development & Testing

Lightweight server for testing LWS clients:

```javascript
import { createServer } from 'lws-server';

const server = createServer({ logger: false, port: 0 });
await server.listen({ port: 0 });

// Run tests against server
// ...

await server.close();
```

### 2. Embedding in Applications

```javascript
import express from 'express';
import { createServer } from 'lws-server';

const app = express();

// Mount LWS server at /storage
const lws = createServer({ root: './storage' });
app.use('/storage', lws);

app.listen(3000);
```

### 3. Microservices

Use as lightweight storage layer:

```javascript
// service.js
import { createServer } from 'lws-server';

const storage = createServer({
  port: 8080,
  root: process.env.DATA_DIR,
  logger: false
});

await storage.start();
```

### 4. Education

Learn LWS protocol without complex features:

```bash
git clone https://github.com/linkedwebstorage/lws-server
cd lws-server
npm install
node index.js
```

Then explore `lib/handlers.js` (~300 LOC) to understand LWS operations.

## Comparison

| Feature | lws-server | JSS | Solid Community Server |
|---------|-----------|-----|----------------------|
| **LOC** | ~1000 | ~8000 | ~20000+ |
| **Dependencies** | 3 | 22 | 80+ |
| **Startup** | < 100ms | ~500ms | ~2s |
| **Memory** | ~30MB | ~150MB | ~300MB |
| **Protocols** | LWS | LDP, LWS, OIDC, AP, Nostr | LDP, Solid-OIDC |
| **Auth** | None | 5 methods | Solid-OIDC |
| **Features** | CRUD only | 20+ | Full Solid spec |
| **Best For** | Embedding, testing | Multi-protocol pods | Production Solid |

## What's NOT Included

This is a **minimal** server. Not included:

- ❌ Authentication/Authorization (no login, tokens, or ACLs)
- ❌ Solid-OIDC
- ❌ Content negotiation (Turtle ↔ JSON-LD)
- ❌ N3 Patch or SPARQL Update
- ❌ WebSocket notifications
- ❌ Storage quotas
- ❌ Multi-user account management

**For full-featured servers, see:**
- [JavaScriptSolidServer](https://github.com/JavaScriptSolidServer/JavaScriptSolidServer)
- [Solid Community Server](https://github.com/CommunitySolidServer/CommunitySolidServer)

## Testing

```bash
npm install
npm test
```

Tests use Node.js built-in test runner (no external dependencies).

## Environment Variables

```bash
DATA_ROOT=/var/data  # Data directory path
```

## LWS Protocol Compliance

This server implements:

- ✅ **GET** - Read resources and containers
- ✅ **PUT** - Create or update resources
- ✅ **POST** - Create resources with server-assigned URIs
- ✅ **DELETE** - Remove resources
- ✅ **HEAD** - Get metadata without body
- ✅ **OPTIONS** - CORS preflight
- ✅ **ETags** - Concurrency control
- ✅ **Link headers** - Resource type metadata

**Status:** Implements core CRUD operations per [LWS Protocol PR #37](https://github.com/w3c/lws-protocol/pull/37).

**Not implemented** (future LWS features):
- ⚠️ Linkset endpoints (`/resource;linkset`)
- ⚠️ JSON Merge Patch for metadata

## Related Projects

- [W3C LWS Protocol](https://github.com/w3c/lws-protocol) - Specification
- [JavaScriptSolidServer](https://github.com/JavaScriptSolidServer/JavaScriptSolidServer) - Full-featured LDP/LWS/Solid server
- [Solid Protocol](https://solidproject.org/TR/protocol) - Solid specification

## Contributing

Contributions welcome! This project aims to stay **minimal** - only core LWS protocol features.

**Guidelines:**
- Keep total LOC < 1500
- Keep dependencies < 5 runtime deps
- No authentication (out of scope)
- No content negotiation (out of scope)

## License

AGPL-3.0 © Melvin Carvalho

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

## Acknowledgments

Extracted and simplified from [JavaScriptSolidServer](https://github.com/JavaScriptSolidServer/JavaScriptSolidServer).

Built for the [W3C Linked Web Storage](https://github.com/w3c/lws-protocol) community.
