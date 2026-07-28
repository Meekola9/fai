// ---------------------------------------------------------------------------
// Turn a defensive scouting TendencyReport into downloadable deliverables:
// a CSV (opens in Excel/Sheets) and a self-contained printable HTML page
// (open in a browser, or Print → Save as PDF). Both are pure string builders
// so they are trivially testable and carry no side effects.
// ---------------------------------------------------------------------------
import type { CountShare, TendencyGroup, TendencyReport } from './filmAnalysis'

function pct(share: number): string {
  return `${Math.round(share * 100)}%`
}

function topList(items: CountShare[]): string {
  return items.map((item) => `${item.label} ${pct(item.share)}`).join('; ')
}

/** RFC-4180-style escaping so commas, quotes, and newlines survive Excel. */
function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function csvRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(',')
}

const GROUP_COLUMNS = [
  'Section',
  'Situation',
  'Plays',
  'Run %',
  'Pass %',
  'Avg Gain',
  'Top Formations',
  'Top Concepts',
]

function groupRow(section: string, group: TendencyGroup): (string | number)[] {
  return [
    section,
    group.label,
    group.plays,
    pct(group.runShare),
    pct(group.passShare),
    group.avgGain,
    topList(group.topFormations),
    topList(group.topConcepts),
  ]
}

export function scoutingReportCsv(report: TendencyReport, opponent?: string): string {
  const lines: string[] = []
  lines.push(csvRow(['FAI Defensive Scouting Report']))
  lines.push(csvRow(['Opponent', opponent || 'All film']))
  lines.push(csvRow(['Total plays', report.totalPlays]))
  lines.push(csvRow(['Run rate', pct(report.runShare)]))
  lines.push(csvRow(['Pass rate', pct(report.passShare)]))
  lines.push('')
  lines.push(csvRow(GROUP_COLUMNS))

  const sections: [string, TendencyGroup[]][] = [
    ['Down & distance', report.byDownDistance],
    ['Field zone', report.byFieldZone],
    ['Formation', report.byFormation],
    ['Personnel', report.byPersonnel],
  ]
  for (const [section, groups] of sections) {
    for (const group of groups) lines.push(csvRow(groupRow(section, group)))
  }

  return lines.join('\n')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function bar(runShare: number): string {
  const run = Math.round(runShare * 100)
  return `<div class="bar"><span class="run" style="width:${run}%">${run}% run</span><span class="pass" style="width:${100 - run}%">${100 - run}% pass</span></div>`
}

function groupTable(title: string, groups: TendencyGroup[]): string {
  if (groups.length === 0) return ''
  const rows = groups
    .map(
      (g) => `<tr>
        <td class="sit">${escapeHtml(g.label)}</td>
        <td class="num">${g.plays}</td>
        <td class="split">${bar(g.runShare)}</td>
        <td class="num">${g.avgGain}</td>
        <td>${escapeHtml(topList(g.topFormations)) || '—'}</td>
        <td>${escapeHtml(topList(g.topConcepts)) || '—'}</td>
      </tr>`,
    )
    .join('')
  return `<section>
    <h2>${escapeHtml(title)}</h2>
    <table>
      <thead><tr><th>Situation</th><th>Plays</th><th>Run / Pass</th><th>Avg gain</th><th>Top formations</th><th>Top concepts</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`
}

export function scoutingReportHtml(report: TendencyReport, opponent?: string): string {
  const title = `Scouting Report — ${opponent || 'All film'}`
  const sections = [
    groupTable('Situational — down & distance', report.byDownDistance),
    groupTable('Situational — field zone', report.byFieldZone),
    groupTable('By formation', report.byFormation),
    groupTable('By personnel', report.byPersonnel),
  ].join('')

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --run:#ea580c; --pass:#0891b2; }
  * { box-sizing: border-box; }
  body { margin:0; background:#f8fafc; color:var(--ink); font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; line-height:1.5; }
  .wrap { max-width: 960px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
  header { border-bottom: 3px solid var(--ink); padding-bottom: 1rem; margin-bottom: 1.5rem; }
  .eyebrow { font-size:.72rem; font-weight:800; letter-spacing:.2em; text-transform:uppercase; color:var(--muted); }
  h1 { margin:.2rem 0 0; font-size: clamp(1.5rem, 4vw, 2.2rem); }
  .summary { display:flex; flex-wrap:wrap; gap:1.5rem; margin-top:1rem; }
  .stat { }
  .stat .v { font-size:1.8rem; font-weight:900; font-variant-numeric:tabular-nums; }
  .stat .l { font-size:.72rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }
  section { margin-top: 2rem; }
  h2 { font-size:1.05rem; text-transform:uppercase; letter-spacing:.03em; border-left:4px solid var(--run); padding-left:.5rem; }
  table { width:100%; border-collapse:collapse; font-size:.86rem; margin-top:.6rem; }
  th, td { text-align:left; padding:.5rem .6rem; border-bottom:1px solid var(--line); vertical-align:middle; }
  th { font-size:.68rem; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
  td.num, td.sit { font-variant-numeric:tabular-nums; white-space:nowrap; }
  td.sit { font-weight:700; }
  td.split { width:210px; }
  .bar { display:flex; height:20px; border-radius:5px; overflow:hidden; font-size:.62rem; font-weight:800; color:#fff; }
  .bar .run { background:var(--run); display:flex; align-items:center; justify-content:center; min-width:0; }
  .bar .pass { background:var(--pass); display:flex; align-items:center; justify-content:center; min-width:0; }
  footer { margin-top:3rem; font-size:.72rem; color:var(--muted); border-top:1px solid var(--line); padding-top:1rem; }
  .toolbar { position:sticky; top:0; background:#f8fafcee; padding:.6rem 0; margin-bottom:1rem; }
  button { font:inherit; font-weight:700; cursor:pointer; background:var(--ink); color:#fff; border:none; border-radius:8px; padding:.5rem 1rem; }
  @media print { .toolbar { display:none; } body { background:#fff; } }
</style></head>
<body><div class="wrap">
  <div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div>
  <header>
    <div class="eyebrow">FAI · Defensive Scouting Report</div>
    <h1>${escapeHtml(opponent || 'All film')}</h1>
    <div class="summary">
      <div class="stat"><div class="v">${report.totalPlays}</div><div class="l">Plays charted</div></div>
      <div class="stat"><div class="v" style="color:var(--run)">${pct(report.runShare)}</div><div class="l">Run rate</div></div>
      <div class="stat"><div class="v" style="color:var(--pass)">${pct(report.passShare)}</div><div class="l">Pass rate</div></div>
    </div>
  </header>
  ${sections || '<p>No charted scrimmage plays yet. Tag plays in the Film Room to build the report.</p>'}
  <footer>Generated by FAI from charted film. Tendencies reflect only the plays tagged so far — chart more clips for a fuller picture.</footer>
</div></body></html>`
}
