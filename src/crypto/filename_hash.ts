import crypto from 'node:crypto'

export function hashFilename(relativePath: string, dek: Uint8Array): string {
  const hmac = crypto.createHmac('sha256', dek)
  hmac.update(relativePath)
  return hmac.digest('base64url')
}
