import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BadgeArtwork } from './BadgeArtwork'
import { PLAYER_BADGE_CATALOG } from '../lib/badges'

it('renders repeated badges with independent backgrounds and only one artwork per badge', () => {
  const badge = PLAYER_BADGE_CATALOG[0]
  const markup = renderToStaticMarkup(<><BadgeArtwork badge={badge} size={64} /><BadgeArtwork badge={badge} size={64} /></>)
  const ids = [...markup.matchAll(/ id="([^"]+)"/g)].map(match => match[1])
  expect(new Set(ids).size).toBe(ids.length)
  expect(markup.match(/<svg/g)).toHaveLength(2)
  expect(markup).not.toContain('<img')
  for (const reference of markup.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(reference[1])
})
