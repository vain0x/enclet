import fs from 'node:fs'
import path from 'node:path'
import { loadConfig } from '../config'
import { computeChecksum } from '../crypto/checksum'
import { decryptData, encryptData, encryptFile } from '../crypto/file_encryption'
import { hashFilename } from '../crypto/filename_hash'
import { getSaltFile, loadDek } from '../crypto/key_derivation'
import { getAllFilesRecursively, isFileNotFound, safeDelete } from '../fs/file_util'
import { FileExclusion } from '../fs/FileExclusion'
import { FileLocker } from '../fs/FileLocker'
import { makeRelativePath } from '../fs/path_util'
import { logger } from '../logger'
import { ManifestFile } from '../model/ManifestFile'

export async function backupCommand(): Promise<void> {
  logger.debug('backup: start')
  const config = await loadConfig()
  const { sourceDir, backupDir } = config
  logger.debug(`backup: sourceDir=${sourceDir}, backupDir=${backupDir}`)
  const exclusion = new FileExclusion(sourceDir)

  logger.debug('backup: scanning source directory for files')
  const allSourceFiles = await getAllFilesRecursively(sourceDir, relativePath => !exclusion.isExcluded(relativePath))

  const dek = await loadDek()
  logger.debug('backup: DEK loaded successfully')

  let created = false
  let change = 0
  let deletion = 0

  const manifestDir = path.join(backupDir, '.enclet')
  const manifestFile = path.join(manifestDir, 'manifest.enc')

  await fs.promises.mkdir(manifestDir, { recursive: true })

  let oldManifest: ManifestFile
  try {
    const manifestPlain = await decryptData(await fs.promises.readFile(manifestFile), dek)
    oldManifest = ManifestFile.parse(manifestPlain.toString())
  } catch (err) {
    if (!isFileNotFound(err)) {
      throw err
    }
    logger.debug('backup: missing manifest file')
    created = true
    oldManifest = new ManifestFile()
  }

  const newManifest = new ManifestFile()

  const locker = new FileLocker(manifestDir)
  locker.acquire()
  logger.debug('backup: acquired file lock')

  try {
    const oldEntries = oldManifest.entries
    const oldEntryMap = new Map(oldEntries.map(e => [e.relativePath, e]))

    // TODO: Delete all temporary files from last run

    for (const absFile of allSourceFiles) {
      const relPath = makeRelativePath(sourceDir, absFile)
      const checksum = await computeChecksum(relPath, absFile, dek)
      const hashed = hashFilename(relPath, dek)
      logger.debug(`backup: processing file ${relPath}`)

      const oldEntry = oldEntryMap.get(relPath)
      const backupFilePath = path.join(backupDir, hashed)

      newManifest.addEntry({ relativePath: relPath, checksum, hashedFilename: hashed })

      const unchanged = oldEntry && oldEntry.checksum === checksum
      logger.debug(`entry: ${unchanged ? ' ' : '*'} ${relPath} backup:${hashed.slice(0, 7)} ` + (oldEntry && checksum !== oldEntry.checksum ? `checksum:${oldEntry.checksum.slice(0, 6)} -> ${checksum.slice(0, 6)}` : ''))
      if (unchanged) {
        continue
      }

      await safeDelete(backupFilePath)
      await encryptFile(absFile, backupFilePath, dek)
      logger.debug(`backup: encrypted file ${relPath} to ${hashed.slice(0, 7)}`)
      change++
    }

    logger.debug(`backup: manifest contains ${newManifest.entries.length} entries`)

    // update manifest
    const encryptedManifest = await encryptData(Buffer.from(newManifest.stringify()), dek)
    await fs.promises.writeFile(manifestFile, encryptedManifest)
    logger.debug('backup: manifest updated')

    // copy salt if different
    const backupSaltFile = path.join(manifestDir, 'salt')
    await fs.promises.copyFile(getSaltFile(), backupSaltFile)
    logger.debug('backup: salt copied')

    // Remove deleted files
    for (const oldEntry of oldEntries) {
      if (!newManifest.includes(oldEntry.relativePath)) {
        const oldFilePath = path.join(backupDir, oldEntry.hashedFilename)
        logger.debug('backup: deleted ' + oldEntry.relativePath + ' backup:' + oldEntry.hashedFilename.slice(0, 7))
        await safeDelete(oldFilePath)
        deletion++
      }
    }
    logger.info(`backup: completed - ${created ? 'created / ' : ''}${change} changed / ${deletion} deleted`)
  } finally {
    locker.release()
  }
}
