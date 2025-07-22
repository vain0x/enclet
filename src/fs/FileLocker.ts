import fs from 'node:fs'
import path from 'node:path'

export class FileLocker {
  #file: string

  constructor(dir: string) {
    this.#file = path.join(dir, '.lock')
  }

  acquire() {
    if (this.isLocked()) {
      throw new Error('Lock file exists. Another process might be running. Consider to delete lockfile and try again: ' + this.#file)
    }
    const info = `pid: ${process.pid}\ntimestamp: ${new Date().toISOString()}\n`
    fs.writeFileSync(this.#file, info, { flag: 'wx' })
  }

  release() {
    if (this.isLocked()) {
      fs.unlinkSync(this.#file)
    }
  }

  isLocked() {
    return fs.existsSync(this.#file)
  }
}
