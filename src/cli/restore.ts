// cli/restore.ts

import fs from 'node:fs'
import path from 'node:path'
import { CONFIG_FILE, writeConfig } from '../config'
import { decryptData, decryptFile } from '../crypto/file_encryption'
import { hashFilename } from '../crypto/filename_hash'
import { deriveKey, getSaltFile, writeDek } from '../crypto/key_derivation'
import { ensureDirForFile, isFileNotFound } from '../fs/file_util'
import { logger } from '../logger'
import { ManifestFile } from '../model/ManifestFile'
import { prompt } from '../tui'

export async function restoreCommand(): Promise<void> {
  logger.debug('restore: start')

  if (fs.existsSync(CONFIG_FILE)) {
    console.error('Already initialized.', '\n* Delete configuration file if you actually restore:', CONFIG_FILE)
    return
  }

  let outputDir: string
  while (true) {
    outputDir = await prompt('Enter directory to restore:')
    let st: fs.Stats | null
    try {
      st = await fs.promises.lstat(outputDir)
    } catch (err) {
      if (!isFileNotFound(err)) {
        throw err
      }
      st = null
    }
    if (st != null && !st.isDirectory()) {
      logger.warn('restore: invalid output directory - not a directory')
      continue
    }
    break
  }

  let backupDir: string
  while (true) {
    backupDir = await prompt('Enter backup directory:')
    const st = await fs.promises.lstat(backupDir)
    if (!st.isDirectory()) {
      logger.warn('restore: invalid backup directory - not a directory')
      continue
    }
    break
  }

  let masterPassword: string
  while (true) {
    masterPassword = await prompt('Enter master password:', { mask: true })
    // TODO: verify password
    break
  }

  const manifestDir = path.join(backupDir, '.enclet')
  const manifestFile = path.join(manifestDir, 'manifest.enc')

  // restore salt
  const backupSaltFile = path.join(manifestDir, 'salt')
  await fs.promises.copyFile(backupSaltFile, getSaltFile())
  const salt = await fs.promises.readFile(getSaltFile())

  // regenerate dek
  const dek = deriveKey(masterPassword, salt)
  await writeDek(dek)
  logger.debug('restore: DEK written to storage')

  // TODO: verify dek

  // get manifest
  const decryptedManifest = decryptData(await fs.promises.readFile(manifestFile), dek)
  const manifest = ManifestFile.parse((await decryptedManifest).toString('utf-8'))
  logger.debug(`restore: manifest loaded with ${manifest.entries.length} entries`)

  for (const entry of manifest.entries) {
    const { relativePath, checksum, hashedFilename } = entry

    const encryptedFilePath = path.join(backupDir, hashedFilename)
    const restoredFilePath = path.join(outputDir, relativePath)

    // Verify filename
    const rehash = hashFilename(relativePath, dek)
    if (rehash !== hashedFilename) {
      logger.warn(`restore: hashed filename mismatch for ${relativePath}`)
    }

    logger.debug(`restore: decrypting ${relativePath}`)
    await ensureDirForFile(restoredFilePath)
    await decryptFile(encryptedFilePath, restoredFilePath, dek)
    logger.debug(`restore: file decrypted to ${restoredFilePath}`)

    // Verify checksum
    // const actualChecksum = await computeChecksum(relativePath, restoredFilePath, dek)
    // if (actualChecksum !== checksum) {
    //   console.warn(`WARNING: Checksum mismatch for ${relativePath}`)
    // }
  }

  // write configuration
  await writeConfig({ sourceDir: outputDir, backupDir })
  logger.debug('init: config created')

  logger.info(`restore: completed - restored ${manifest.entries.length} files`)
}
