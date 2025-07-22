import { relative, sep } from 'node:path'

/**
 * Computes normalized relative path from `from` to `to`.
 *
 * @param from Base path (directory)
 * @param to Converted path (file)
 */
export function makeRelativePath(from: string, to: string): string {
  return relative(from, to).split(sep).join('/')
}
