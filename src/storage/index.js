import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

export class Storage {
  constructor(dataDir) {
    this.dataDir = path.resolve(dataDir)
    this.init()
  }

  async init() {
    await fs.mkdir(this.dataDir, { recursive: true })
  }

  resolvePath(resourcePath) {
    // Normalize and resolve to filesystem path
    const normalized = path.normalize(resourcePath).replace(/^\/+/, '')
    const fullPath = path.resolve(this.dataDir, normalized)

    // Security: ensure we don't escape data directory
    if (!fullPath.startsWith(this.dataDir)) {
      throw new Error('Invalid path')
    }
    return fullPath
  }

  async get(resourcePath) {
    try {
      const fullPath = this.resolvePath(resourcePath)
      const stat = await fs.stat(fullPath)
      
      // If directory, return listing
      if (stat.isDirectory()) {
        const entries = await fs.readdir(fullPath, { withFileTypes: true })
        return {
          '@context': 'https://www.w3.org/ns/lws',
          '@id': resourcePath,
          type: 'Container',
          contains: entries
            .filter(e => !e.name.startsWith('.')) // Hide dotfiles
            .map(e => ({
              name: e.name,
              type: e.isDirectory() ? 'Container' : 'Resource'
            }))
        }
      }
      
      // Read file
      const content = await fs.readFile(fullPath, 'utf-8')
      try {
        return JSON.parse(content)
      } catch {
        return content
      }
    } catch (err) {
      if (err.code === 'ENOENT') return null
      throw err
    }
  }

  async put(resourcePath, data, agent) {
    const fullPath = this.resolvePath(resourcePath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    await fs.writeFile(fullPath, content, 'utf-8')
    return resourcePath
  }

  async post(containerPath, data, agent, options = {}) {
    const { slug, isContainer } = options
    const extension = isContainer ? '' : '.json'

    // Generate base name from slug or UUID
    let baseName = slug ? sanitizeSlug(slug) : crypto.randomUUID().slice(0, 8)

    // Atomic creation with collision handling
    // Uses O_CREAT|O_EXCL ('wx' flag) which fails atomically if file exists
    let resourcePath = path.join(containerPath, baseName + extension)
    let suffix = 0
    const maxAttempts = 100

    while (suffix < maxAttempts) {
      const fullPath = this.resolvePath(resourcePath)
      try {
        if (isContainer) {
          // mkdir without recursive fails if dir exists (atomic)
          await fs.mkdir(fullPath)
        } else {
          // Ensure parent directory exists
          await fs.mkdir(path.dirname(fullPath), { recursive: true })
          // 'wx' flag: create exclusively, fail if exists (atomic)
          const handle = await fs.open(fullPath, 'wx')
          const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
          await handle.writeFile(content, 'utf-8')
          await handle.close()
        }
        return resourcePath
      } catch (err) {
        if (err.code === 'EEXIST') {
          // Collision - try next suffix
          suffix++
          resourcePath = path.join(containerPath, `${baseName}-${suffix}${extension}`)
        } else {
          throw err
        }
      }
    }

    // Fallback to UUID after max collisions
    baseName = crypto.randomUUID().slice(0, 8)
    resourcePath = path.join(containerPath, baseName + extension)
    const fullPath = this.resolvePath(resourcePath)

    if (isContainer) {
      await fs.mkdir(fullPath)
    } else {
      await fs.mkdir(path.dirname(fullPath), { recursive: true })
      const handle = await fs.open(fullPath, 'wx')
      const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      await handle.writeFile(content, 'utf-8')
      await handle.close()
    }
    return resourcePath
  }

  async delete(resourcePath) {
    const fullPath = this.resolvePath(resourcePath)
    await fs.rm(fullPath, { recursive: true })
  }

  async exists(resourcePath) {
    try {
      await fs.access(this.resolvePath(resourcePath))
      return true
    } catch {
      return false
    }
  }

  async stat(resourcePath) {
    try {
      const fullPath = this.resolvePath(resourcePath)
      const stat = await fs.stat(fullPath)
      return {
        isDirectory: stat.isDirectory(),
        size: stat.size,
        mtime: stat.mtime,
        etag: `"${stat.mtimeMs.toString(16)}-${stat.size.toString(16)}"`
      }
    } catch (err) {
      if (err.code === 'ENOENT') return null
      throw err
    }
  }

  async patch(resourcePath, patchData, agent) {
    const resourceExists = await this.exists(resourcePath)
    if (!resourceExists) {
      return null // Resource doesn't exist
    }
    const existing = await this.get(resourcePath)
    if (typeof existing !== 'object' || typeof patchData !== 'object') {
      // Can't merge non-objects, just replace
      await this.put(resourcePath, patchData, agent)
      return resourcePath
    }
    const merged = mergePatch(existing, patchData)
    await this.put(resourcePath, merged, agent)
    return resourcePath
  }
}

/**
 * JSON Merge Patch (RFC 7396)
 * - null values delete keys
 * - other values replace/add keys
 * - recursively merges objects
 */
function mergePatch(target, patch) {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    return patch
  }
  if (target === null || typeof target !== 'object' || Array.isArray(target)) {
    target = {}
  }
  const result = { ...target }
  for (const key of Object.keys(patch)) {
    if (patch[key] === null) {
      delete result[key]
    } else {
      result[key] = mergePatch(result[key], patch[key])
    }
  }
  return result
}

/**
 * Sanitize slug for use as filename
 * - Only alphanumeric, hyphens, underscores, dots allowed
 * - Remove path separators to prevent traversal
 * - Trim whitespace, replace spaces with hyphens
 * - Remove leading/trailing dots/hyphens
 * - Limit length to 100 chars
 */
function sanitizeSlug(slug) {
  if (slug == null || typeof slug !== 'string') {
    return 'resource'
  }
  return slug
    .trim()
    .replace(/[/\\]/g, '')          // remove path separators (security)
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/[^a-zA-Z0-9._-]/g, '') // remove invalid chars
    .replace(/^[.-]+|[.-]+$/g, '')   // trim leading/trailing dots/hyphens
    .slice(0, 100)                   // limit length
    || 'resource'                    // fallback if empty
}
