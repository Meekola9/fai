from pathlib import Path


def patch(path_str: str, replacements: list[tuple[str, str]]) -> None:
    path = Path(path_str)
    text = path.read_text()
    for old, new in replacements:
        if old in text:
            text = text.replace(old, new, 1)
        elif new in text:
            continue
        else:
            raise SystemExit(f'Missing patch target in {path_str}:\n{old[:240]}')
    path.write_text(text)


patch('src/data/positions.ts', [
    (
        "    label: 'One Way',\n    description: 'Primary position only.',",
        "    label: 'Primary Specialist',\n    description: 'A primary-side specialist who is exceptional there or is not needed in a second role.',",
    ),
    (
        "    label: 'Two Way',\n    description: 'Regular offensive and defensive role.',",
        "    label: 'Two-Way',\n    description: 'Physically and mentally prepared to carry meaningful responsibility on both sides.',",
    ),
    (
        "    label: 'Iron Man',\n    description: 'Expected to stay on the field for nearly every meaningful snap.',",
        "    label: 'Iron Man',\n    description: 'Full primary role with a deliberately limited secondary package to protect mental clarity.',",
    ),
    (
        "return PLAYER_USAGE_OPTIONS.find((option) => option.value === (value ?? 'one-way'))?.label ?? 'One Way'",
        "return PLAYER_USAGE_OPTIONS.find((option) => option.value === (value ?? 'one-way'))?.label ?? 'Primary Specialist'",
    ),
])

patch('src/types.ts', [
    (
        '/** One-way, regular two-way, or near-full-time Iron Man deployment. */',
        '/** Primary Specialist, Two-Way, or limited-package Iron Man deployment. */',
    ),
    (
        '/** Optional second role for two-way and Iron Man players. */',
        '/** Optional second role for Two-Way and Iron Man players. */',
    ),
])

patch('src/App.tsx', [
    (
        'className="grid h-9 w-9 place-items-center rounded-lg border border-fai/40 bg-fai/10 text-sm font-black tracking-tight text-fai"',
        'className="brand-mark"',
    ),
    (
        'className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-muted sm:block"',
        'className="hidden text-[10px] font-semibold text-muted sm:block"',
    ),
    (
        '<header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">',
        '<header className="app-header sticky top-0 z-40">',
    ),
    (
        '<nav className="hidden items-center gap-1 md:flex">',
        '<nav className="nav-strip hidden md:flex">',
    ),
    (
        "className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm font-semibold transition ${isActive ? 'bg-fai/15 text-fai' : 'text-muted hover:bg-panel-2 hover:text-chalk'}`}",
        "className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}",
    ),
    (
        'className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"',
        'className="mobile-dock fixed inset-x-0 bottom-0 z-40 px-1 pb-[env(safe-area-inset-bottom)] md:hidden"',
    ),
    ("{ to: '/', label: 'Dashboard', icon: '⌂', end: true }", "{ to: '/', label: 'Dashboard', icon: 'DB', end: true }"),
    ("{ to: '/athletes', label: 'Athletes', icon: '◉' }", "{ to: '/athletes', label: 'Athletes', icon: 'AT' }"),
    ("{ to: '/leaderboards', label: 'Rankings', icon: '★' }", "{ to: '/leaderboards', label: 'Rankings', icon: 'RK' }"),
    ("{ to: '/login', label: 'Sign In', icon: '→' }", "{ to: '/login', label: 'Sign In', icon: 'IN' }"),
    ("{ to: '/account/profile', label: 'My Profile', icon: '◉', end: true }", "{ to: '/account/profile', label: 'My Profile', icon: 'ME', end: true }"),
    ("{ to: '/development', label: 'Develop', icon: '◆' }", "{ to: '/development', label: 'Develop', icon: 'DV' }"),
    ("{ to: '/stats', label: 'Guide', icon: '?' }", "{ to: '/stats', label: 'Guide', icon: 'GD' }"),
    ("{ to: '/entry', label: 'Test', icon: '+' }", "{ to: '/entry', label: 'Test', icon: 'TE' }"),
    ("{ to: access.capabilities.canManageStaff ? '/staff' : '/data', label: 'More', icon: '•••' }", "{ to: access.capabilities.canManageStaff ? '/staff' : '/data', label: 'More', icon: 'MO' }"),
    (
        'className={({ isActive }) => `flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition ${isActive ? \'text-fai\' : \'text-muted active:bg-panel-2\'}`}',
        'className={({ isActive }) => `flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-bold transition ${isActive ? \'text-fai\' : \'text-muted active:bg-panel-2\'}`}',
    ),
    (
        '<span className="grid h-6 place-items-center text-lg font-black leading-none" aria-hidden="true">{item.icon}</span>',
        '<span className="grid h-6 place-items-center text-[10px] font-black tracking-[0.08em] leading-none" aria-hidden="true">{item.icon}</span>',
    ),
])

