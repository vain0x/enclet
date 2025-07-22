import { pbkdf2Sync, randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { getAppDir } from '../model/app_dir'
import { DEK_LENGTH } from './file_encryption'

const SALT_LENGTH = 16
const ITERATIONS = 100_000
const KEY_LENGTH = DEK_LENGTH
const DIGEST = 'sha512'

// password: used for dek derivation
//    password <- provided by user
// salt: used for dek derivation
//    <- random bytes
// dek (= data encryption key): used for encryption
//    dek <- PBKDF(password, salt)

// storage
//    password: no store. ask on init/restore
//    salt: not in local. save encrypted salt in backup manifest directory for restoration
//    dek: store in local. no store in backup.

export function getSaltFile() {
  return path.join(getAppDir(), 'salt')
}

/**
 * Generates a random salt and saves it.
 */
export async function generateSalt(): Promise<Uint8Array> {
  const saltPath = getSaltFile()
  if (fs.existsSync(saltPath)) {
    throw new Error('Salt file already exists')
  }
  const salt = randomBytes(SALT_LENGTH)
  await fs.promises.writeFile(saltPath, salt)
  return salt
}

/**
 * Derives a data encryption key using KDF.
 */
export function deriveKey(password: string, salt: Uint8Array) {
  return pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
}

/**
 * Loads DEK in local.
 */
export async function loadDek(): Promise<Buffer> {
  const dekPath = path.join(getAppDir(), 'dek')
  return await fs.promises.readFile(dekPath)
}

export async function writeDek(dek: Uint8Array) {
  const dekPath = path.join(getAppDir(), 'dek')
  return await fs.promises.writeFile(dekPath, dek)
}
