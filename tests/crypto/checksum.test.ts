import { strictEqual } from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { describe, test } from 'vitest'
import { computeChecksum } from '../../src/crypto/checksum'
import { DEK_LENGTH } from '../../src/crypto/file_encryption'
import { createTestDir } from '../test_util'

const DEK = Buffer.from('CHECKSUM_TEST'.repeat(3)).subarray(DEK_LENGTH)

describe('checksum', () => {
  test('com', async () => {
    const testDir = await createTestDir()
    try {
      await fs.promises.writeFile(path.join(testDir.path, 'a.txt'), 'file contents')
      const hash = await computeChecksum('a.txt', path.join(testDir.path, 'a.txt'), DEK)
      strictEqual('nb37bCLb615Smm353dNbMwb9kNNFBLSpUeJPFJH8Akg=', hash)
    } finally {
      testDir.dispose()
    }
  })
})
