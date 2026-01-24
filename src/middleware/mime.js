const MIME_TYPES = {
  '.json': 'application/json',
  '.jsonld': 'application/ld+json',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttl': 'text/turtle',
  '.rdf': 'application/rdf+xml'
}

export function mimeType(path, content) {
  // Check file extension
  const ext = path.match(/\.[^.]+$/)?.[0]?.toLowerCase()
  if (ext && MIME_TYPES[ext]) return MIME_TYPES[ext]
  
  // Default to JSON for objects, plain text otherwise
  if (typeof content === 'object') return 'application/json'
  return 'text/plain'
}
