from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:180]!r}")
    file.write_text(text.replace(old, new, 1))


path = 'src/components/HudlImportWizard.tsx'

replace_once(
    path,
    "} from '../lib/hudlImport'\nimport { FORMATIONS, PERSONNEL, PLAY_CALLS, labelFor } from '../lib/filmAnalysis'\n",
    "} from '../lib/hudlImport'\nimport {\n  isExcelHudlBreakdown,\n  isLegacyExcelHudlBreakdown,\n  parseHudlWorkbookFile,\n} from '../lib/hudlWorkbook'\nimport { FORMATIONS, PERSONNEL, PLAY_CALLS, labelFor } from '../lib/filmAnalysis'\n",
)

replace_once(
    path,
    "  async function loadBreakdownFile(file: File) {\n    const text = await file.text()\n    setBreakdownText(text)\n    parseBreakdown(text)\n  }\n",
    "  async function loadBreakdownFile(file: File) {\n    try {\n      if (isLegacyExcelHudlBreakdown(file.name)) {\n        throw new Error('Legacy .xls files are not supported. In Excel, choose Save As and select .xlsx, then upload that file.')\n      }\n      if (isExcelHudlBreakdown(file.name)) {\n        const workbook = await parseHudlWorkbookFile(file)\n        setBreakdownText('')\n        setTable(workbook.table)\n        setMapping(autoMapHudlColumns(workbook.table.headers))\n        setOverrides({})\n        setSelectedRow(0)\n        const warning = workbook.warnings.length ? ` ${workbook.warnings.join(' ')}` : ''\n        setMessage(`${workbook.table.rows.length} breakdown rows loaded from ${workbook.sheetName} in ${file.name}.${warning}`)\n        return\n      }\n      const text = await file.text()\n      setBreakdownText(text)\n      parseBreakdown(text)\n    } catch (error: unknown) {\n      setMessage(error instanceof Error ? error.message : 'Could not read this Hudl breakdown file.')\n    }\n  }\n",
)

replace_once(
    path,
    "                2 · Breakdown data\n",
    "                2 · Hudl breakdown file\n",
)

replace_once(
    path,
    "                  Upload CSV / TSV\n                  <input\n                    type=\"file\"\n                    accept=\".csv,.tsv,.txt,text/csv,text/tab-separated-values\"\n",
    "                  Upload Excel / CSV / TSV\n                  <input\n                    type=\"file\"\n                    accept=\".xlsx,.xlsm,.xls,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/tab-separated-values\"\n",
)

replace_once(
    path,
    "              </div>\n              <textarea\n                value={breakdownText}\n",
    "              </div>\n              <div className=\"mt-2 text-[11px] leading-relaxed text-muted\">\n                Upload the Excel breakdown downloaded from Hudl. FAI scans the workbook sheets, finds the strongest Hudl header row, and keeps the existing column-mapping review. Modern .xlsx and .xlsm files are supported; resave legacy .xls files as .xlsx.\n              </div>\n              <textarea\n                value={breakdownText}\n",
)

print('Hudl Excel workbook import integrated into the breakdown wizard.')
