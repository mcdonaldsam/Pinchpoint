// Clerk JWT verification with JWKS caching and kid matching

let jwksCache = null
let jwksCacheTime = 0
const JWKS_TTL = 60 * 60 * 1000 // 1 hour

async function fetchJWKS(clerkDomain) {
  const now = Date.now()
  if (jwksCache && now - jwksCacheTime < JWKS_TTL) return jwksCache
  const res = await fetch(`https://${clerkDomain}/.well-known/jwks.json`)
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`)
  jwksCache = await res.json()
  jwksCacheTime = now
  return jwksCache
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Verify a Clerk JWT and return the user ID (sub claim).
 * @returns {Promise<string|null>} Clerk user ID or null if invalid
 */
export async function verifyClerkSession(request, env) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const clerkDomain = env.CLERK_FRONTEND_API
  if (!clerkDomain) return null

  try {
    // Decode JWT header to get kid
    const [headerB64, payloadB64, sigB64] = token.split('.')
    const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')))
    const kid = header.kid

    // Reject non-RS256 algorithms (defense in depth — importKey also pins to RSASSA-PKCS1-v1_5)
    if (header.alg !== 'RS256') return null

    // Fetch JWKS and match kid
    let jwks = await fetchJWKS(clerkDomain)
    let jwk = jwks.keys.find(k => k.kid === kid)

    // If kid not found, bust cache and refetch (handles key rotation)
    if (!jwk) {
      jwksCacheTime = 0
      jwks = await fetchJWKS(clerkDomain)
      jwk = jwks.keys.find(k => k.kid === kid)
    }

    if (!jwk) return null

    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    // Verify signature
    const sigBytes = base64UrlDecode(sigB64)
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sigBytes, data)
    if (!valid) return null

    // Decode and validate payload
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    const nowSeconds = Date.now() / 1000

    // Expiration check (required)
    if (!payload.exp || payload.exp < nowSeconds) return null

    // Not-before check — reject tokens used before their valid-from time
    if (payload.nbf && payload.nbf > nowSeconds) return null

    // Issuer check (required)
    if (!payload.iss || payload.iss !== `https://${clerkDomain}`) return null

    // Authorized party check — fail-closed (require publishable key to be configured)
    if (!env.CLERK_PUBLISHABLE_KEY) return null
    if (payload.azp && payload.azp !== env.CLERK_PUBLISHABLE_KEY) return null

    // Audience check — reject tokens intended for a different application
    if (payload.aud) {
      const validAud = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
      if (!validAud.some(a => a === `https://${clerkDomain}` || a === clerkDomain)) return null
    }

    return payload.sub // Clerk user ID
  } catch {
    return null
  }
}
