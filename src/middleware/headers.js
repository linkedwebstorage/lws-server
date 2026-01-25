/**
 * LDP/LWS response headers
 */

const LDP = {
  Resource: 'http://www.w3.org/ns/ldp#Resource',
  Container: 'http://www.w3.org/ns/ldp#Container',
  BasicContainer: 'http://www.w3.org/ns/ldp#BasicContainer'
}

const LWS = {
  storageDescription: 'https://www.w3.org/ns/lws#storageDescription'
}

/**
 * Generate Link header for LDP resource types
 * @param {boolean} isContainer - Is this a container?
 * @param {object} options - Additional options
 * @param {string} options.storageDescription - URI of the storage description resource
 * @param {string} options.acl - URI of the ACL resource
 */
export function linkHeader(isContainer, options = {}) {
  const { storageDescription, acl } = options
  const links = [`<${LDP.Resource}>; rel="type"`]
  if (isContainer) {
    links.push(`<${LDP.Container}>; rel="type"`)
    links.push(`<${LDP.BasicContainer}>; rel="type"`)
  }
  if (storageDescription) {
    links.push(`<${storageDescription}>; rel="${LWS.storageDescription}"`)
  }
  if (acl) {
    links.push(`<${acl}>; rel="acl"`)
  }
  return links.join(', ')
}

/**
 * Generate Allow header listing supported methods
 */
export function allowHeader(isContainer) {
  const methods = ['GET', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  if (isContainer) {
    methods.push('POST')
  }
  return methods.join(', ')
}

/**
 * Get all LDP headers for a response
 * @param {boolean} isContainer - Is this a container?
 * @param {object} options - Additional options
 * @param {string} options.storageDescription - URI of the storage description resource
 * @param {string} options.acl - URI of the ACL resource
 */
export function ldpHeaders(isContainer, options = {}) {
  const headers = {
    'Link': linkHeader(isContainer, options),
    'Allow': allowHeader(isContainer)
  }
  if (isContainer) {
    headers['Accept-Post'] = '*/*'
  } else {
    headers['Accept-Patch'] = 'application/merge-patch+json'
  }
  return headers
}
