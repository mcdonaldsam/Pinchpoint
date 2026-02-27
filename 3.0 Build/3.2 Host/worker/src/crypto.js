// AES-256-GCM token encryption + HKDF per-user key derivation + HMAC-SHA256 request signing
// Uses Web Crypto API (native in Cloudflare Workers)

function hexToBuffer(hex) {
  if (typeof hex !== 'string' || hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error('Invalid hex string')
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

function bufferToHex(buffer) {
  return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Derive a per-user AES-256-GCM key from the master key using HKDF-SHA256.
 * Each user gets a unique encryption key so a single master key compromise
 * doesn't directly decrypt all tokens without also knowing the userId.
 * @param {string} masterHexKey - Hex-encoded 32-byte master key
 * @param {string} userId - Clerk user ID (HKDF info parameter)
 * @returns {Promise<CryptoKey>} Non-extractable AES-256-GCM key
 */
export async function deriveUserKey(masterHexKey, userId) {
  const ikm = await crypto.subtle.importKey(
    'raw',
    hexToBuffer(masterHexKey),
    'HKDF',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode('pinchpoint-v1'),
      info: new TextEncoder().encode(userId),
    },
    ikm,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Encrypt a setup token for storage.
 * @param {string} token - Plaintext setup token
 * @param {string|CryptoKey} keyOrHex - Hex-encoded 32-byte AES key or CryptoKey from deriveUserKey
 * @returns {Promise<string>} "ivHex:ciphertextHex"
 */
export async function encryptToken(token, keyOrHex) {
  const key = typeof keyOrHex === 'string'
    ? await crypto.subtle.importKey('raw', hexToBuffer(keyOrHex), { name: 'AES-GCM' }, false, ['encrypt'])
    : keyOrHex
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(token),
  )
  return bufferToHex(iv) + ':' + bufferToHex(new Uint8Array(encrypted))
}

/**
 * Decrypt a stored token.
 * @param {string} stored - "ivHex:ciphertextHex" from encryptToken
 * @param {string|CryptoKey} keyOrHex - Hex-encoded 32-byte AES key or CryptoKey from deriveUserKey
 * @returns {Promise<string>} Plaintext token
 */
export async function decryptToken(stored, keyOrHex) {
  const [ivHex, ciphertextHex] = stored.split(':')
  const key = typeof keyOrHex === 'string'
    ? await crypto.subtle.importKey('raw', hexToBuffer(keyOrHex), { name: 'AES-GCM' }, false, ['decrypt'])
    : keyOrHex
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBuffer(ivHex) },
    key,
    hexToBuffer(ciphertextHex),
  )
  return new TextDecoder().decode(decrypted)
}

/**
 * Hash a token for fingerprinting (connect flow token binding).
 * @param {string} token - Plaintext token
 * @returns {Promise<string>} First 32 hex chars (128 bits) of SHA-256 hash
 */
export async function hashToken(token) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return bufferToHex(new Uint8Array(hash)).slice(0, 32)
}

/**
 * Sign a ping request with HMAC-SHA256.
 * @param {string} payload - The encrypted token payload
 * @param {number} timestamp - Current timestamp (Date.now())
 * @param {string} nonce - Random one-time-use value for replay protection
 * @param {string} secret - Shared HMAC secret
 * @returns {Promise<string>} Hex-encoded HMAC signature
 */
export async function signPingRequest(payload, timestamp, nonce, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${payload}:${timestamp}:${nonce}`),
  )
  return bufferToHex(new Uint8Array(sig))
}
