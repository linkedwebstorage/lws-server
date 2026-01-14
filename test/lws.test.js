/**
 * LWS Server Tests
 * Basic CRUD operation tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../lib/server.js';

describe('LWS Server', () => {
  let server;
  let baseUrl;

  before(async () => {
    // Start test server
    server = createServer({
      logger: false,
      port: 0, // Random port
      root: './test-data'
    });

    await server.listen({ port: 0, host: '127.0.0.1' });
    const address = server.server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await server.close();
  });

  describe('GET', () => {
    it('should return 404 for non-existent resource', async () => {
      const res = await fetch(`${baseUrl}/nonexistent.json`);
      assert.strictEqual(res.status, 404);
    });

    it('should return root container listing', async () => {
      const res = await fetch(`${baseUrl}/`);
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get('Link').includes('Container'));
    });
  });

  describe('PUT', () => {
    it('should create new resource', async () => {
      const res = await fetch(`${baseUrl}/test.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });

      assert.strictEqual(res.status, 201);
      assert.ok(res.headers.get('Location'));
    });

    it('should update existing resource', async () => {
      // Create
      await fetch(`${baseUrl}/update-me.txt`, {
        method: 'PUT',
        body: 'original'
      });

      // Update
      const res = await fetch(`${baseUrl}/update-me.txt`, {
        method: 'PUT',
        body: 'updated'
      });

      assert.strictEqual(res.status, 204);

      // Verify
      const verify = await fetch(`${baseUrl}/update-me.txt`);
      const content = await verify.text();
      assert.strictEqual(content, 'updated');
    });

    it('should return ETag header', async () => {
      await fetch(`${baseUrl}/etag-test.txt`, {
        method: 'PUT',
        body: 'test content'
      });

      const res = await fetch(`${baseUrl}/etag-test.txt`);
      assert.ok(res.headers.get('ETag'));
    });
  });

  describe('POST', () => {
    it('should create resource in container with Slug', async () => {
      const res = await fetch(`${baseUrl}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Slug': 'posted-resource'
        },
        body: JSON.stringify({ posted: true })
      });

      assert.strictEqual(res.status, 201);
      const location = res.headers.get('Location');
      assert.ok(location);
      assert.ok(location.includes('posted-resource'));
    });

    it('should create container with Link header', async () => {
      const res = await fetch(`${baseUrl}/`, {
        method: 'POST',
        headers: {
          'Slug': 'new-container',
          'Link': '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"'
        }
      });

      assert.strictEqual(res.status, 201);
      const location = res.headers.get('Location');
      assert.ok(location.endsWith('/'));
    });
  });

  describe('DELETE', () => {
    it('should delete resource', async () => {
      // Create
      await fetch(`${baseUrl}/to-delete.txt`, {
        method: 'PUT',
        body: 'delete me'
      });

      // Delete
      const res = await fetch(`${baseUrl}/to-delete.txt`, {
        method: 'DELETE'
      });

      assert.strictEqual(res.status, 204);

      // Verify deleted
      const verify = await fetch(`${baseUrl}/to-delete.txt`);
      assert.strictEqual(verify.status, 404);
    });
  });

  describe('OPTIONS', () => {
    it('should return CORS headers', async () => {
      const res = await fetch(`${baseUrl}/`, {
        method: 'OPTIONS',
        headers: { 'Origin': 'https://app.example.com' }
      });

      assert.strictEqual(res.status, 204);
      assert.ok(res.headers.get('Access-Control-Allow-Origin'));
      assert.ok(res.headers.get('Access-Control-Allow-Methods'));
    });
  });

  describe('Concurrency Control', () => {
    it('should support If-Match for safe updates', async () => {
      // Create resource
      await fetch(`${baseUrl}/concurrency.txt`, {
        method: 'PUT',
        body: 'version 1'
      });

      // Get ETag
      const get1 = await fetch(`${baseUrl}/concurrency.txt`);
      const etag = get1.headers.get('ETag');

      // Update with correct ETag (should succeed)
      const update1 = await fetch(`${baseUrl}/concurrency.txt`, {
        method: 'PUT',
        headers: { 'If-Match': etag },
        body: 'version 2'
      });
      assert.strictEqual(update1.status, 204);

      // Try to update with old ETag (should fail)
      const update2 = await fetch(`${baseUrl}/concurrency.txt`, {
        method: 'PUT',
        headers: { 'If-Match': etag }, // Old ETag
        body: 'version 3'
      });
      assert.strictEqual(update2.status, 412);
    });
  });
});
