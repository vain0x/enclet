import fs from 'node:fs'
import path from 'node:path'
import { loadConfig } from "../config"
import { computeChecksum } from '../crypto/checksum'
import { decryptData } from '../crypto/file_encryption'
import { hashFilename } from '../crypto/filename_hash'
import { loadDek } from '../crypto/key_derivation'
import { getAllFilesRecursively } from '../fs/file_util'
import { FileExclusion } from '../fs/FileExclusion'
import { FileLocker } from '../fs/FileLocker'
import { makeRelativePath } from '../fs/path_util'
import { logger } from "../logger"
import { ManifestFile } from '../model/ManifestFile'

export async function verifyCommand(): Promise<void> {
  logger.debug('verify: start')
  const config = await loadConfig()
  const { sourceDir, backupDir } = config
  const exclusion = new FileExclusion(path.join(sourceDir, '.gitignore'))

  const allSourceFiles = await getAllFilesRecursively(sourceDir, relativePath => !exclusion.isExcluded(relativePath))
  logger.debug(`verify: found ${allSourceFiles.length} source files to check`)

  const dek = await loadDek()
  logger.debug('verify: DEK loaded successfully')

  const manifestDir = path.join(backupDir, '.enclet')
  const manifestFile = path.join(manifestDir, 'manifest.enc')

  const relative = (s: string) => {
    return 'backup:' + makeRelativePath(backupDir, s)
  }

  let ok = true
  const saltFile = path.join(manifestDir, 'salt')
  if (!fs.existsSync(saltFile)) {
    ok = false
    logger.warn(`verify: missing salt file at ${relative(saltFile)}`)
  }

  let oldManifest: ManifestFile
  try {
    const manifestPlain = await decryptData(await fs.promises.readFile(manifestFile), dek)
    oldManifest = ManifestFile.parse(manifestPlain.toString())
  } catch (err) {
    throw err
  }

  const newManifest = new ManifestFile()

  const locker = new FileLocker(manifestDir)
  locker.acquire()
  logger.debug('verify: acquired file lock for verification')

  try {
    const oldEntries = oldManifest.entries
    const oldEntryMap = new Map(oldEntries.map(e => [e.relativePath, e]))

    for (const absFile of allSourceFiles) {
      const relPath = makeRelativePath(sourceDir, absFile)
      const checksum = await computeChecksum(relPath, absFile, dek)
      const hashed = hashFilename(relPath, dek)

      const oldEntry = oldEntryMap.get(relPath)

      newManifest.addEntry({ relativePath: relPath, checksum, hashedFilename: hashed })

      if (!oldEntry) {
        ok = false
        logger.warn(`verify: missing backup for source file ${relPath}`)
      } else if (oldEntry.hashedFilename !== hashed) {
        ok = false
        logger.warn(`verify: hashed filename mismatch for source file ${relPath}`)
      } else if (oldEntry.checksum !== checksum) {
        logger.warn(`verify: checksum mismatch for ${relPath} (backup: ${hashed.slice(0, 7)})`)
      }
    }

    logger.debug(`verify: found ${newManifest.entries.length} source files, ${oldEntries.length} backup entries`)

    for (const oldEntry of oldEntries) {
      if (!newManifest.includes(oldEntry.relativePath)) {
        const oldFilePath = path.join(backupDir, oldEntry.hashedFilename)
        logger.debug(`verify: backup file ${oldFilePath} would be removed (source deleted: ${oldEntry.relativePath})`)
      }
    }
  } finally {
    locker.release()
  }

  if (ok) {
    logger.info('verify: success')
  } else {
    logger.warn('verify: something wong, see warnings above')
  }
  logger.debug('verify: finish')
}
