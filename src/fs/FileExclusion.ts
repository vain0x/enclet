import ignore, { Ignore } from 'ignore'
import fs from 'node:fs'
import path from 'node:path'
import { logger } from '../logger'

export class FileExclusion {
  #ig: Ignore

  constructor(sourceDir: string) {
    logger.debug(`FileExclusion: initializing for directory ${sourceDir}`)
    this.#ig = ignore()
    const gitignorePath = path.join(sourceDir, '.gitignore')
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf-8')
      this.#ig.add(content)
    }
  }

  isExcluded(relativePath: string): boolean {
    return this.#ig.ignores(relativePath)
  }
}
