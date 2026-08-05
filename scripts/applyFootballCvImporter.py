from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:180]!r}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    'src/components/FootballCvImportPanel.tsx',
    "function plural(count: number, singular: string): string {\n  return `${count} ${singular}${count === 1 ? '' : 's'}`\n}\n",
    "function plural(count: number, singular: string): string {\n  const noun = count === 1\n    ? singular\n    : singular === 'identity'\n      ? 'identities'\n      : `${singular}s`\n  return `${count} ${noun}`\n}\n",
)

path = 'src/pages/FilmRoom.tsx'

replace_once(
    path,
    "import HudlImportWizard from '../components/HudlImportWizard'\n",
    "import HudlImportWizard from '../components/HudlImportWizard'\nimport FootballCvImportPanel from '../components/FootballCvImportPanel'\n",
)

replace_once(
    path,
    "import { LockedBrowserPlayerAutoTracker } from '../lib/filmLockedAutoTracking'\n",
    "import { LockedBrowserPlayerAutoTracker } from '../lib/filmLockedAutoTracking'\nimport { mergeFootballCvPlayerTracks } from '../lib/footballCvImport'\n",
)

replace_once(
    path,
    "function FormationBoard({ tracks }: { tracks: FilmAnnotation[] }) {\n  const located = tracks\n    .map((track) => ({ track, start: trackKeyframes(track.points)[0] }))\n    .filter((item): item is { track: FilmAnnotation; start: FilmAnnotationPoint & { t: number } } => Boolean(item.start))\n",
    "function FormationBoard({ tracks, atTime }: { tracks: FilmAnnotation[]; atTime?: number }) {\n  const located = tracks\n    .map((track) => ({\n      track,\n      start: typeof atTime === 'number'\n        ? trackPositionAt(track.points, atTime) ?? trackKeyframes(track.points)[0]\n        : trackKeyframes(track.points)[0],\n    }))\n    .filter((item): item is { track: FilmAnnotation; start: FilmAnnotationPoint } => Boolean(item.start))\n",
)

replace_once(
    path,
    "        Starting dots form the alignment. Lines show each saved route in the camera view.\n",
    "        Starting dots use the selected formation frame. Lines show each saved route in the camera view.\n",
)

replace_once(
    path,
    "                <Pill tone={formationLocated.length === 11 ? 'fai' : 'gold'}>{formationLocated.length}/11 located</Pill>\n              </div>\n\n              <div className=\"grid gap-2 sm:grid-cols-2 lg:grid-cols-4\">\n",
    "                <Pill tone={formationLocated.length === 11 ? 'fai' : 'gold'}>{formationLocated.length}/11 located</Pill>\n              </div>\n\n              <FootballCvImportPanel\n                athletes={roster}\n                currentVideoTime={videoTime}\n                onImport={({ tracks, formationStartTime: suggestedStart, source, createdWith }) => {\n                  stopAutoFollow('idle', undefined, false)\n                  setAutoArmed(false)\n                  setPending((current) => mergeFootballCvPlayerTracks(current, tracks))\n                  const firstTrack = tracks.find(isPlayerTrack)\n                  setActiveTrackId(firstTrack?.id)\n                  if (firstTrack) {\n                    setTrackTeam(firstTrack.trackingTeam ?? 'opponent')\n                    setTrackSide(firstTrack.trackingSide ?? 'offense')\n                  }\n                  if (typeof suggestedStart === 'number') {\n                    setFormationStartTime(suggestedStart)\n                    seekVideo(suggestedStart)\n                  }\n                  if (source) {\n                    setForm((current) => ({ ...current, filmLabel: current.filmLabel || source }))\n                  }\n                  setTrackingMessage(\n                    `${tracks.length} CV player track${tracks.length === 1 ? '' : 's'} loaded${createdWith ? ` from ${createdWith}` : ''}. Review identities and corrections, then Log Play.`,\n                  )\n                }}\n              />\n\n              <div className=\"grid gap-2 sm:grid-cols-2 lg:grid-cols-4\">\n",
)

file = Path(path)
text = file.read_text()
usage = '<FormationBoard tracks={formationTracks} />'
if usage not in text:
    raise SystemExit('FilmRoom.tsx: FormationBoard usage not found')
file.write_text(text.replace(usage, '<FormationBoard tracks={formationTracks} atTime={formationStartTime} />'))

print('Football CV importer integrated into Film Room.')
