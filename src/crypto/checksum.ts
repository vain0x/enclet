import { createHmac } from 'node:crypto'
import fs from 'node:fs'

/**
 * Computes checksum from relative path and file contents.
 */
export async function computeChecksum(relativePath: string, absolutePath: string, dek: Uint8Array): Promise<string> {
  const hmac = createHmac('sha256', dek)
  hmac.update(relativePath)
  hmac.update(await fs.promises.readFile(absolutePath))
  return hmac.digest('base64').slice(0, 8)
}
