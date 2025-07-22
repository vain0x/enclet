import fs from 'node:fs'
import path from 'node:path'
import { isFileNotFound } from './fs/file_util'
import { getAppDir } from './model/app_dir'

export const CONFIG_FILE = path.join(getAppDir(), 'app.conf')

export interface Config {
  sourceDir: string
  backupDir: string
}

let configMemo: Config | undefined = undefined

export async function loadConfig() {
  if (configMemo) {
    return configMemo
  }
  let read: string
  try {
    read = await fs.promises.readFile(CONFIG_FILE, 'utf-8')
  } catch (err) {
    if (isFileNotFound(err)) {
      throw new Error('missing configuration file', { cause: err })
    }
    throw err
  }
  const parsed = new Map(parseConf(read))
  configMemo = {
    sourceDir: parsed.get('sourceDir') || '',
    backupDir: parsed.get('backupDir') || '',
  }
  return configMemo
}

const parseConf = (s: string): [string, string][] => {
  const output: [string, string][] = []
  for (let line of s.split(/\r?\n/g)) {
    line = line.trim()
    if (!line || line.startsWith('#')) continue
    const equal = line.indexOf('=')
    if (equal < 0) continue
    const key = line.slice(0, equal).trim()
    const value = line.slice(equal + 1).trim()
    output.push([key, value])
  }
  return output
}

export async function writeConfig(config: Config) {
  configMemo = undefined
  await fs.promises.writeFile(
    CONFIG_FILE,
    Object.entries(config)
      .map(([key, value]) => `${key} = ${value}\n`)
      .join('')
  )
}
