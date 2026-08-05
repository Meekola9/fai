import { autoMapHudlColumns, type HudlTable } from './hudlImport'

export interface HudlWorkbookParseResult {
  table: HudlTable
  sheetName: string
  sheetNames: string[]
  headerRow: number
  warnings: string[]
}

interface ZipEntry {
  name: string
  compressionMethod: number
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
}

interface WorkbookSheet {
  name: string
  path: string
}

interface ParsedSheet {
  name: string
  table: HudlTable
  headerRow: number
  mappedFields: number
  headerCells: number
}

const ZIP_LOCAL_FILE = 0x04034b50
const ZIP_CENTRAL_FILE = 0x02014b50
const ZIP_END = 0x06054b50
const textDecoder = new TextDecoder('utf-8')

function readUint16(view: DataView, offset: number): number {
  return view.getUint16(offset, true)
}

function readUint32(view: DataView, offset: number): number {
  return view.getUint32(offset, true)
}

function normalizeZipPath(path: string): string {
  const output: string[] = []
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') output.pop()
    else output.push(part)
  }
  return output.join('/')
}

function resolveZipPath(basePath: string, target: string): string {
  if (target.startsWith('/')) return normalizeZipPath(target.slice(1))
  const baseDirectory = basePath.split('/').slice(0, -1).join('/')
  return normalizeZipPath(`${baseDirectory}/${target}`)
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const minimum = Math.max(0, bytes.byteLength - 65_557)
  for (let offset = bytes.byteLength - 22; offset >= minimum; offset -= 1) {
    if (readUint32(view, offset) === ZIP_END) return offset
  }
  throw new Error('This file is not a valid .xlsx workbook.')
}

function readZipEntries(bytes: Uint8Array): Map<string, ZipEntry> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const endOffset = findEndOfCentralDirectory(bytes)
  const entryCount = readUint16(view, endOffset + 10)
  const centralDirectoryOffset = readUint32(view, endOffset + 16)
  const entries = new Map<string, ZipEntry>()
  let offset = centralDirectoryOffset

  for (let index = 0; index < entryCount; index += 1) {
    if (readUint32(view, offset) !== ZIP_CENTRAL_FILE) {
      throw new Error('The Excel workbook directory is damaged.')
    }
    const compressionMethod = readUint16(view, offset + 10)
    const compressedSize = readUint32(view, offset + 20)
    const uncompressedSize = readUint32(view, offset + 24)
    const nameLength = readUint16(view, offset + 28)
    const extraLength = readUint16(view, offset + 30)
    const commentLength = readUint16(view, offset + 32)
    const localHeaderOffset = readUint32(view, offset + 42)
    const name = normalizeZipPath(textDecoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength)))
    entries.set(name, {
      name,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    })
    offset += 46 + nameLength + extraLength + commentLength
  }

  return entries
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot open compressed Excel files. Update the browser or save the Hudl breakdown as CSV.')
  }
  const payload = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const stream = new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function readZipEntry(
  workbookBytes: Uint8Array,
  entry: ZipEntry,
): Promise<Uint8Array> {
  const view = new DataView(workbookBytes.buffer, workbookBytes.byteOffset, workbookBytes.byteLength)
  const offset = entry.localHeaderOffset
  if (readUint32(view, offset) !== ZIP_LOCAL_FILE) {
    throw new Error(`The Excel workbook entry ${entry.name} is damaged.`)
  }
  const nameLength = readUint16(view, offset + 26)
  const extraLength = readUint16(view, offset + 28)
  const dataOffset = offset + 30 + nameLength + extraLength
  const compressed = workbookBytes.subarray(dataOffset, dataOffset + entry.compressedSize)
  if (entry.compressionMethod === 0) return compressed.slice()
  if (entry.compressionMethod === 8) {
    const inflated = await inflateRaw(compressed)
    if (entry.uncompressedSize && inflated.byteLength !== entry.uncompressedSize) {
      throw new Error(`The Excel workbook entry ${entry.name} did not decompress correctly.`)
    }
    return inflated
  }
  throw new Error(`Unsupported Excel compression method ${entry.compressionMethod}.`)
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function attributeValue(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`(?:^|\\s)${name.replace(':', '\\:')}=(?:"([^"]*)"|'([^']*)')`, 'i'))
  const value = match?.[1] ?? match?.[2]
  return value === undefined ? undefined : decodeXmlEntities(value)
}

function textElements(xml: string): string[] {
  return [...xml.matchAll(/<(?:[A-Za-z0-9_]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_]+:)?t>/gi)]
    .map((match) => decodeXmlEntities(match[1]))
}

function parseSharedStrings(xml?: string): string[] {
  if (!xml) return []
  return [...xml.matchAll(/<(?:[A-Za-z0-9_]+:)?si\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_]+:)?si>/gi)]
    .map((match) => textElements(match[1]).join(''))
}

