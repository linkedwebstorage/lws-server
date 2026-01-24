import { mimeType } from './middleware/mime.js'
import { renderHomePage } from './views/index.js'

export async function router(req, res) {
  const { pathname } = req
  const { storage, authz, agent } = req
  const host = `http://${req.headers.host}`

  // Home page - serve HTML
  if (pathname === '/' && req.method === 'GET') {
    // Check Accept header - return JSON for API clients
    const accept = req.headers.accept || ''
    if (accept.includes('application/json') && !accept.includes('text/html')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({
        name: 'lws-server',
        version: '0.0.2',
        description: 'Linked Web Storage Server',
        endpoints: {
          storage: '/storage/',
          auth: '/auth/',
          '.well-known': '/.well-known/'
        }
      }, null, 2))
    }

    // Return HTML for browsers
    const html = renderHomePage({ host, port: 3456, version: '0.0.2' })
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end(html)
  }

  // Well-known endpoints
  if (pathname === '/.well-known/lws') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({
      '@context': 'https://www.w3.org/ns/lws',
      storage: '/storage/',
      authn: '/auth/',
      type: 'LWSServer'
    }, null, 2))
  }

  // Auth endpoints
  if (pathname.startsWith('/auth/')) {
    return handleAuth(req, res)
  }

  // Storage endpoints
  if (pathname.startsWith('/storage/')) {
    return handleStorage(req, res)
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not Found' }))
}

async function handleAuth(req, res) {
  const { pathname } = req
  const { authn, storage } = req

  // Register new identity
  if (pathname === '/auth/register' && req.method === 'POST') {
    const body = await parseBody(req)
    try {
      const result = await authn.register(body.username)
      res.writeHead(201, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(result, null, 2))
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: err.message }))
    }
  }

  // Get token (simple token exchange)
  if (pathname === '/auth/token' && req.method === 'POST') {
    const body = await parseBody(req)
    try {
      const result = await authn.createToken(body.username, body.secret)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(result, null, 2))
    } catch (err) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: err.message }))
    }
  }

  // Who am I?
  if (pathname === '/auth/me' && req.method === 'GET') {
    if (!req.agent) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Not authenticated' }))
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ agent: req.agent }, null, 2))
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Auth endpoint not found' }))
}

async function handleStorage(req, res) {
  const { pathname, method } = req
  const { storage, authz, agent } = req
  
  // Remove /storage prefix
  const resourcePath = pathname.replace(/^\/storage/, '') || '/'

  // Check authorization
  const canAccess = await authz.check(agent, resourcePath, method)
  if (!canAccess) {
    res.writeHead(agent ? 403 : 401, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ 
      error: agent ? 'Forbidden' : 'Unauthorized',
      agent: agent || null,
      resource: resourcePath,
      action: method
    }))
  }

  // GET - Read resource
  if (method === 'GET') {
    const resource = await storage.get(resourcePath)
    if (!resource) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Not Found' }))
    }
    const contentType = mimeType(resourcePath, resource)
    res.writeHead(200, { 'Content-Type': contentType })
    return res.end(typeof resource === 'string' ? resource : JSON.stringify(resource, null, 2))
  }

  // PUT - Create/Update resource
  if (method === 'PUT') {
    const body = await parseBody(req)
    await storage.put(resourcePath, body, agent)
    res.writeHead(201, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ created: resourcePath }))
  }

  // DELETE - Remove resource
  if (method === 'DELETE') {
    await storage.delete(resourcePath)
    res.writeHead(204)
    return res.end()
  }

  // POST - Append/Create in container
  if (method === 'POST') {
    const body = await parseBody(req)
    const newPath = await storage.post(resourcePath, body, agent)
    res.writeHead(201, { 
      'Content-Type': 'application/json',
      'Location': `/storage${newPath}`
    })
    return res.end(JSON.stringify({ created: newPath }))
  }

  res.writeHead(405, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Method Not Allowed' }))
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        resolve(body)
      }
    })
    req.on('error', reject)
  })
}
