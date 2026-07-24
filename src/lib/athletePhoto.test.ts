import { describe, expect, it } from 'vitest'
import {
  MAX_ATHLETE_PHOTO_BYTES,
  athletePhotoExtension,
  athletePhotoPath,
  athletePhotoPathFromPublicUrl,
} from './athletePhoto'

describe('athlete photo uploads', () => {
  it('accepts supported image formats and creates an athlete-scoped path', () => {
    const file = { name: 'portrait.jpeg', size: 1024, type: 'image/jpeg' }
    expect(athletePhotoExtension(file)).toBe('jpg')
    expect(athletePhotoPath('team-123', 'athlete-456', file, 'photo-789')).toBe(
      'team-123/athlete-456/photo-789.jpg',
    )
  })

  it('rejects unsupported and oversized files', () => {
    expect(() => athletePhotoExtension({ name: 'photo.gif', size: 1024, type: 'image/gif' }))
      .toThrow('JPG, PNG, or WebP')
    expect(() => athletePhotoExtension({ name: 'photo.png', size: MAX_ATHLETE_PHOTO_BYTES + 1, type: 'image/png' }))
      .toThrow('5 MB or smaller')
  })

  it('extracts only paths from the FAI public photo bucket', () => {
    const url = 'https://example.supabase.co/storage/v1/object/public/athlete-photos/team-1/athlete-2/photo.webp'
    expect(athletePhotoPathFromPublicUrl(url)).toBe('team-1/athlete-2/photo.webp')
    expect(athletePhotoPathFromPublicUrl('https://images.example.com/photo.webp')).toBeUndefined()
    expect(athletePhotoPathFromPublicUrl('not a url')).toBeUndefined()
  })
})
