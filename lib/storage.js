/**
 * Filesystem storage backend for LWS
 * Simplified from JavaScriptSolidServer
 */

import fs from 'fs-extra';
import { createHash } from 'crypto';
import path from 'path';

const DATA_ROOT = process.env.DATA_ROOT || './data';

/**
 * Initialize storage - ensure DATA_ROOT exists
 */
export async function init() {
  await fs.ensureDir(DATA_ROOT);
}

/**
 * Get file stats including ETag
 */
export async function stat(filePath) {
  const fullPath = path.join(DATA_ROOT, filePath);

  try {
    const stats = await fs.stat(fullPath);

    // Generate ETag from mtime and size
    const etag = `"${stats.mtime.getTime()}-${stats.size}"`;

    return {
      isDirectory: stats.isDirectory(),
      size: stats.size,
      mtime: stats.mtime,
      birthtime: stats.birthtime,
      etag
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Check if file/directory exists
 */
export async function exists(filePath) {
  const fullPath = path.join(DATA_ROOT, filePath);
  return await fs.pathExists(fullPath);
}

/**
 * Read file contents
 */
export async function read(filePath) {
  const fullPath = path.join(DATA_ROOT, filePath);

  try {
    return await fs.readFile(fullPath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Write file contents
 */
export async function write(filePath, content) {
  const fullPath = path.join(DATA_ROOT, filePath);

  try {
    // Ensure parent directory exists
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content);
    return true;
  } catch (err) {
    console.error('Write error:', err);
    return false;
  }
}

/**
 * Delete file or directory
 */
export async function remove(filePath) {
  const fullPath = path.join(DATA_ROOT, filePath);

  try {
    await fs.remove(fullPath);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

/**
 * Create directory (container)
 */
export async function createContainer(filePath) {
  const fullPath = path.join(DATA_ROOT, filePath);

  try {
    await fs.ensureDir(fullPath);
    return true;
  } catch (err) {
    console.error('Create container error:', err);
    return false;
  }
}

/**
 * List container contents
 */
export async function listContainer(filePath) {
  const fullPath = path.join(DATA_ROOT, filePath);

  try {
    const entries = await fs.readdir(fullPath);
    const results = [];

    for (const entry of entries) {
      // Skip hidden files except .well-known
      if (entry.startsWith('.') && entry !== '.well-known') {
        continue;
      }

      const entryPath = path.join(fullPath, entry);
      const stats = await fs.stat(entryPath);

      results.push({
        name: entry,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        mtime: stats.mtime
      });
    }

    return results;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Generate unique filename for POST requests
 */
export async function generateUniqueFilename(containerPath, slug, isContainer) {
  const fullPath = path.join(DATA_ROOT, containerPath);

  // Sanitize slug
  const baseName = slug
    ? slug.replace(/[^a-zA-Z0-9._-]/g, '-')
    : crypto.randomUUID();

  let fileName = baseName;
  let counter = 1;

  // Ensure uniqueness
  while (await fs.pathExists(path.join(fullPath, fileName + (isContainer ? '/' : '')))) {
    fileName = `${baseName}-${counter}`;
    counter++;
  }

  return fileName;
}

/**
 * Create read stream (for Range requests)
 */
export function createReadStream(filePath, options) {
  const fullPath = path.join(DATA_ROOT, filePath);

  try {
    const stream = fs.createReadStream(fullPath, options);
    return { stream };
  } catch (err) {
    return null;
  }
}
