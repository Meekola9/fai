import { describe, expect, it } from 'vitest'
import { resolveFilm } from './film'

describe('resolveFilm', () => {
  it('returns null for empty or invalid input', () => {
    expect(resolveFilm(undefined)).toBeNull()
    expect(resolveFilm('')).toBeNull()
    expect(resolveFilm('not a url')).toBeNull()
    expect(resolveFilm('javascript:alert(1)')).toBeNull()
  })

  it('embeds a Hudl highlight embed link', () => {
    const film = resolveFilm('https://www.hudl.com/embed/video/3/12345/abcdef')
    expect(film).toMatchObject({ kind: 'embed', provider: 'Hudl' })
  })

  it('links out for a regular Hudl share link', () => {
    const film = resolveFilm('https://www.hudl.com/video/3/12345/abcdef')
    expect(film).toMatchObject({ kind: 'link', provider: 'Hudl' })
  })

  it('embeds YouTube watch, short, and embed links', () => {
    expect(resolveFilm('https://www.youtube.com/watch?v=abc123')).toMatchObject({
      kind: 'embed',
      src: 'https://www.youtube.com/embed/abc123',
    })
    expect(resolveFilm('https://youtu.be/abc123')).toMatchObject({
      kind: 'embed',
      src: 'https://www.youtube.com/embed/abc123',
    })
  })

  it('embeds a Vimeo link', () => {
    expect(resolveFilm('https://vimeo.com/76979871')).toMatchObject({
      kind: 'embed',
      src: 'https://player.vimeo.com/video/76979871',
    })
  })

  it('links out for any other host', () => {
    expect(resolveFilm('https://example.com/film.mp4')).toMatchObject({ kind: 'link' })
  })
})
