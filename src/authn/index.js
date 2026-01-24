import crypto from 'node:crypto'

export class Authn {
  constructor(storage) {
    this.storage = storage
    this.tokens = new Map() // In-memory token store (simple for v0.0.1)
  }

  // Authenticate request from Authorization header
  async authenticate(req) {
    const auth = req.headers.authorization
    if (!auth) return null

    // Bearer token
    if (auth.startsWith('Bearer ')) {
      const token = auth.slice(7)
      return this.tokens.get(token) || null
    }

    return null
  }

  // Register a new identity (creates WebID profile)
  async register(username) {
    if (!username || !/^[a-zA-Z0-9_-]+$/.test(username)) {
      throw new Error('Invalid username')
    }

    const webId = `/storage/${username}/profile#me`
    const profilePath = `/${username}/profile`
    
    // Check if exists
    if (await this.storage.exists(profilePath)) {
      throw new Error('Username already taken')
    }

    // Generate secret for this user
    const secret = crypto.randomBytes(32).toString('hex')

    // Create profile
    const profile = {
      '@context': 'https://www.w3.org/ns/lws',
      '@id': webId,
      type: 'Agent',
      name: username,
      storage: `/storage/${username}/`,
      created: new Date().toISOString()
    }

    await this.storage.put(profilePath, profile)
    
    // Store secret (in real impl, this would be hashed)
    await this.storage.put(`/${username}/.secret`, { secret })

    return { webId, secret, profile }
  }

  // Create a token for authenticated access
  async createToken(username, secret) {
    const secretFile = await this.storage.get(`/${username}/.secret`)
    if (!secretFile || secretFile.secret !== secret) {
      throw new Error('Invalid credentials')
    }

    const token = crypto.randomBytes(32).toString('hex')
    const webId = `/storage/${username}/profile#me`
    
    // Store token -> webId mapping
    this.tokens.set(token, webId)

    return { token, webId, expiresIn: '24h' }
  }
}
