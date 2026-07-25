from pathlib import Path

p = Path('src/pages/BulkImport.tsx')
s = p.read_text()
old = """                      const showResolver = row.match.confidence === 'ambiguous'
                        || row.match.confidence === 'none'
                        || manualMatches.has(row.index)
"""
new = """                      const showResolver = row.match.confidence === 'ambiguous'
                        || (mode === 'results' && row.match.confidence === 'none')
                        || manualMatches.has(row.index)
"""
if old not in s:
    raise SystemExit('Resolver visibility marker not found')
s = s.replace(old, new, 1)
p.write_text(s)

p = Path('e2e/bulk-import-match-review.spec.ts')
s = p.read_text()
old = """  await expect(page.getByText('Ready', { exact: true })).toBeVisible()
"""
new = """  const reviewRow = page.getByRole('row').filter({ hasText: 'Unknown Alias' })
  await expect(reviewRow.getByText('Ready', { exact: true })).toBeVisible()
"""
if old not in s:
    raise SystemExit('Ready assertion marker not found')
p.write_text(s.replace(old, new, 1))
