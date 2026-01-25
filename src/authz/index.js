import { parseAcl, checkAccess } from './wac.js'

export class Authz {
  constructor(storage, options = {}) {
    this.storage = storage
    this.baseUri = options.baseUri || 'http://localhost:3456'
  }

  /**
   * Check if an agent has access to a resource
   */
  async check(agent, resourcePath, method) {
    // Find and parse the applicable ACL
    const { acl, inherited } = await this.findAcl(resourcePath)

    if (!acl) {
      // No ACL found - fall back to default behavior
      // Owner can do anything, public can read
      return this.defaultCheck(agent, resourcePath, method)
    }

    const authorizations = parseAcl(acl, this.baseUri)
    const resourceUri = `${this.baseUri}/storage${resourcePath}`

    return checkAccess(authorizations, agent, resourceUri, method, inherited)
  }

  /**
   * Find the applicable ACL for a resource
   * Walks up the tree looking for .acl files
   */
  async findAcl(resourcePath) {
    // First check for resource-specific ACL
    const resourceAclPath = resourcePath.endsWith('/')
      ? resourcePath + '.acl'
      : resourcePath + '.acl'

    const resourceAcl = await this.storage.get(resourceAclPath)
    if (resourceAcl && typeof resourceAcl === 'object') {
      return { acl: resourceAcl, inherited: false }
    }

    // Walk up the tree looking for container ACLs with default rules
    const parts = resourcePath.split('/').filter(Boolean)
    while (parts.length > 0) {
      parts.pop()
      const containerPath = '/' + parts.join('/') + '/'
      const containerAclPath = containerPath + '.acl'

      const containerAcl = await this.storage.get(containerAclPath)
      if (containerAcl && typeof containerAcl === 'object') {
        return { acl: containerAcl, inherited: true }
      }
    }

    // Check root ACL
    const rootAcl = await this.storage.get('/.acl')
    if (rootAcl && typeof rootAcl === 'object') {
      return { acl: rootAcl, inherited: true }
    }

    return { acl: null, inherited: false }
  }

  /**
   * Default access check when no ACL exists
   * Owner can do anything, public can read
   */
  defaultCheck(agent, resourcePath, method) {
    // Extract owner from path: /username/...
    const match = resourcePath.match(/^\/([^/]+)/)
    const owner = match ? `${this.baseUri}/storage/${match[1]}/profile#me` : null

    // Read is always allowed (public read)
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true
    }

    // Write requires being the owner
    if (method === 'PUT' || method === 'POST' || method === 'PATCH' || method === 'DELETE') {
      if (!agent) return false
      return agent === owner
    }

    return false
  }
}
