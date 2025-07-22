import fs from 'node:fs'
import { CONFIG_FILE, writeConfig } from '../config'
import { deriveKey, generateSalt, writeDek } from '../crypto/key_derivation'
import { logger } from '../logger'
import { prompt } from '../tui'
import { isFileNotFound } from '../fs/file_util'

export async function initCommand(): Promise<void> {
  logger.debug('init: start')

  if (fs.existsSync(CONFIG_FILE)) {
    console.error('Already initialized.', '\n* Delete configuration file if you actually re-initialize:', CONFIG_FILE, '\n* Use restore command to import existing backup directory')
    return
  }

  let sourceDir: string
  while (true) {
    sourceDir = await prompt('Enter source directory to back up:')
    const st = await fs.promises.lstat(sourceDir)
    if (!st.isDirectory()) {
      logger.warn('init: invalid source directory - not a directory')
      continue
    }
    break
  }

  let backupDir: string
  while (true) {
    backupDir = await prompt('Enter backup directory:')
    let st: fs.Stats | null
    try {
      st = await fs.promises.lstat(backupDir)
    } catch (err) {
      if (!isFileNotFound(err)) {
        throw err
      }
      st = null
    }
    if (st != null && !st.isDirectory()) {
      logger.warn('init: invalid backup directory - not a directory')
      continue
    }
    break
  }

  let masterPassword: string
  while (true) {
    masterPassword = await prompt('Enter master password:', { mask: true })

    const masterPassword2 = await prompt('Enter master password again for sure:', { mask: true })
    if (masterPassword2 !== masterPassword) {
      logger.warn('init: password confirmation mismatch')
      continue
    }
    logger.debug('init: passwords matched successfully')
    break
  }

  const salt = await generateSalt()
  logger.debug('init: salt generated')

  const dek = deriveKey(masterPassword, salt)
  await writeDek(dek)
  logger.debug('init: DEK derived and saved')
  await writeConfig({ sourceDir, backupDir })
  logger.debug('init: config created')

  logger.info('init: completed successfully')
}
