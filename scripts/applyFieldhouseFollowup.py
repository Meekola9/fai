from pathlib import Path


def replace_all(path_str: str, replacements: list[tuple[str, str]]) -> None:
    path = Path(path_str)
    text = path.read_text()
    for old, new in replacements:
        text = text.replace(old, new)
    path.write_text(text)


def replace_once(path_str: str, old: str, new: str) -> None:
    path = Path(path_str)
    text = path.read_text()
    if old in text:
        path.write_text(text.replace(old, new, 1))
        return
    if new in text:
        return
    raise SystemExit(f'Missing patch target in {path_str}: {old[:200]}')


replace_all('src/App.tsx', [
    ("{ to: '/', label: 'Dashboard', icon: '⌂', end: true }", "{ to: '/', label: 'Dashboard', icon: 'DB', end: true }"),
    ("{ to: '/athletes', label: 'Athletes', icon: '◉' }", "{ to: '/athletes', label: 'Athletes', icon: 'AT' }"),
    ("{ to: '/leaderboards', label: 'Rankings', icon: '★' }", "{ to: '/leaderboards', label: 'Rankings', icon: 'RK' }"),
    ('<div className="grid h-12 w-12 place-items-center rounded-xl border border-fai/40 bg-fai/10 text-lg font-black text-fai">FAI</div>', '<div className="brand-mark">FAI</div>'),
    ('className="ml-1 rounded-lg border border-flame/40 bg-flame/10 px-3 py-1.5 text-sm font-bold text-flame"', 'className="ml-1 rounded-md border border-line bg-panel px-3 py-1.5 text-sm font-bold text-chalk"'),
])

replace_once(
    'src/pages/Athletes.tsx',
    "import { Avatar, Card, Pill } from '../components/ui'",
    "import { Avatar, Card, Pill } from '../components/ui'\nimport { PlayerUsageGuide } from '../components/PlayerUsageGuide'",
)
replace_once(
    'src/pages/Athletes.tsx',
    '      <FilterBar events={[]} value={filters} onChange={setFilters} showEventFilter={false} />',
    '''      <details className="rounded-xl border border-line bg-panel px-4 py-3">
        <summary className="cursor-pointer text-sm font-extrabold text-chalk">How FAI deployment roles work</summary>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted">These labels describe meeting-room load, weekly installation, and game-plan responsibility. They are not a ranking of toughness or talent.</p>
        <div className="mt-3"><PlayerUsageGuide compact /></div>
      </details>

      <FilterBar events={[]} value={filters} onChange={setFilters} showEventFilter={false} />''',
)

replace_all('src/pages/AthleteProfile.tsx', [
    ('⚡ +{displayResult.impactBoostPct}% Playmaker', 'Playmaker +{displayResult.impactBoostPct}%'),
    ('🧠 +{displayResult.awarenessBoostPct}% Awareness IQ', 'Awareness +{displayResult.awarenessBoostPct}%'),
    ("color: '#c6f24e'", "color: '#c8f24a'"),
])

replace_all('src/pages/Dashboard.tsx', [
    ("color: '#c6f24e'", "color: '#c8f24a'"),
])
