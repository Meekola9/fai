import { mkdir, copyFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const destination = new URL('../public/ocr/', import.meta.url)
await mkdir(destination, { recursive: true })
for (const [source, name] of [
  ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'eng.traineddata.gz'],
]) await copyFile(require.resolve(source), new URL(name, destination))
