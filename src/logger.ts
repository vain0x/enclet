import fs from 'node:fs'
import path from 'node:path'
import { getAppDir } from './model/app_dir'

const DEV = process.env.NODE_ENV === 'development'
const LOGS_DIR = path.join(getAppDir(), 'logs')

// appDir/logs/yyyy-MM.log
const currentLogFile = () => {
  const t = new Date()
  const month = D(t.getFullYear(), 4) + '-' + D(t.getMonth() + 1)
  return path.join(LOGS_DIR, month + '.log')
}

class Logger {
  log(message: string) {
    this.info(message)
  }
  debug(message: string): void {
    this.#write('DEBUG', message)
  }
  info(message: string): void {
    this.#write('INFO', message)
  }
  warn(message: string): void {
    this.#write('WARN', message)
  }
  error(message: string): void {
    this.#write('ERROR', message)
  }

  #write(level: LogLevel, message: string): void {
    const timestamp = new Date()
    const line = `[${toDateTime(timestamp)}] [${level.padStart(5)}] ${message}\n`
    const file = currentLogFile()
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.appendFileSync(file, line)
    } catch (err) {
      throw new Error('During writing a log', { cause: err })
    }
    if (DEV || level !== 'DEBUG') {
      process.stderr.write(line)
    }
  }
}

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'OFF'

// const toDateOnly = (t: Date) => {
//   const y = t.getFullYear(), M = t.getMonth() + 1, d = t.getDate()
//   return `${D(y, 4)}-${D(M)}-${D(d)}`
// }
const toDateTime = (t: Date) => {
  const y = t.getFullYear(), M = t.getMonth() + 1, d = t.getDate()
  const h = t.getHours(), m = t.getMinutes(), s = t.getSeconds()
  return `${D(y, 4)}-${D(M)}-${D(d)} ${D(h)}:${D(m)}:${D(s)}`
}
const D = (value: number, length = 2) => {
  return value.toString().padStart(length, '0')
}

export const logger = new Logger()
