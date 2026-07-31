from pathlib import Path


def write(path_str: str, transform) -> None:
    path = Path(path_str)
    text = path.read_text()
    path.write_text(transform(text))


def collapse_repeated(text: str, line: str) -> str:
    repeated = line + '\n'
    while repeated + repeated in text:
        text = text.replace(repeated + repeated, repeated)
    return text


def athlete_editor(text: str) -> str:
    text = collapse_repeated(text, "import { PlayerUsageGuide } from '../components/PlayerUsageGuide'")
    text = collapse_repeated(text, "import { playerUsageDefinition } from '../lib/playerUsage'")
    return text


def athlete_profile(text: str) -> str:
    text = collapse_repeated(text, "import { PlayerUsageSummary } from '../components/PlayerUsageGuide'")
    text = text.replace('⚡ +{displayResult.impactBoostPct}% Playmaker', 'Playmaker +{displayResult.impactBoostPct}%')
    text = text.replace('🧠 +{displayResult.awarenessBoostPct}% Awareness IQ', 'Awareness +{displayResult.awarenessBoostPct}%')
    text = text.replace("color: '#c6f24e'", "color: '#c8f24a'")
    return text


def athletes(text: str) -> str:
    usage_import = "import { PlayerUsageGuide } from '../components/PlayerUsageGuide'"
    if usage_import not in text:
        anchor = "import { Avatar, Card, Pill } from '../components/ui'"
        text = text.replace(anchor, anchor + '\n' + usage_import, 1)

    guide = '''      <details className="rounded-xl border border-line bg-panel px-4 py-3">
        <summary className="cursor-pointer text-sm font-extrabold text-chalk">How FAI deployment roles work</summary>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted">These labels describe meeting-room load, weekly installation, and game-plan responsibility. They are not a ranking of toughness or talent.</p>
        <div className="mt-3"><PlayerUsageGuide compact /></div>
      </details>

'''
    filter_line = '      <FilterBar events={[]} value={filters} onChange={setFilters} showEventFilter={false} />'
    if 'How FAI deployment roles work' not in text:
        text = text.replace(filter_line, guide + filter_line, 1)
    return text


def dashboard(text: str) -> str:
    return text.replace("color: '#c6f24e'", "color: '#c8f24a'")


write('src/pages/AthleteEditor.tsx', athlete_editor)
write('src/pages/AthleteProfile.tsx', athlete_profile)
write('src/pages/Athletes.tsx', athletes)
write('src/pages/Dashboard.tsx', dashboard)