patch('src/pages/AthleteEditor.tsx', [
    (
        "import { Avatar, Card } from '../components/ui'",
        "import { Avatar, Card } from '../components/ui'\nimport { PlayerUsageGuide } from '../components/PlayerUsageGuide'",
    ),
    (
        '  PLAYER_USAGE_OPTIONS,\n',
        '',
    ),
    (
        "import type { Athlete, PlayerUsage, PositionGroup } from '../types'",
        "import { playerUsageDefinition } from '../lib/playerUsage'\nimport type { Athlete, PlayerUsage, PositionGroup } from '../types'",
    ),
    (
        '  const usageDetail = PLAYER_USAGE_OPTIONS.find((option) => option.value === usage)',
        '  const usageDetail = playerUsageDefinition(usage)',
    ),
    (
        "        <h1 className=\"text-2xl font-black tracking-tight\">\n          {existing ? 'Edit Athlete' : 'Add Athlete'}\n        </h1>",
        "        <div>\n          <div className=\"page-kicker\">Roster profile</div>\n          <h1 className=\"page-title\">{existing ? 'Edit athlete' : 'Add athlete'}</h1>\n        </div>",
    ),
    (
        "        <div>\n          <label className={labelCls}>Player Deployment</label>\n          <select className={inputCls} value={usage} onChange={(e) => setUsage(e.target.value as PlayerUsage)}>\n            {PLAYER_USAGE_OPTIONS.map((option) => (\n              <option key={option.value} value={option.value}>{option.label}</option>\n            ))}\n          </select>\n          <p className=\"mt-1 text-xs text-muted\">{usageDetail?.description}</p>\n        </div>",
        "        <div>\n          <div className={labelCls}>Player deployment</div>\n          <p className=\"mt-1 mb-3 text-xs leading-relaxed text-muted\">Choose the preparation model—not just the positions the athlete can physically play.</p>\n          <PlayerUsageGuide value={usage} onChange={setUsage} />\n        </div>",
    ),
    (
        '                This role appears on the roster and profile. FAI scoring still uses the primary group above.',
        '                {usageDetail.installScope} The FAI blend uses {usageDetail.primaryPct}% primary and {usageDetail.secondaryPct}% secondary.',
    ),
])

patch('src/pages/Athletes.tsx', [
    (
        "import { playerUsageDefinition } from '../lib/playerUsage'",
        "import { playerUsageDefinition, playerUsagePlanLine } from '../lib/playerUsage'",
    ),
    (
        "import { athletePositionLine, usageLabel } from '../data/positions'",
        "import { athletePositionLine } from '../data/positions'",
    ),
    (
        "          <h1 className=\"text-2xl font-black tracking-tight\">Athletes <span className=\"text-muted\">· {data.athletes.length}</span></h1>\n          <div className=\"mt-1 text-xs font-bold uppercase tracking-wider text-fai\">2026 season only</div>",
        "          <div className=\"page-kicker\">2026 roster · {data.athletes.length} athletes</div>\n          <h1 className=\"page-title\">Athlete personnel</h1>\n          <p className=\"page-intro\">Build position groups, testing profiles, and game-plan deployment from one roster.</p>",
    ),
    (
        '<Card key={athlete.id} className="p-4 transition hover:border-fai/30">',
        '<Card key={athlete.id} className="p-4 transition hover:border-[#555a4f]">',
    ),
    (
        "                      {usage !== 'one-way' && (\n                        <Pill tone={usage === 'iron-man' ? 'gold' : 'up'}>{usageLabel(usage)} · {usageDefinition.primaryPct}/{usageDefinition.secondaryPct}</Pill>\n                      )}\n                      <span>{athletePositionLine(athlete)}</span>",
        "                      <Pill tone={usage === 'two-way' ? 'up' : usage === 'iron-man' ? 'gold' : 'default'}>{usageDefinition.shortLabel}</Pill>\n                      <span>{playerUsagePlanLine(usage)}</span>\n                      <span>· {athletePositionLine(athlete)}</span>",
    ),
])

patch('src/pages/AthleteProfile.tsx', [
    (
        "import { AthletePlayerCard } from '../components/AthletePlayerCard'",
        "import { AthletePlayerCard } from '../components/AthletePlayerCard'\nimport { PlayerUsageSummary } from '../components/PlayerUsageGuide'",
    ),
    (
        "        />\n        <Card className=\"p-6\">",
        "        />\n        <PlayerUsageSummary usage={athlete.usage} />\n        <Card className=\"p-6\">",
    ),
    (
        "      />\n\n      {positionArchetype && (",
        "      />\n\n      <PlayerUsageSummary usage={athlete.usage} />\n\n      {positionArchetype && (",
    ),
])

patch('src/pages/Dashboard.tsx', [
    (
        "  return (\n    <div className=\"space-y-6\">\n      <div className=\"grid gap-4 sm:grid-cols-2 lg:grid-cols-4\">",
        "  return (\n    <div className=\"space-y-6\">\n      <header>\n        <div className=\"page-kicker\">Program command center</div>\n        <h1 className=\"page-title\">Coach dashboard</h1>\n        <p className=\"page-intro\">A clear view of readiness, verified testing, roster coverage, and the athletes driving the program.</p>\n      </header>\n      <div className=\"grid gap-4 sm:grid-cols-2 lg:grid-cols-4\">",
    ),
])

patch('src/lib/playerUsage.test.ts', [
    (
        "  it('defines Two Way as 50/50 and Iron Man as 70/30', () => {",
        "  it('defines Two-Way as 50/50, Iron Man as 70/30, and Primary Specialist as 100/0', () => {",
    ),
    (
        "    expect(playerUsageDefinition('one-way')).toMatchObject({ primaryPct: 100, secondaryPct: 0 })",
        "    expect(playerUsageDefinition('one-way')).toMatchObject({ label: 'Primary Specialist', primaryPct: 100, secondaryPct: 0 })\n    expect(playerUsageDefinition('two-way').mentalProfile).toContain('two meeting rooms')\n    expect(playerUsageDefinition('iron-man').installScope).toContain('one or two formations')",
    ),
])
