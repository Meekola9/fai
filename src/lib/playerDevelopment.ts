export type DevelopmentSection = 'archetypes' | 'badges' | 'vertical'

export function developmentSectionFromLocation(pathname: string, search: string): DevelopmentSection {
  if (pathname.startsWith('/badges')) return 'badges'
  if (pathname.startsWith('/vertical')) return 'vertical'
  if (pathname.startsWith('/archetypes')) return 'archetypes'
  const requested = new URLSearchParams(search).get('section')
  return requested === 'badges' || requested === 'vertical' || requested === 'archetypes'
    ? requested
    : 'archetypes'
}
