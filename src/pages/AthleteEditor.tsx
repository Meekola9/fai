import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Avatar, Card } from '../components/ui'
import { POSITION_GROUPS, GRADES, parseHeight, formatHeight } from '../data/constants'
import {
  PLAYER_USAGE_OPTIONS,
  POSITION_OPTIONS,
  positionGroupFor,
  positionOptionFor,
} from '../data/positions'
import {
  deleteAthletePhoto,
  uploadAthletePhoto,
} from '../store/accounts'
import {
  athletePhotoExtension,
  athletePhotoPathFromPublicUrl,
} from '../lib/athletePhoto'
import { newId } from '../store/storage'
import type { Athlete, PlayerUsage, PositionGroup } from '../types'

const inputCls =
  'w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm font-semibold text-chalk outline-none placeholder:text-muted focus:border-fai'
const labelCls = 'text-xs font-semibold uppercase tracking-wider text-muted'

function PositionSuggestions({ id }: { id: string }) {
  return (
    <datalist id={id}>
      {POSITION_OPTIONS.map((option) => (
        <option key={`${id}-${option.value}`} value={option.value}>
          {option.description}{option.special ? ' · Special role' : ''}
        </option>
      ))}
    </datalist>
  )
}

export default function AthleteEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, teamId, addAthlete, updateAthlete, deleteAthlete } = useStore()
  const existing = id ? data.athletes.find((a) => a.id === id) : undefined

  const [name, setName] = useState(existing?.name ?? '')
  const [grade, setGrade] = useState(existing?.grade ?? 9)
  const [position, setPosition] = useState(existing?.position ?? '')
  const [group, setGroup] = useState<PositionGroup>(existing?.positionGroup ?? 'WR')
  const [usage, setUsage] = useState<PlayerUsage>(existing?.usage ?? 'one-way')
  const [secondaryPosition, setSecondaryPosition] = useState(existing?.secondaryPosition ?? '')
  const [secondaryGroup, setSecondaryGroup] = useState<PositionGroup>(
    existing?.secondaryPositionGroup ?? 'DB',
  )
  const [height, setHeight] = useState(existing ? formatHeight(existing.heightIn) : '')
  const [weight, setWeight] = useState(existing?.weightLbs ? String(existing.weightLbs) : '')
  const [photoUrl, setPhotoUrl] = useState(existing?.photoUrl ?? '')
  const [photoFile, setPhotoFile] = useState<File>()
  const [photoPreview, setPhotoPreview] = useState<string>()
  const [hudlUrl, setHudlUrl] = useState(existing?.hudlUrl ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  function changePrimaryPosition(value: string) {
    setPosition(value)
    const known = positionOptionFor(value)
    if (known) setGroup(known.group)
  }

  function changeSecondaryPosition(value: string) {
    setSecondaryPosition(value)
    const known = positionOptionFor(value)
    if (known) setSecondaryGroup(known.group)
  }

  function choosePhoto(file?: File) {
    setError(undefined)
    if (!file) return
    try {
      athletePhotoExtension(file)
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    } catch (cause: unknown) {
      setPhotoFile(undefined)
      setPhotoPreview(undefined)
      setError(cause instanceof Error ? cause.message : 'Could not use that photo.')
    }
  }

  async function save() {
    if (!name.trim() || busy) return
    setBusy(true)
    setError(undefined)
    let uploadedPath: string | undefined

    try {
      const isTwoWay = usage !== 'one-way'
      const cleanSecondary = isTwoWay ? secondaryPosition.trim() : ''
      const athleteId = existing?.id ?? newId('athlete')
      let nextPhotoUrl = photoUrl.trim() || undefined

      if (photoFile) {
        if (!teamId) {
          throw new Error('Sign in to the team cloud before uploading an athlete photo.')
        }
        const uploaded = await uploadAthletePhoto(teamId, athleteId, photoFile)
        uploadedPath = uploaded.path
        nextPhotoUrl = uploaded.publicUrl
      }

      const payload: Omit<Athlete, 'id'> = {
        name: name.trim(),
        grade: Number(grade),
        position: position.trim() || group,
        positionGroup: group,
        usage,
        secondaryPosition: cleanSecondary || undefined,
        secondaryPositionGroup: cleanSecondary
          ? positionGroupFor(cleanSecondary, secondaryGroup)
          : undefined,
        heightIn: parseHeight(height),
        weightLbs: Number(weight) || 0,
        photoUrl: nextPhotoUrl,
        hudlUrl: hudlUrl.trim() || undefined,
      }

      if (existing) {
        updateAthlete({ ...payload, id: existing.id })
      } else {
        addAthlete(payload, athleteId)
      }

      if (uploadedPath && existing?.photoUrl) {
        const previousPath = athletePhotoPathFromPublicUrl(existing.photoUrl)
        if (previousPath && previousPath !== uploadedPath) {
          void deleteAthletePhoto(previousPath).catch(() => undefined)
        }
      }

      nav(`/athletes/${athleteId}`)
    } catch (cause: unknown) {
      if (uploadedPath) void deleteAthletePhoto(uploadedPath).catch(() => undefined)
      setError(cause instanceof Error ? cause.message : 'Could not save athlete profile.')
      setBusy(false)
    }
  }

  function remove() {
    if (!existing) return
    if (confirm(`Delete ${existing.name} and all their testing data? This cannot be undone.`)) {
      deleteAthlete(existing.id)
      nav('/athletes')
    }
  }

  const primaryDetail = positionOptionFor(position)
  const secondaryDetail = positionOptionFor(secondaryPosition)
  const usageDetail = PLAYER_USAGE_OPTIONS.find((option) => option.value === usage)

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">
          {existing ? 'Edit Athlete' : 'Add Athlete'}
        </h1>
        <Link to="/athletes" className="text-sm font-semibold text-muted hover:text-chalk">
          ← Back
        </Link>
      </div>

      <Card className="space-y-4 p-5">
        {error && (
          <div className="rounded-xl border border-down/40 bg-down/5 p-3 text-sm font-bold text-down">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-line bg-panel-2/30 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar
              name={name.trim() || existing?.name || 'Athlete'}
              photoUrl={photoPreview || photoUrl || existing?.photoUrl}
              size={82}
            />
            <div className="min-w-0 flex-1">
              <div className={labelCls}>Athlete profile picture</div>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Choose a JPG, PNG, or WebP image from the camera or photo library. Maximum size: 5 MB.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="cursor-pointer rounded-lg bg-fai px-4 py-2 text-sm font-bold text-ink hover:brightness-110">
                  {photoFile ? 'Choose a different photo' : 'Choose photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => choosePhoto(event.target.files?.[0])}
                  />
                </label>
                {photoFile && (
                  <>
                    <span className="max-w-56 truncate text-xs font-semibold text-chalk">
                      {photoFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoFile(undefined)
                        setPhotoPreview(undefined)
                      }}
                      className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-muted hover:text-chalk"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
              {!teamId && (
                <p className="mt-2 text-xs font-semibold text-gold">
                  Device uploads require a signed-in team cloud account. A direct image URL still works below.
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Athlete name" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Grade</label>
            <select className={inputCls} value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Primary FAI Group</label>
            <select className={inputCls} value={group} onChange={(e) => setGroup(e.target.value as PositionGroup)}>
              {POSITION_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              This group controls the athlete’s FAI benchmarks and primary archetype.
            </p>
          </div>
        </div>

        <div>
          <label className={labelCls}>Player Deployment</label>
          <select className={inputCls} value={usage} onChange={(e) => setUsage(e.target.value as PlayerUsage)}>
            {PLAYER_USAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">{usageDetail?.description}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Primary Position</label>
            <input
              className={inputCls}
              value={position}
              onChange={(e) => changePrimaryPosition(e.target.value)}
              placeholder="e.g. Slot WR"
              list="primary-position-options"
            />
            <PositionSuggestions id="primary-position-options" />
            {primaryDetail && (
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {primaryDetail.description}{primaryDetail.special ? ' · Program special role' : ''}
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Height</label>
            <input className={inputCls} value={height} onChange={(e) => setHeight(e.target.value)} placeholder={`6'2"`} />
          </div>
          <div>
            <label className={labelCls}>Weight (lbs)</label>
            <input className={inputCls} type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="185" />
          </div>
        </div>

        {usage !== 'one-way' && (
          <div className="rounded-xl border border-fai/25 bg-fai/5 p-4">
            <div className="mb-3">
              <div className="text-sm font-black text-chalk">Secondary Side of the Ball</div>
              <p className="mt-1 text-xs text-muted">
                This role appears on the roster and profile. FAI scoring still uses the primary group above.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Secondary Position</label>
                <input
                  className={inputCls}
                  value={secondaryPosition}
                  onChange={(e) => changeSecondaryPosition(e.target.value)}
                  placeholder="e.g. Star"
                  list="secondary-position-options"
                />
                <PositionSuggestions id="secondary-position-options" />
                {secondaryDetail && (
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    {secondaryDetail.description}{secondaryDetail.special ? ' · Program special role' : ''}
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>Secondary Group</label>
                <select className={inputCls} value={secondaryGroup} onChange={(e) => setSecondaryGroup(e.target.value as PositionGroup)}>
                  {POSITION_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>Photo URL fallback (optional)</label>
          <input className={inputCls} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" />
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Use this only when the image is already hosted online. A selected device photo takes priority when saving.
          </p>
        </div>

        <div>
          <label className={labelCls}>Hudl / film link (optional)</label>
          <input className={inputCls} value={hudlUrl} onChange={(e) => setHudlUrl(e.target.value)} placeholder="https://www.hudl.com/…" />
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Paste a Hudl highlight <strong>embed</strong> link (or YouTube/Vimeo) to play inline on the profile; any other Hudl link shows a “Watch film” button.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={!name.trim() || busy}
            className="rounded-lg bg-fai px-6 py-2 text-sm font-bold text-ink disabled:opacity-40"
          >
            {busy
              ? (photoFile ? 'Uploading photo…' : 'Saving…')
              : existing
                ? 'Save Changes'
                : 'Create Athlete'}
          </button>
          {existing && (
            <button type="button" onClick={remove} className="rounded-lg border border-down/40 px-4 py-2 text-sm font-bold text-down hover:bg-down/10">
              Delete Athlete
            </button>
          )}
        </div>
      </Card>

      {existing && (
        <div className="text-center text-sm text-muted">
          Want to log a new testing session?{' '}
          <Link to="/entry" className="font-semibold text-fai">
            Enter Testing Data →
          </Link>
        </div>
      )}
    </div>
  )
}
