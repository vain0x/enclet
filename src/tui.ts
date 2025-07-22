import { createInterface } from 'node:readline/promises'

export const rl = createInterface(process.stdin, process.stdout)

export const prompt = async (message: string, options?: { mask?: boolean }) => {
  return await rl.question(message)
}
