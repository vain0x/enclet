import fs from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

export const createTestDir = async () => {
  const dir = await fs.promises.mkdtemp(path.join(tmpdir(), 'test-'))
  return {
    path: dir,
    dispose: () => {
      const _promise = fs.promises.rm(dir, { recursive: true, maxRetries: 3 }).catch(err => {
        console.warn('Give up removing temporary directory', err)
      })
    },
  }
}