function parseRelationships(xml?: string): Map<string, string> {
  const relationships = new Map<string, string>()
  if (!xml) return relationships
  for (const match of xml.matchAll(/<(?:[A-Za-z0-9_]+:)?Relationship\b[^>]*\/?\s*>/gi)) {
    const id = attributeValue(match[0], 'Id')
    const target = attributeValue(match[0], 'Target')
    if (id && target) relationships.set(id, target)
  }
  return relationships
}

function parseWorkbookSheets(
  workbookXml: string | undefined,
  relationshipsXml: string | undefined,
  entryNames: readonly string[],
): WorkbookSheet[] {
  const relationships = parseRelationships(relationshipsXml)
  const sheets: WorkbookSheet[] = []
  if (workbookXml) {
    for (const match of workbookXml.matchAll(/<(?:[A-Za-z0-9_]+:)?sheet\b[^>]*\/?\s*>/gi)) {
      const name = attributeValue(match[0], 'name')
      const relationId = attributeValue(match[0], 'r:id')
      const target = relationId ? relationships.get(relationId) : undefined
      if (name && target) sheets.push({ name, path: resolveZipPath('xl/workbook.xml', target) })
    }
  }
  if (sheets.length > 0) return sheets
  return entryNames
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
    .map((path, index) => ({ name: `Sheet ${index + 1}`, path }))
}

function isDateFormat(formatCode: string): boolean {
  const cleaned = formatCode
    .replace(/"[^"]*"/g, '')
    .replace(/\\./g, '')
    .replace(/\[[^\]]*]/g, '')
    .toLowerCase()
  return /(^|[^a-z])[dmyhs]+([^a-z]|$)/.test(cleaned)
}

function parseDateStyleIndexes(stylesXml?: string): Set<number> {
  const dateNumFmtIds = new Set<number>([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47])
  if (!stylesXml) return new Set()
  for (const match of stylesXml.matchAll(/<(?:[A-Za-z0-9_]+:)?numFmt\b[^>]*\/?\s*>/gi)) {
    const id = Number(attributeValue(match[0], 'numFmtId'))
    const code = attributeValue(match[0], 'formatCode')
    if (Number.isFinite(id) && code && isDateFormat(code)) dateNumFmtIds.add(id)
  }
  const cellXfs = stylesXml.match(/<(?:[A-Za-z0-9_]+:)?cellXfs\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_]+:)?cellXfs>/i)?.[1]
  const indexes = new Set<number>()
  if (!cellXfs) return indexes
  let styleIndex = 0
  for (const match of cellXfs.matchAll(/<(?:[A-Za-z0-9_]+:)?xf\b[^>]*\/?\s*>/gi)) {
    const numFmtId = Number(attributeValue(match[0], 'numFmtId'))
    if (dateNumFmtIds.has(numFmtId)) indexes.add(styleIndex)
    styleIndex += 1
  }
  return indexes
}

function excelSerialToDate(value: number): string {
  const milliseconds = Date.UTC(1899, 11, 30) + value * 86_400_000
  const date = new Date(milliseconds)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toISOString().slice(0, 10)
}

function columnIndex(reference: string): number {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase()
  if (!letters) return 0
  let index = 0
  for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64
  return Math.max(0, index - 1)
}

function cellValue(
  cellTag: string,
  cellBody: string,
  sharedStrings: readonly string[],
  dateStyleIndexes: ReadonlySet<number>,
): string {
  const type = attributeValue(cellTag, 't')
  const styleIndex = Number(attributeValue(cellTag, 's'))
  if (type === 'inlineStr') return textElements(cellBody).join('')
  const raw = cellBody.match(/<(?:[A-Za-z0-9_]+:)?v\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_]+:)?v>/i)?.[1] ?? ''
  const decoded = decodeXmlEntities(raw)
  if (type === 's') return sharedStrings[Number(decoded)] ?? ''
  if (type === 'b') return decoded === '1' ? 'TRUE' : 'FALSE'
  if (type === 'str') return decoded
  if (Number.isFinite(styleIndex) && dateStyleIndexes.has(styleIndex)) {
    const serial = Number(decoded)
    if (Number.isFinite(serial)) return excelSerialToDate(serial)
  }
  return decoded
}

function parseWorksheetMatrix(
  xml: string,
  sharedStrings: readonly string[],
  dateStyleIndexes: ReadonlySet<number>,
): string[][] {
  const rows: string[][] = []
  for (const rowMatch of xml.matchAll(/<(?:[A-Za-z0-9_]+:)?row\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_]+:)?row>/gi)) {
    const row: string[] = []
    const body = rowMatch[1]
    for (const cellMatch of body.matchAll(/(<(?:[A-Za-z0-9_]+:)?c\b[^>]*>)([\s\S]*?)<\/(?:[A-Za-z0-9_]+:)?c>/gi)) {
      const reference = attributeValue(cellMatch[1], 'r') ?? ''
      row[columnIndex(reference)] = cellValue(cellMatch[1], cellMatch[2], sharedStrings, dateStyleIndexes)
    }
    rows.push(row.map((value) => value ?? ''))
  }
  return rows
}

