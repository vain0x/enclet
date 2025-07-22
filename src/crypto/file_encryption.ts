import assert from 'node:assert'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { logger } from '../logger'

// AES-GCM parameters
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

export const DEK_LENGTH = 32 // specified with algorithm

/**
 * Encrypts a file using AES-256-GCM.
 * Encrypted format: [IV][CIPHERTEXT][AUTH_TAG]
 */
export async function encryptFile(
  sourcePath: string,
  destPath: string,
  dek: Uint8Array
): Promise<void> {
  logger.debug(`file_encryption: encrypting ${sourcePath} -> ${destPath}`)
  const data = await fs.promises.readFile(sourcePath)
  const encrypted = await encryptData(data, dek)
  await fs.promises.writeFile(destPath, encrypted)
}

export async function encryptData(plain: Uint8Array, dek: Uint8Array): Promise<Uint8Array> {
  assert.strictEqual(dek.length, DEK_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, dek, iv, { authTagLength: TAG_LENGTH })
  const ciphertext = cipher.update(plain)
  cipher.final()
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, ciphertext, tag])
}

/**
 * Decrypts a file that was encrypted using encryptFile.
 */
export async function decryptFile(
  sourcePath: string,
  destPath: string,
  dek: Buffer
): Promise<void> {
  logger.debug(`file_encryption: decrypting ${sourcePath} -> ${destPath}`)
  const stat = await fs.promises.lstat(sourcePath)
  const fileSize = stat.size
  if (fileSize < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Encrypted file is too small or corrupted')
  }
  const encrypted = await fs.promises.readFile(sourcePath)
  const decrypted = await decryptData(encrypted, dek)
  await fs.promises.writeFile(destPath, decrypted)
}

/**
 * Decrypts a file that was encrypted using encryptFile.
 */
export async function decryptData(
  encrypted: Uint8Array,
  dek: Uint8Array
): Promise<Buffer> {
  const fileSize = encrypted.byteLength
  if (fileSize < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Encrypted file is too small or corrupted')
  }
  const iv = encrypted.subarray(0, IV_LENGTH)
  const ciphertext = encrypted.subarray(IV_LENGTH, fileSize - TAG_LENGTH)
  const tag = encrypted.subarray(fileSize - TAG_LENGTH, fileSize)
  const decipher = crypto.createDecipheriv(ALGORITHM, dek, iv, { authTagLength: TAG_LENGTH })
  decipher.setAuthTag(tag)
  const plaintext = decipher.update(ciphertext)
  try {
    decipher.final()
  } catch (err) {
    logger.error('file_encryption: decryption failed')
    throw new Error('Decryption error (password incorrect, backup file corrupted, or other reasons)', { cause: err })
  }
  return plaintext
}
