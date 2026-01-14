/**
 * HTTP method handlers for LWS protocol
 * Simplified CRUD operations without auth or content negotiation
 */

import * as storage from './storage.js';
import { getAllHeaders, getCorsHeaders, getNotFoundHeaders } from './headers.js';

/**
 * Check if path is a container (ends with /)
 */
function isContainer(path) {
  return path.endsWith('/');
}

/**
 * Get content type from file extension
 */
function getContentType(filePath) {
  if (filePath.endsWith('.json') || filePath.endsWith('.jsonld')) {
    return 'application/ld+json';
  }
  if (filePath.endsWith('.ttl')) {
    return 'text/turtle';
  }
  if (filePath.endsWith('.html')) {
    return 'text/html';
  }
  if (filePath.endsWith('.txt')) {
    return 'text/plain';
  }
  return 'application/octet-stream';
}

/**
 * Generate container listing as JSON-LD
 */
function generateContainerListing(resourceUrl, entries) {
  const contains = entries.map(entry => {
    const url = resourceUrl + entry.name + (entry.isDirectory ? '/' : '');
    return { '@id': url };
  });

  return {
    '@context': {
      '@vocab': 'http://www.w3.org/ns/ldp#',
      'contains': { '@id': 'http://www.w3.org/ns/ldp#contains', '@type': '@id' }
    },
    '@id': resourceUrl,
    '@type': ['Container', 'BasicContainer', 'Resource'],
    'contains': contains
  };
}

/**
 * Check If-Match header for concurrency control
 */
function checkIfMatch(ifMatch, currentEtag) {
  if (!ifMatch) return { ok: true };
  if (!currentEtag) return { ok: false, status: 412, error: 'Precondition Failed' };

  // Remove quotes from ETag if present
  const etag = currentEtag.replace(/^"(.+)"$/, '$1');
  const match = ifMatch.replace(/^"(.+)"$/, '$1');

  if (match !== etag && match !== '*') {
    return { ok: false, status: 412, error: 'Precondition Failed' };
  }

  return { ok: true };
}

/**
 * Check If-None-Match header
 */
function checkIfNoneMatch(ifNoneMatch, currentEtag) {
  if (!ifNoneMatch) return { ok: true };

  if (ifNoneMatch === '*' && currentEtag) {
    return { ok: false, status: 412, error: 'Resource already exists' };
  }

  return { ok: true };
}

/**
 * Handle GET request
 */
export async function handleGet(request, reply) {
  const urlPath = request.url.split('?')[0];
  const stats = await storage.stat(urlPath);

  if (!stats) {
    const headers = getNotFoundHeaders();
    Object.entries(headers).forEach(([k, v]) => reply.header(k, v));
    return reply.code(404).send({ error: 'Not Found' });
  }

  const resourceUrl = `${request.protocol}://${request.hostname}${urlPath}`;

  // Handle container
  if (stats.isDirectory) {
    const entries = await storage.listContainer(urlPath);
    const listing = generateContainerListing(resourceUrl, entries || []);

    const headers = getAllHeaders({
      isContainer: true,
      etag: stats.etag,
      resourceUrl
    });

    Object.entries(headers).forEach(([k, v]) => reply.header(k, v));
    return reply.send(listing);
  }

  // Handle resource
  const content = await storage.read(urlPath);
  if (content === null) {
    return reply.code(500).send({ error: 'Read error' });
  }

  const contentType = getContentType(urlPath);
  const headers = getAllHeaders({
    isContainer: false,
    etag: stats.etag,
    contentType,
    resourceUrl
  });

  Object.entries(headers).forEach(([k, v]) => reply.header(k, v));
  return reply.send(content);
}

/**
 * Handle HEAD request
 */
export async function handleHead(request, reply) {
  const urlPath = request.url.split('?')[0];
  const stats = await storage.stat(urlPath);

  if (!stats) {
    const headers = getNotFoundHeaders();
    Object.entries(headers).forEach(([k, v]) => reply.header(k, v));
    return reply.code(404).send();
  }

  const resourceUrl = `${request.protocol}://${request.hostname}${urlPath}`;
  const contentType = stats.isDirectory ? null : getContentType(urlPath);

  const headers = getAllHeaders({
    isContainer: stats.isDirectory,
    etag: stats.etag,
    contentType,
    resourceUrl
  });

  if (!stats.isDirectory) {
    headers['Content-Length'] = stats.size;
  }

  Object.entries(headers).forEach(([k, v]) => reply.header(k, v));
  return reply.code(200).send();
}

/**
 * Handle PUT request (create or update)
 */
