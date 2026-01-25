export class Authz {
  constructor(storage) {
    this.storage = storage
  }

  // Simple ACL: owner can read/write their storage, public can read
  async check(agent, resourcePath, method) {
    // Extract owner from path: /username/... 
    const match = resourcePath.match(/^\/([^/]+)/)
    const owner = match ? `/storage/${match[1]}/profile#me` : null

    // Read is always allowed (public read)
    if (method === 'GET' || method === 'HEAD') {
      return true
    }

    // Write requires being the owner
    if (method === 'PUT' || method === 'POST' || method === 'PATCH' || method === 'DELETE') {
      // No agent = no write
      if (!agent) return false
      
      // Must be owner of this path
      return agent === owner
    }

    return false
  }
}
