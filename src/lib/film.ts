// ---------------------------------------------------------------------------
// Resolve an athlete's film link into an inline embed or a link-out.
//
// Hudl highlight reels have a dedicated /embed/ URL that plays inline; regular
// Hudl share links (and full game film that needs a login) can only link out.
// YouTube and Vimeo highlight tapes are embedded too, since coaches often host
// there.
// ---------------------------------------------------------------------------

export interface FilmEmbed {
  kind: 'embed'
  src: string
  provider: string
}
export interface FilmLink {
  kind: 'link'
  href: string
  provider: string
}
export type Film = FilmEmbed | FilmLink | null

export function resolveFilm(rawUrl?: string): Film {
  const url = (rawUrl ?? '').trim()
  if (!url) return null

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase()

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = parsed.searchParams.get('v') ?? parsed.pathname.split('/').filter(Boolean)[1]
    if (id) return { kind: 'embed', src: `https://www.youtube.com/embed/${id}`, provider: 'YouTube' }
  }
  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1)
    if (id) return { kind: 'embed', src: `https://www.youtube.com/embed/${id}`, provider: 'YouTube' }
  }
  if (host === 'vimeo.com') {
    const id = parsed.pathname.split('/').filter(Boolean)[0]
    if (id && /^\d+$/.test(id)) {
      return { kind: 'embed', src: `https://player.vimeo.com/video/${id}`, provider: 'Vimeo' }
    }
  }
  if (host === 'hudl.com' || host.endsWith('.hudl.com')) {
    if (parsed.pathname.includes('/embed/')) {
      return { kind: 'embed', src: url, provider: 'Hudl' }
    }
    return { kind: 'link', href: url, provider: 'Hudl' }
  }

  return { kind: 'link', href: url, provider: host }
}
