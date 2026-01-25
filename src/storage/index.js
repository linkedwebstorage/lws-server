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

  async post(containerPath, data, agent) {
    const id = crypto.randomUUID().slice(0, 8)
    const resourcePath = path.join(containerPath, id + '.json')
    await this.put(resourcePath, data, agent)
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
