import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const source = path.resolve(dirname, '../src/admin/styles.css')
const targetDir = path.resolve(dirname, '../dist/admin')
const target = path.resolve(targetDir, 'styles.css')

await mkdir(targetDir, { recursive: true })
await writeFile(target, await readFile(source))
