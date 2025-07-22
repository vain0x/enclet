import * as process from 'node:process'
import { backupCommand } from './cli/backup'
import { initCommand } from './cli/init'
import { restoreCommand } from './cli/restore'
import { verifyCommand } from './cli/verify'
import { rl } from './tui'

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    printHelp()
    process.exit(1)
  }

  const [cmd, ...rest] = args

  try {
    switch (cmd) {
      case 'init':
        await initCommand()
        break
      case 'backup':
        await backupCommand()
        break
      case 'restore':
        await restoreCommand()
        break
      case 'verify':
        await verifyCommand()
        break
      case '--help':
      case '-h':
      case 'help':
        printHelp()
        break
      case '--version':
      case '-v':
      case 'version':
        printVersion()
        break
      default:
        console.error(`Unknown command: ${cmd}`)
        printHelp()
        process.exit(1)
    }

    rl.close()
  } catch (err: any) {
    console.error(`Error: ${err?.message || err}`)
    process.exit(1)
  }
}

function printHelp() {
  console.log(`
enclet - end-to-end encrypted backup tool

USAGE
  enclet <command> [options]

COMMANDS
  init       Initialize new configuration
  backup     Update backup
  restore    Import configuration from backup directory
  verify     Verify backup integrity
  help       Show help (-h, --help)
  version    Show version (-V, --version)
`)
}

function printVersion() {
  process.stdout.write('enclet version 0.1.0\n')
}

main()
