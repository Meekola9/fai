export const ATHLETE_PHOTO_BUCKET = 'athlete-photos'
export const MAX_ATHLETE_PHOTO_BYTES = 5 * 1024 * 1024

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export interface AthletePhotoFileLike {
  name: string
  size: number
  type: string
}

export function athletePhotoExtension(file: AthletePhotoFileLike): string {
  const normalizedType = file.type.trim().toLowerCase()
  const extension = EXTENSION_BY_MIME[normalizedType]
  if (!extension) {
    throw new Error('Choose a JPG, PNG, or WebP image.')
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new Error('The selected photo is empty or unreadable.')
  }
  if (file.size > MAX_ATHLETE_PHOTO_BYTES) {
    throw new Error('The photo must be 5 MB or smaller.')
  }
  return extension
}

function safeSegment(value: string, label: string): string {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9_-]/g, '')
  if (!cleaned) throw new Error(`${label} is missing.`)
  return cleaned
}

export function athletePhotoPath(
  teamId: string,
  athleteId: string,
  file: AthletePhotoFileLike,
  uniqueId: string = crypto.randomUUID(),
): string {
  const extension = athletePhotoExtension(file)
  return `${safeSegment(teamId, 'Team')}/${safeSegment(athleteId, 'Athlete')}/${safeSegment(uniqueId, 'Photo id')}.${extension}`
}

export function athletePhotoPathFromPublicUrl(url?: string): string | undefined {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    const marker = `/storage/v1/object/public/${ATHLETE_PHOTO_BUCKET}/`
    const index = parsed.pathname.indexOf(marker)
    if (index < 0) return undefined
    const encodedPath = parsed.pathname.slice(index + marker.length)
    return encodedPath ? decodeURIComponent(encodedPath) : undefined
  } catch {
    return undefined
  }
}
