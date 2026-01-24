import http from 'node:http'
import { cors } from './middleware/cors.js'
import { mimeType } from './middleware/mime.js'
import { Storage } from './storage/index.js'
import { Authn } from './authn/index.js'
import { Authz } from './authz/index.js'
import { router } from './router.js'

const DEFAULT_PORT = 3456
const DEFAULT_DATA_DIR = './data'

export function createServer(options = {}) {
  const port = options.port || process.env.LWS_PORT || DEFAULT_PORT
  const dataDir = options.dataDir || process.env.LWS_DATA_DIR || DEFAULT_DATA_DIR

  const storage = new Storage(dataDir)
  const authn = new Authn(storage)
  const authz = new Authz(storage)

  const server = http.createServer(async (req, res) => {
    // Add CORS headers
    cors(req, res)

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    // Parse URL
    const url = new URL(req.url, `http://${req.headers.host}`)
    req.pathname = url.pathname
    req.query = Object.fromEntries(url.searchParams)

    // Attach services to request
    req.storage = storage
    req.authn = authn
    req.authz = authz

    // Authenticate (if token provided)
    req.agent = await authn.authenticate(req)

    try {
      await router(req, res)
    } catch (err) {
      console.error('Error:', err)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal Server Error' }))
    }
  })

  return {
    server,
    storage,
    authn,
    authz,
    listen: () => {
      server.listen(port, () => {
        console.log(`🔗 LWS Server v0.0.2`)
        console.log(`   http://localhost:${port}`)
        console.log(`   Data: ${dataDir}`)
      })
      return server
    }
  }
}

// Run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createServer().listen()
}
