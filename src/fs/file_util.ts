import fs from 'node:fs'
import path, { dirname } from 'node:path'
import { logger } from '../logger'
import { makeRelativePath } from './path_util'

/**
 * Recursively collects all file paths in a directory.
 * Returns absolute paths.
 */
export async function getAllFilesRecursively(
  rootDir: string,
  filter?: (relativePath: string) => boolean
): Promise<string[]> {
  const result: string[] = []

  async function walk(currentDir: string) {
    const entries = await fs.promises.readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      const relPath = makeRelativePath(rootDir, fullPath)

      if (!filter || !filter(relPath)) {
        continue
      }

      if (entry.isSymbolicLink()) {
        logger.warn(`file_util: skipping symbolic link ${relPath}`)
        continue
      }
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.isFile()) {
        result.push(fullPath)
      }
    }
  }

  await walk(rootDir)
  return result
}

export async function ensureDirForFile(filePath: string): Promise<void> {
  const dir = dirname(filePath)
  await fs.promises.mkdir(dir, { recursive: true })
}


/**
 * Deletes a file if it exists.
 */
export async function safeDelete(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath)
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err
  }
}

export const isFileNotFound = (err: unknown) => {
  return err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT'
}
