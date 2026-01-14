/**
 * HTTP headers for LWS protocol
 * Link headers, ETags, CORS
 */

/**
 * Get all headers for a response
 */
export function getAllHeaders(options = {}) {
  const {
    isContainer = false,
    etag = null,
    contentType = null,
    resourceUrl = null
  } = options;

  const headers = {};

  // Content-Type
  if (contentType) {
    headers['Content-Type'] = contentType;
  } else if (isContainer) {
    headers['Content-Type'] = 'application/ld+json';
  }

  // ETag for caching and concurrency control
  if (etag) {
    headers['ETag'] = etag;
  }

  // Link headers for LDP/LWS types
  const linkHeaders = [];

  // All resources are LDP Resources
  linkHeaders.push('<http://www.w3.org/ns/ldp#Resource>; rel="type"');

  if (isContainer) {
    linkHeaders.push('<http://www.w3.org/ns/ldp#Container>; rel="type"');
    linkHeaders.push('<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"');
  }

  if (linkHeaders.length > 0) {
    headers['Link'] = linkHeaders.join(', ');
  }

  // Accept-Post for containers
  if (isContainer) {
    headers['Accept-Post'] = '*/*';
  }

  // Allow methods
  const methods = isContainer
    ? ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    : ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'];
  headers['Allow'] = methods.join(', ');

  // CORS headers (always permissive for LWS)
  headers['Access-Control-Allow-Origin'] = '*';
  headers['Access-Control-Allow-Credentials'] = 'true';
  headers['Access-Control-Expose-Headers'] = 'Content-Length, ETag, Location, Link, Accept-Post, Allow';

  return headers;
}

/**
 * Get CORS preflight headers for OPTIONS requests
 */
export function getCorsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, HEAD, PUT, POST, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, If-Match, If-None-Match, Slug, Link',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Expose-Headers': 'Content-Length, ETag, Location, Link, Accept-Post, Allow'
  };
}

/**
 * Get headers for 404 Not Found
 */
export function getNotFoundHeaders(resourceUrl = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  return headers;
}
