# Hudl Excel breakdown import

FAI can import the Excel breakdown exported from Hudl directly through the existing **Film Room → Import Clips & Breakdown** workflow.

## Supported files

- `.xlsx`
- `.xlsm`
- `.csv`
- `.tsv`
- pasted table rows

Legacy binary `.xls` files are not parsed. Open the file in Excel and use **Save As → Excel Workbook (.xlsx)** before uploading it.

## Import flow

1. Open Film Room and expand **Import Clips & Breakdown**.
2. Select the downloaded Hudl video clips when available.
3. Choose **Upload Excel / CSV / TSV** and select the Hudl workbook.
4. FAI scans the workbook sheets and chooses the sheet with the strongest recognized Hudl column set.
5. FAI detects the header row even when title or summary rows appear above it.
6. Review the automatic column mapping, game defaults, clip pairing, formations, personnel, play type, and concept.
7. Import the reviewed plays.

## Workbook handling

The parser runs in the browser and does not upload the workbook to an external spreadsheet service. It supports standard Excel workbook storage, shared strings, inline strings, numeric cells, and Excel-formatted dates.

When multiple worksheets exist, FAI ranks them by recognized Hudl headers and usable breakdown rows. The selected sheet and detected header row are shown in the import message.

## Preserved FAI behavior

Excel rows feed the same preview and mapping system already used for CSV and TSV imports. Existing duplicate protection, clip matching, Hudl source metadata, formation previews, cleaned CSV export, and manual coach overrides remain unchanged.
