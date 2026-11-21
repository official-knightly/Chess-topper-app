import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const release = join(root, 'release')
const output = join(release, 'bun-ws-worker.exe')
mkdirSync(release, { recursive: true })

const platform = process.platform === 'win32' ? 'windows' : process.platform
const target = platform === 'windows' && process.arch === 'x64'
  ? 'bun-windows-x64-baseline'
  : `bun-${platform}-${process.arch}`

const result = await Bun.build({
  entrypoints: [join(root, 'electron', 'bun-ws-worker.cjs')],
  compile: {
    target,
    outfile: output,
    autoloadDotenv: false,
    autoloadBunfig: false,
  },
})
if (!result.success) {
  for (const log of result.logs) console.error(log)
  throw new Error('Failed to compile the Chessist local worker.')
}
console.log(`Built Chess Topper local worker for ${target}: ${output}`)
