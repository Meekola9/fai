from pathlib import Path

path = Path('src/pages/FilmRoom.tsx')
text = path.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    if old in text:
        text = text.replace(old, new, 1)
        return
    if new in text:
        return
    raise SystemExit(f'Missing patch target:\n{old[:300]}')


replace_once(
    "import HudlImportWizard from '../components/HudlImportWizard'",
    "import HudlImportWizard from '../components/HudlImportWizard'\nimport QbMechanicsPanel from '../components/QbMechanicsPanel'",
)

replace_once(
    "              {throwMetrics.timingWarning && <div className=\"rounded-lg border border-down/40 bg-down/5 p-2 text-xs font-bold text-down\">{throwMetrics.timingWarning}</div>}\n              <div className=\"flex flex-wrap items-center gap-2\">",
    "              {throwMetrics.timingWarning && <div className=\"rounded-lg border border-down/40 bg-down/5 p-2 text-xs font-bold text-down\">{throwMetrics.timingWarning}</div>}\n              <QbMechanicsPanel\n                analysis={throwAnalysis}\n                currentPlayId={editingId}\n                filmLabel={form.filmLabel || sourceLabel || undefined}\n                opponent={form.opponent}\n                date={form.date}\n              />\n              <div className=\"flex flex-wrap items-center gap-2\">",
)

path.write_text(text)
