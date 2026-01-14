/**
 * LWS Server using Fastify
 * Minimal Linked Web Storage implementation
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { handleGet, handleHead, handlePut, handlePost, handleDelete, handleOptions } from './handlers.js';

/**
 * Create and configure LWS server
 * @param {object} options - Server options
 * @param {boolean} options.logger - Enable logging (default true)
 * @param {number} options.port - Port to listen on (default 3000)
 * @param {string} options.host - Host to bind to (default '0.0.0.0')
 * @param {string} options.root - Data directory path (default './data')
 */
export function createServer(options = {}) {
  const logger = options.logger ?? true;
  const port = options.port ?? 3000;
  const host = options.host ?? '0.0.0.0';

  // Set data root via environment variable
  if (options.root) {
    process.env.DATA_ROOT = options.root;
  }

  // Create Fastify instance
  const fastify = Fastify({
    logger,
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024 // 10MB
  });

  // Add raw body parser for all content types
  fastify.addContentTypeParser('*', { parseAs: 'buffer' }, (req, body, done) => {
    done(null, body);
  });

  // Register CORS plugin (permissive for LWS)
  fastify.register(cors, {
    origin: '*',
    credentials: true,
    exposedHeaders: ['Content-Length', 'ETag', 'Location', 'Link', 'Accept-Post', 'Allow']
  });

  // Route all HTTP methods to handlers
  fastify.get('/*', handleGet);
  fastify.head('/*', handleHead);
  fastify.put('/*', handlePut);
  fastify.post('/*', handlePost);
  fastify.delete('/*', handleDelete);
  fastify.options('/*', handleOptions);

  // Add convenience method to start server
  fastify.start = async () => {
    try {
      await fastify.listen({ port, host });
      return fastify;
    } catch (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  };

  return fastify;
}
