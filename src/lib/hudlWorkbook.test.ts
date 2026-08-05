import { describe, expect, it } from 'vitest'
import {
  isExcelHudlBreakdown,
  isLegacyExcelHudlBreakdown,
  parseHudlWorkbook,
  parseHudlWorkbookFile,
} from './hudlWorkbook'
import { autoMapHudlColumns } from './hudlImport'

const encoder = new TextEncoder()

function uint16(value: number): Uint8Array {
  const bytes = new Uint8Array(2)
  new DataView(bytes.buffer).setUint16(0, value, true)
  return bytes
}

function uint32(value: number): Uint8Array {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value, true)
  return bytes
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const output = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.byteLength
  }
  return output
}

function storedZip(files: Record<string, string>): ArrayBuffer {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let localOffset = 0

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name)
    const data = encoder.encode(content)
    const localHeader = concat([
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(data.byteLength),
      uint32(data.byteLength),
      uint16(nameBytes.byteLength),
      uint16(0),
      nameBytes,
      data,
    ])
    localParts.push(localHeader)

    centralParts.push(concat([
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(data.byteLength),
      uint32(data.byteLength),
      uint16(nameBytes.byteLength),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(localOffset),
      nameBytes,
    ]))
    localOffset += localHeader.byteLength
  }

  const local = concat(localParts)
  const central = concat(centralParts)
  const end = concat([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(centralParts.length),
    uint16(centralParts.length),
    uint32(central.byteLength),
    uint32(local.byteLength),
    uint16(0),
  ])
  return concat([local, central, end]).buffer
}

function workbookFixture(): ArrayBuffer {
  const shared = [
    'PLAY #', 'ODK', 'DATE', 'OFF FORM', 'PERSONNEL', 'OFF PLAY', 'PLAY TYPE',
    'DN', 'DIST', 'YD LINE', 'HASH', 'GN/LS', 'Trips', 'Inside Zone', 'Run',
  ]
  const sharedStrings = `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${shared.map((value) => `<si><t>${value}</t></si>`).join('')}</sst>`
  const headerCells = shared.slice(0, 12).map((_, index) => {
    const column = String.fromCharCode(65 + index)
    return `<c r="${column}2" t="s"><v>${index}</v></c>`
  }).join('')

  return storedZip({
    'xl/workbook.xml': `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Summary" sheetId="1" r:id="rId1"/><sheet name="Opponent Breakdown" sheetId="2" r:id="rId2"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>`,
    'xl/sharedStrings.xml': sharedStrings,
    'xl/styles.xml': `<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14"/></cellXfs></styleSheet>`,
    'xl/worksheets/sheet1.xml': `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Game summary</t></is></c><c r="B1" t="inlineStr"><is><t>Value</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Opponent</t></is></c><c r="B2" t="inlineStr"><is><t>Rivals</t></is></c></row></sheetData></worksheet>`,
    'xl/worksheets/sheet2.xml': `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Hudl Breakdown Export</t></is></c></row><row r="2">${headerCells}</row><row r="3"><c r="A3"><v>1</v></c><c r="B3" t="inlineStr"><is><t>O</t></is></c><c r="C3" s="1"><v>46239</v></c><c r="D3" t="s"><v>12</v></c><c r="E3"><v>11</v></c><c r="F3" t="s"><v>13</v></c><c r="G3" t="s"><v>14</v></c><c r="H3"><v>1</v></c><c r="I3"><v>10</v></c><c r="J3" t="inlineStr"><is><t>OWN 35</t></is></c><c r="K3" t="inlineStr"><is><t>L</t></is></c><c r="L3"><v>6</v></c></row></sheetData></worksheet>`,
  })
}

describe('Hudl Excel workbook import', () => {
  it('recognizes modern Excel files and separates legacy .xls files', () => {
    expect(isExcelHudlBreakdown('week-1.xlsx')).toBe(true)
    expect(isExcelHudlBreakdown('week-1.XLSM')).toBe(true)
    expect(isLegacyExcelHudlBreakdown('week-1.xls')).toBe(true)
    expect(isExcelHudlBreakdown('week-1.csv')).toBe(false)
  })

  it('selects the worksheet with Hudl columns, detects its header, and preserves typed cell values', async () => {
    const result = await parseHudlWorkbook(workbookFixture())

    expect(result.sheetName).toBe('Opponent Breakdown')
    expect(result.headerRow).toBe(2)
    expect(result.table.rows).toHaveLength(1)
    expect(result.table.rows[0]).toMatchObject({
      'PLAY #': '1',
      ODK: 'O',
      DATE: '2026-08-05',
      'OFF FORM': 'Trips',
      PERSONNEL: '11',
      'OFF PLAY': 'Inside Zone',
      'PLAY TYPE': 'Run',
      DN: '1',
      DIST: '10',
      'YD LINE': 'OWN 35',
      HASH: 'L',
      'GN/LS': '6',
    })
    expect(autoMapHudlColumns(result.table.headers)).toMatchObject({
      clip: 'PLAY #',
      side: 'ODK',
      date: 'DATE',
      formation: 'OFF FORM',
      concept: 'OFF PLAY',
    })
    expect(result.warnings.join(' ')).toContain('Selected worksheet')
    expect(result.warnings.join(' ')).toContain('header on row 2')
  })

  it('gives a corrective message for binary legacy workbooks', async () => {
    const file = {
      name: 'old-hudl-export.xls',
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Pick<File, 'name' | 'arrayBuffer'>

    await expect(parseHudlWorkbookFile(file)).rejects.toThrow('Save As')
  })
})
