/**
 * Web Access Control (WAC) implementation
 * Supports JSON-LD ACL files
 */

const ACL = {
  Authorization: 'http://www.w3.org/ns/auth/acl#Authorization',
  Read: 'http://www.w3.org/ns/auth/acl#Read',
  Write: 'http://www.w3.org/ns/auth/acl#Write',
  Append: 'http://www.w3.org/ns/auth/acl#Append',
  Control: 'http://www.w3.org/ns/auth/acl#Control',
  agent: 'http://www.w3.org/ns/auth/acl#agent',
  agentClass: 'http://www.w3.org/ns/auth/acl#agentClass',
  accessTo: 'http://www.w3.org/ns/auth/acl#accessTo',
  default: 'http://www.w3.org/ns/auth/acl#default',
  mode: 'http://www.w3.org/ns/auth/acl#mode'
}

const FOAF = {
  Agent: 'http://xmlns.com/foaf/0.1/Agent'
}

// Map HTTP methods to ACL modes
const METHOD_TO_MODE = {
  GET: ACL.Read,
  HEAD: ACL.Read,
  OPTIONS: ACL.Read,
  POST: ACL.Append,
  PUT: ACL.Write,
  PATCH: ACL.Write,
  DELETE: ACL.Write
}

/**
 * Parse a JSON-LD ACL document into authorization rules
 */
export function parseAcl(aclData, baseUri) {
  if (!aclData) return []

  // Handle both array and object formats
  const items = Array.isArray(aclData) ? aclData :
                aclData['@graph'] ? aclData['@graph'] :
                [aclData]

  const authorizations = []

  for (const item of items) {
    // Check if this is an Authorization
    const types = normalizeToArray(item['@type'] || item.type)
    const isAuthorization = types.some(t => {
      const resolved = resolveUri(t, baseUri)
      return resolved === ACL.Authorization || t === 'Authorization' || t === 'acl:Authorization'
    })
    if (!isAuthorization) {
      continue
    }

    const auth = {
      agents: [],
      agentClasses: [],
      accessTo: [],
      default: [],
      modes: []
    }

    // Extract agents (specific WebIDs)
    const agents = normalizeToArray(item[ACL.agent] || item['acl:agent'] || item.agent)
    auth.agents = agents.map(a => resolveUri(a, baseUri))

    // Extract agent classes (e.g., foaf:Agent for public)
    const agentClasses = normalizeToArray(item[ACL.agentClass] || item['acl:agentClass'] || item.agentClass)
    auth.agentClasses = agentClasses.map(a => resolveUri(a, baseUri))

    // Extract accessTo (specific resources)
    const accessTo = normalizeToArray(item[ACL.accessTo] || item['acl:accessTo'] || item.accessTo)
    auth.accessTo = accessTo.map(a => resolveUri(a, baseUri))

    // Extract default (inherited by container contents)
    const defaults = normalizeToArray(item[ACL.default] || item['acl:default'] || item.default)
    auth.default = defaults.map(a => resolveUri(a, baseUri))

    // Extract modes
    const modes = normalizeToArray(item[ACL.mode] || item['acl:mode'] || item.mode)
    auth.modes = modes.map(m => resolveUri(m, baseUri))

    authorizations.push(auth)
  }

  return authorizations
}

/**
 * Check if an agent has access to a resource
 */
export function checkAccess(authorizations, agent, resourceUri, method, isInherited = false) {
  const requiredMode = METHOD_TO_MODE[method]
  if (!requiredMode) return false

  for (const auth of authorizations) {
    // Check if this authorization applies to the resource
    const appliesToResource = isInherited
      ? auth.default.some(d => resourceUri.startsWith(d))
      : auth.accessTo.some(a => a === resourceUri || resourceUri.startsWith(a + '/'))

    if (!appliesToResource && !isInherited) {
      // Also check default for resources inside a container
      const appliesToDefault = auth.default.some(d => resourceUri.startsWith(d))
      if (!appliesToDefault) continue
    } else if (!appliesToResource) {
      continue
    }

    // Check if the agent matches
    const agentMatches =
      // Public access (foaf:Agent)
      auth.agentClasses.includes(FOAF.Agent) ||
      // Specific agent
      (agent && auth.agents.includes(agent))

    if (!agentMatches) continue

    // Check if the mode is granted
    const hasMode = auth.modes.includes(requiredMode) ||
      // Write implies Append
      (requiredMode === ACL.Append && auth.modes.includes(ACL.Write))

    if (hasMode) return true
  }

  return false
}

/**
 * Normalize a value to an array
 */
function normalizeToArray(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  return [value]
}

/**
 * Resolve a URI value (handles @id objects and relative URIs)
 */
function resolveUri(value, baseUri) {
  if (!value) return ''
  if (typeof value === 'string') {
    // Handle prefixed URIs
    if (value.startsWith('acl:')) {
      return 'http://www.w3.org/ns/auth/acl#' + value.slice(4)
    }
    if (value.startsWith('foaf:')) {
      return 'http://xmlns.com/foaf/0.1/' + value.slice(5)
    }
    // Handle relative URIs
    if (value.startsWith('/') && baseUri) {
      const base = new URL(baseUri)
      return `${base.protocol}//${base.host}${value}`
    }
    return value
  }
  if (value['@id']) return resolveUri(value['@id'], baseUri)
  if (value.id) return resolveUri(value.id, baseUri)
  return ''
}
