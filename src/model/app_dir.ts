import os from 'node:os'
import path from 'node:path'

/**
 * Gets the path to the application data directory.
 *
 * - `%LOCALAPPDATA%/enclet` on Windows
 * - `$HOME/.config/enclet` otherwise
 */
export const getAppDir = () => {
  if (os.platform() === 'win32') {
    const d = process.env['LOCALAPPDATA']
    if (d) return path.join(d, 'enclet')
  }
  return path.join(os.homedir(), '.config', 'enclet') // TODO: support XDG env
}
