import { useMemo, useState } from 'react'
import { Card, Pill } from '../components/ui'
import { searchFilmLibrary } from '../lib/filmLibrary'
import { CATEGORY_SHORT } from '../data/constants'
import { usePageMemory } from '../hooks/usePageMemory'

export default function FilmLibrary() {
  const [query, setQuery] = usePageMemory('fai:library:query', '')
  const [focusId, setFocusId] = useState<string>()
  const results = useMemo(() => searchFilmLibrary(query), [query])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight">
          Film <span className="text-fai">Library</span>
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Every FAI archetype paired with a professional and college film model plus what to study.
          Teaching references only — film confirms or challenges the projection; it never changes an
          athlete's archetype.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search position, archetype, player, school, or trait…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-3.5 py-2 text-sm text-chalk placeholder:text-muted/60 outline-none focus:border-fai"
        />
        <span className="text-xs font-bold text-muted nums">{results.length} archetypes</span>
      </div>

      {results.length === 0 ? (
        <Card className="p-10 text-center text-muted">No archetypes match “{query}”.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {results.map((entry) => {
            const open = focusId === entry.archetypeId
            return (
              <Card key={entry.archetypeId} className="p-4">
                <button
                  type="button"
                  onClick={() => setFocusId(open ? undefined : entry.archetypeId)}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div className="min-w-0">
                    <div className="text-base font-black text-chalk">{entry.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <Pill tone="fai">{entry.group}</Pill>
                      <Pill tone="gold">{entry.role}</Pill>
                      {entry.primaryTraits.slice(0, 3).map((trait) => (
                        <span key={trait} className="rounded border border-line px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">
                          {CATEGORY_SHORT[trait]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="shrink-0 text-muted">{open ? '▴' : '▾'}</span>
                </button>

                {entry.film && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-line bg-panel-2/40 p-2.5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-fai">NFL model</div>
                      <div className="text-sm font-bold text-chalk">{entry.film.nfl}</div>
                    </div>
                    <div className="rounded-lg border border-line bg-panel-2/40 p-2.5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-gold">College film</div>
                      <div className="text-sm font-bold text-chalk">{entry.film.college}</div>
                    </div>
                  </div>
                )}

                {open && (
                  <div className="mt-3 space-y-2 text-sm">
                    {entry.film && (
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-muted">Study focus</div>
                        <div className="text-chalk">{entry.film.focus}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-muted">Play style</div>
                      <div className="text-muted">{entry.description}</div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
