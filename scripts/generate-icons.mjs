import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const source = resolve(root, 'src/assets/chess-topper-knight.svg')
const output = resolve(root, 'build/chess-topper-icon.png')
await mkdir(resolve(root, 'build'), { recursive: true })
await sharp(source, { density: 384 }).resize(512, 512, { fit: 'contain' }).png({ compressionLevel: 9 }).toFile(output)
console.log(`Generated valid Chess Topper app icon: ${output}`)
