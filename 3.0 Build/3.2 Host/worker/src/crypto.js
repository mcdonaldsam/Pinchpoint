// AES-256-GCM token encryption + HMAC-SHA256 request signing
// Uses Web Crypto API (native in Cloudflare Workers)

function hexToBuffer(hex) {
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
 * Encrypt a setup token for storage.
 * @param {string} token - Plaintext setup token
 * @param {string} hexKey - Hex-encoded 32-byte AES key
 * @returns {Promise<string>} "ivHex:ciphertextHex"
 */
export async function encryptToken(token, hexKey) {
  const key = await crypto.subtle.importKey(
    'raw',
    hexToBuffer(hexKey),
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  )
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
 * @param {string} hexKey - Hex-encoded 32-byte AES key
 * @returns {Promise<string>} Plaintext token
 */
export async function decryptToken(stored, hexKey) {
  const [ivHex, ciphertextHex] = stored.split(':')
  const key = await crypto.subtle.importKey(
    'raw',
    hexToBuffer(hexKey),
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  )
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBuffer(ivHex) },
    key,
    hexToBuffer(ciphertextHex),
  )
  return new TextDecoder().decode(decrypted)
}

/**
 * Sign a ping request with HMAC-SHA256.
 * @param {string} token - The setup token being sent
 * @param {number} timestamp - Current timestamp (Date.now())
 * @param {string} secret - Shared HMAC secret
 * @returns {Promise<string>} Hex-encoded HMAC signature
 */
export async function signPingRequest(token, timestamp, secret) {
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
    new TextEncoder().encode(`${token}:${timestamp}`),
  )
  return bufferToHex(new Uint8Array(sig))
}
