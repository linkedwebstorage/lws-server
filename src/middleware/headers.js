/**
 * LDP/LWS response headers
 */

const LDP = {
  Resource: 'http://www.w3.org/ns/ldp#Resource',
  Container: 'http://www.w3.org/ns/ldp#Container',
  BasicContainer: 'http://www.w3.org/ns/ldp#BasicContainer'
}

/**
 * Generate Link header for LDP resource types
 */
export function linkHeader(isContainer) {
  const links = [`<${LDP.Resource}>; rel="type"`]
  if (isContainer) {
    links.push(`<${LDP.Container}>; rel="type"`)
    links.push(`<${LDP.BasicContainer}>; rel="type"`)
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
 */
export function ldpHeaders(isContainer) {
  const headers = {
    'Link': linkHeader(isContainer),
    'Allow': allowHeader(isContainer),
    'Accept-Patch': 'application/merge-patch+json'
  }
  if (isContainer) {
    headers['Accept-Post'] = '*/*'
  }
  return headers
}