function uniqueHeaders(values: readonly string[]): string[] {
  const used = new Map<string, number>()
  return values.map((value, index) => {
    const base = value.trim() || `Column ${index + 1}`
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    return seen === 0 ? base : `${base} ${seen + 1}`
  })
}

function buildTable(matrix: readonly string[][], headerIndex: number): HudlTable {
  const width = Math.max(...matrix.map((row) => row.length), 0)
  const headers = uniqueHeaders(Array.from({ length: width }, (_, index) => matrix[headerIndex]?.[index] ?? ''))
  const rows = matrix
    .slice(headerIndex + 1)
    .filter((values) => values.some((value) => value.trim().length > 0))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ''])))
  return { headers, rows, delimiter: ',' }
}

function bestHeaderRow(matrix: readonly string[][]): number {
  let bestIndex = -1
  let bestScore = -1
  for (let index = 0; index < Math.min(matrix.length, 30); index += 1) {
    const values = matrix[index] ?? []
    const nonEmpty = values.filter((value) => value.trim()).length
    if (nonEmpty < 2) continue
    const mapped = Object.keys(autoMapHudlColumns(values)).length
    const score = mapped * 100 + nonEmpty - index / 100
    if (score > bestScore) {
      bestIndex = index
      bestScore = score
    }
  }
  return bestIndex
}

function parseSheet(name: string, matrix: string[][]): ParsedSheet | undefined {
  const headerIndex = bestHeaderRow(matrix)
  if (headerIndex < 0) return undefined
  const table = buildTable(matrix, headerIndex)
  if (table.rows.length === 0) return undefined
  return {
    name,
    table,
    headerRow: headerIndex + 1,
    mappedFields: Object.keys(autoMapHudlColumns(table.headers)).length,
    headerCells: table.headers.filter((header) => !/^Column \d+$/.test(header)).length,
  }
}

export function isExcelHudlBreakdown(name: string): boolean {
  return /\.(xlsx|xlsm)$/i.test(name)
}

export function isLegacyExcelHudlBreakdown(name: string): boolean {
  return /\.xls$/i.test(name)
}

export async function parseHudlWorkbook(buffer: ArrayBuffer): Promise<HudlWorkbookParseResult> {
  const bytes = new Uint8Array(buffer)
  const entries = readZipEntries(bytes)
  const xmlCache = new Map<string, string>()

  async function readXml(path: string): Promise<string | undefined> {
    const normalized = normalizeZipPath(path)
    if (xmlCache.has(normalized)) return xmlCache.get(normalized)
    const entry = entries.get(normalized)
    if (!entry) return undefined
    const xml = textDecoder.decode(await readZipEntry(bytes, entry))
    xmlCache.set(normalized, xml)
    return xml
  }

  const workbookXml = await readXml('xl/workbook.xml')
  const relationshipsXml = await readXml('xl/_rels/workbook.xml.rels')
  const sharedStrings = parseSharedStrings(await readXml('xl/sharedStrings.xml'))
  const dateStyleIndexes = parseDateStyleIndexes(await readXml('xl/styles.xml'))
  const sheets = parseWorkbookSheets(workbookXml, relationshipsXml, [...entries.keys()])
  const parsedSheets: ParsedSheet[] = []

  for (const sheet of sheets) {
    const xml = await readXml(sheet.path)
    if (!xml) continue
    const parsed = parseSheet(sheet.name, parseWorksheetMatrix(xml, sharedStrings, dateStyleIndexes))
    if (parsed) parsedSheets.push(parsed)
  }

  if (parsedSheets.length === 0) {
    throw new Error('No playable Hudl breakdown rows were found in this Excel workbook.')
  }

  parsedSheets.sort((left, right) =>
    right.mappedFields - left.mappedFields
      || right.table.rows.length - left.table.rows.length
      || right.headerCells - left.headerCells,
  )
  const selected = parsedSheets[0]
  const warnings: string[] = []
  if (sheets.length > 1) warnings.push(`Selected worksheet “${selected.name}” from ${sheets.length} workbook sheets.`)
  if (selected.headerRow > 1) warnings.push(`Detected the Hudl header on row ${selected.headerRow}.`)
  if (selected.mappedFields === 0) warnings.push('No standard Hudl columns were recognized automatically; review the column mapping before import.')

  return {
    table: selected.table,
    sheetName: selected.name,
    sheetNames: sheets.map((sheet) => sheet.name),
    headerRow: selected.headerRow,
    warnings,
  }
}

export async function parseHudlWorkbookFile(
  file: Pick<File, 'name' | 'arrayBuffer'>,
): Promise<HudlWorkbookParseResult> {
  if (isLegacyExcelHudlBreakdown(file.name)) {
    throw new Error('Legacy .xls files are not supported. In Excel, choose Save As and select .xlsx, then upload that file.')
  }
  if (!isExcelHudlBreakdown(file.name)) {
    throw new Error('Choose a Hudl .xlsx or .xlsm workbook.')
  }
  return parseHudlWorkbook(await file.arrayBuffer())
}