export async function handlePut(request, reply) {
  const urlPath = request.url.split('?')[0];
  const resourceUrl = `${request.protocol}://${request.hostname}${urlPath}`;

  // Handle container creation via PUT
  if (isContainer(urlPath)) {
    const stats = await storage.stat(urlPath);
    if (stats?.isDirectory) {
      return reply.code(409).send({ error: 'Cannot PUT to existing container' });
    }

    const success = await storage.createContainer(urlPath);
    if (!success) {
      return reply.code(500).send({ error: 'Failed to create container' });
    }

    const headers = getAllHeaders({ isContainer: true });
    headers['Location'] = resourceUrl;
    Object.entries(headers).forEach(([k, v]) => reply.header(k, v));
    return reply.code(201).send();
  }

  // Check if resource exists
  const stats = await storage.stat(urlPath);
  const existed = stats !== null;
  const currentEtag = stats?.etag || null;

  // Check If-Match header
  const ifMatch = request.headers['if-match'];
  if (ifMatch) {
    const check = checkIfMatch(ifMatch, currentEtag);
    if (!check.ok) {
      return reply.code(check.status).send({ error: check.error });
    }
  }

  // Check If-None-Match header
  const ifNoneMatch = request.headers['if-none-match'];
  if (ifNoneMatch) {
    const check = checkIfNoneMatch(ifNoneMatch, currentEtag);
    if (!check.ok) {
      return reply.code(check.status).send({ error: check.error });
    }
  }

  // Get content from request body
  let content = request.body;
  if (Buffer.isBuffer(content)) {
    // Already a buffer
  } else if (typeof content === 'string') {
    content = Buffer.from(content);
  } else if (content && typeof content === 'object') {
    content = Buffer.from(JSON.stringify(content));
  } else {
    content = Buffer.from('');
  }

  const success = await storage.write(urlPath, content);
  if (!success) {
    return reply.code(500).send({ error: 'Write failed' });
  }

  const headers = getAllHeaders({ isContainer: false, resourceUrl });
  headers['Location'] = resourceUrl;

  Object.entries(headers).forEach(([k, v]) => reply.header(k, v));
  return reply.code(existed ? 204 : 201).send();
}

/**
 * Handle POST request (create in container)
 */
export async function handlePost(request, reply) {
  const urlPath = request.url.split('?')[0];

  // Ensure target is a container
  if (!isContainer(urlPath)) {
    return reply.code(405).send({ error: 'POST only allowed on containers' });
  }

  // Check container exists
  const stats = await storage.stat(urlPath);
  if (!stats || !stats.isDirectory) {
    // Create container if it doesn't exist
    await storage.createContainer(urlPath);
  }

  // Get slug from header or generate UUID
  const slug = request.headers.slug;
  const linkHeader = request.headers.link || '';

  // Check if creating a container
  const isCreatingContainer = linkHeader.includes('Container') || linkHeader.includes('BasicContainer');

  // Generate unique filename
  const filename = await storage.generateUniqueFilename(urlPath, slug, isCreatingContainer);
  const newUrlPath = urlPath + filename + (isCreatingContainer ? '/' : '');
  const resourceUrl = `${request.protocol}://${request.hostname}${newUrlPath}`;

  let success;
  if (isCreatingContainer) {
    success = await storage.createContainer(newUrlPath);
  } else {
    // Get content from request body
    let content = request.body;
    if (Buffer.isBuffer(content)) {
      // Already a buffer
    } else if (typeof content === 'string') {
      content = Buffer.from(content);
    } else if (content && typeof content === 'object') {
      content = Buffer.from(JSON.stringify(content));
    } else {
      content = Buffer.from('');
    }

    success = await storage.write(newUrlPath, content);
  }

  if (!success) {
    return reply.code(500).send({ error: 'Create failed' });
  }

  const headers = getAllHeaders({ isContainer: isCreatingContainer });
  headers['Location'] = resourceUrl;

  Object.entries(headers).forEach(([k, v]) => reply.header(k, v));
  return reply.code(201).send();
}

/**
 * Handle DELETE request
 */
export async function handleDelete(request, reply) {
  const urlPath = request.url.split('?')[0];

  // Check if resource exists
  const stats = await storage.stat(urlPath);
  if (!stats) {
    const headers = getNotFoundHeaders();
    Object.entries(headers).forEach(([k, v]) => reply.header(k, v));
    return reply.code(404).send({ error: 'Not Found' });
  }

  // Check If-Match header
  const ifMatch = request.headers['if-match'];
  if (ifMatch) {
    const check = checkIfMatch(ifMatch, stats.etag);
    if (!check.ok) {
      return reply.code(check.status).send({ error: check.error });
    }
  }

  const success = await storage.remove(urlPath);
  if (!success) {
    return reply.code(500).send({ error: 'Delete failed' });
  }

  const headers = getAllHeaders({ isContainer: false });
  Object.entries(headers).forEach(([k, v]) => reply.header(k, v));
  return reply.code(204).send();
}

/**
 * Handle OPTIONS request
 */
export async function handleOptions(request, reply) {
  const urlPath = request.url.split('?')[0];
  const stats = await storage.stat(urlPath);

  const origin = request.headers.origin || '*';
  const headers = getAllHeaders({ isContainer: stats?.isDirectory || isContainer(urlPath) });

  // Add CORS preflight headers
  const corsHeaders = getCorsHeaders(origin);
  Object.entries(corsHeaders).forEach(([k, v]) => headers[k] = v);

  Object.entries(headers).forEach(([k, v]) => reply.header(k, v));
  return reply.code(204).send();
}
