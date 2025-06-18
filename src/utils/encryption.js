/**
 * Simple decrypt function for API keys
 * @param {string} encryptedText - Base64 encoded encrypted text
 * @param {string} key - Decryption key (usually user ID)
 * @returns {string} - Decrypted text
 */
export const decrypt = (encryptedText, key) => {
  const keyBuffer = Buffer.from(key, 'utf8')
  const encryptedBuffer = Buffer.from(encryptedText, 'base64')
  const decrypted = Buffer.alloc(encryptedBuffer.length)
  for (let i = 0; i < encryptedBuffer.length; i++) {
    decrypted[i] = encryptedBuffer[i] ^ keyBuffer[i % keyBuffer.length]
  }
  return decrypted.toString('utf8')
}

/**
 * Simple encrypt function for API keys
 * @param {string} plainText - Text to encrypt
 * @param {string} key - Encryption key (usually user ID)
 * @returns {string} - Base64 encoded encrypted text
 */
export const encrypt = (plainText, key) => {
  const keyBuffer = Buffer.from(key, 'utf8')
  const plainBuffer = Buffer.from(plainText, 'utf8')
  const encrypted = Buffer.alloc(plainBuffer.length)
  for (let i = 0; i < plainBuffer.length; i++) {
    encrypted[i] = plainBuffer[i] ^ keyBuffer[i % keyBuffer.length]
  }
  return encrypted.toString('base64')
}
