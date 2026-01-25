import { mimeType } from './middleware/mime.js'
import { ldpHeaders } from './middleware/headers.js'
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
  const host = `http://${req.headers.host}`

  // Remove /storage prefix
  const resourcePath = pathname.replace(/^\/storage/, '') || '/'

  // Extract username from path (e.g., /alice/docs/file.txt → alice)
  const usernameMatch = resourcePath.match(/^\/([^/]+)/)
  const username = usernameMatch ? usernameMatch[1] : null
  const storageDescriptionPath = username ? `/storage/${username}/.description` : null

  // Calculate ACL path for this resource (containers use .acl inside, files use .acl suffix)
  const isAclResource = resourcePath.endsWith('.acl')
  const aclPath = isAclResource ? null : `/storage${resourcePath}${resourcePath.endsWith('/') ? '.acl' : '.acl'}`

  // Handle storage description resource (virtual, read-only)
  if (resourcePath.match(/^\/[^/]+\/\.description$/)) {
    // Only GET and HEAD allowed
    if (method !== 'GET' && method !== 'HEAD') {
      res.writeHead(405, {
        'Content-Type': 'application/json',
        'Allow': 'GET, HEAD'
      })
      return res.end(JSON.stringify({ error: 'Method Not Allowed' }))
    }

    const storageRoot = `${host}/storage/${username}/`
    const description = {
      '@context': 'https://www.w3.org/ns/lws/v1',
      'id': storageRoot,
      'type': 'Storage',
      'controller': `${storageRoot}profile#me`,
      'service': [{
        'type': 'StorageDescription',
        'serviceEndpoint': `${host}${storageDescriptionPath}`
      }]
    }
    const headers = {
      'Content-Type': 'application/ld+json',
      ...ldpHeaders(false, { storageDescription: storageDescriptionPath, acl: aclPath })
    }

    if (method === 'HEAD') {
      res.writeHead(200, headers)
      return res.end()
    }

    res.writeHead(200, headers)
    return res.end(JSON.stringify(description, null, 2))
  }

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
    const stat = await storage.stat(resourcePath)
    if (!stat) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Not Found' }))
    }

    // Check If-None-Match for caching
    const ifNoneMatch = req.headers['if-none-match']
    if (ifNoneMatch && ifNoneMatch === stat.etag) {
      const contentType = stat.isDirectory ? 'application/ld+json' : mimeType(resourcePath, null)
      res.writeHead(304, {
        'Content-Type': contentType,
        'ETag': stat.etag,
        'Last-Modified': stat.mtime.toUTCString(),
        ...ldpHeaders(stat.isDirectory, { storageDescription: storageDescriptionPath, acl: aclPath })
      })
      return res.end()
    }

    const resource = await storage.get(resourcePath)
    const contentType = mimeType(resourcePath, resource)
    const headers = {
      'Content-Type': contentType,
      'ETag': stat.etag,
      'Last-Modified': stat.mtime.toUTCString(),
      ...ldpHeaders(stat.isDirectory, { storageDescription: storageDescriptionPath, acl: aclPath })
    }
    res.writeHead(200, headers)
    return res.end(typeof resource === 'string' ? resource : JSON.stringify(resource, null, 2))
  }

  // HEAD - Metadata only
  if (method === 'HEAD') {
    const stat = await storage.stat(resourcePath)
    if (!stat) {
      res.writeHead(404)
      return res.end()
    }

    const contentType = stat.isDirectory ? 'application/ld+json' : mimeType(resourcePath, null)
    const headers = {
      'Content-Type': contentType,
      'ETag': stat.etag,
      'Last-Modified': stat.mtime.toUTCString(),
      ...ldpHeaders(stat.isDirectory, { storageDescription: storageDescriptionPath, acl: aclPath })
    }
    // Only include Content-Length for files (not directories)
    if (!stat.isDirectory) {
      headers['Content-Length'] = stat.size
    }
    res.writeHead(200, headers)
    return res.end()
  }

  // PUT - Create/Update resource
  if (method === 'PUT') {
    const stat = await storage.stat(resourcePath)

    // Check If-Match for concurrency control (RFC 7232)
    const ifMatch = req.headers['if-match']
    if (ifMatch) {
      if (!stat) {
        res.writeHead(412, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ error: 'Precondition Failed', reason: 'Resource does not exist' }))
      }
      if (ifMatch !== stat.etag) {
        res.writeHead(412, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ error: 'Precondition Failed', expected: ifMatch, actual: stat.etag }))
      }
    }

    // Check If-None-Match to prevent overwrite
    const ifNoneMatch = req.headers['if-none-match']
    if (ifNoneMatch === '*' && stat) {
      res.writeHead(412, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Resource already exists' }))
    }

    const body = await parseBody(req)
    await storage.put(resourcePath, body, agent)

    const newStat = await storage.stat(resourcePath)
    const statusCode = stat ? 204 : 201
    const headers = {
      'ETag': newStat.etag,
      'Location': `/storage${resourcePath}`,
      'Last-Modified': newStat.mtime.toUTCString(),
      ...ldpHeaders(newStat.isDirectory, { storageDescription: storageDescriptionPath, acl: aclPath })
    }
    res.writeHead(statusCode, headers)
    return res.end()
  }

  // DELETE - Remove resource
  if (method === 'DELETE') {
    const stat = await storage.stat(resourcePath)
    if (!stat) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Not Found' }))
    }

    // Check If-Match for concurrency control
    const ifMatch = req.headers['if-match']
    if (ifMatch && ifMatch !== stat.etag) {
      res.writeHead(412, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Precondition Failed' }))
    }

    await storage.delete(resourcePath)
    res.writeHead(204, ldpHeaders(stat.isDirectory, { storageDescription: storageDescriptionPath, acl: aclPath }))
    return res.end()
  }

  // PATCH - Partial update (JSON Merge Patch)
  if (method === 'PATCH') {
    // Validate Content-Type (case-insensitive per RFC)
    const contentTypeHeader = req.headers['content-type'] || ''
    const mediaType = contentTypeHeader.split(';')[0].trim().toLowerCase()
    if (mediaType !== 'application/merge-patch+json') {
      res.writeHead(415, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({
        error: 'Unsupported Media Type',
        supported: ['application/merge-patch+json']
      }))
    }

    const stat = await storage.stat(resourcePath)

    // Can't PATCH non-existent resource
    if (!stat) {
      res.writeHead(409, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Conflict', reason: 'Resource does not exist' }))
    }

    // Can't PATCH containers
    if (stat.isDirectory) {
      res.writeHead(409, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Conflict', reason: 'Cannot PATCH containers' }))
    }

    // Check If-Match for concurrency control
    const ifMatch = req.headers['if-match']
    if (ifMatch && ifMatch !== stat.etag) {
      res.writeHead(412, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Precondition Failed', expected: ifMatch, actual: stat.etag }))
    }

    const patchData = await parseBody(req)

    // Reject invalid JSON (parseBody returns string on parse failure)
    if (typeof patchData === 'string') {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Bad Request', reason: 'Invalid JSON in request body' }))
    }
    const result = await storage.patch(resourcePath, patchData, agent)

    if (result === null) {
      res.writeHead(409, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Conflict', reason: 'Patch failed' }))
    }

    const newStat = await storage.stat(resourcePath)
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'ETag': newStat.etag,
      'Last-Modified': newStat.mtime.toUTCString(),
      ...ldpHeaders(false, { storageDescription: storageDescriptionPath, acl: aclPath })
    })
    const updated = await storage.get(resourcePath)
    return res.end(JSON.stringify(updated, null, 2))
  }

  // POST - Append/Create in container
  if (method === 'POST') {
    const body = await parseBody(req)

    // Get Slug header for suggested name
    const slug = req.headers.slug || null

    // Check Link header for container creation
    const linkHeader = req.headers.link || ''
    const isContainer = linkHeader.includes('Container') || linkHeader.includes('BasicContainer')

    const newPath = await storage.post(resourcePath, body, agent, { slug, isContainer })
    const newStat = await storage.stat(newPath)
    res.writeHead(201, {
      'Content-Type': 'application/json',
      'Location': `/storage${newPath}`,
      'ETag': newStat?.etag,
      'Last-Modified': newStat?.mtime?.toUTCString(),
      ...ldpHeaders(newStat?.isDirectory || false, { storageDescription: storageDescriptionPath, acl: aclPath })
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
