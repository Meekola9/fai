import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Avatar, Card } from '../components/ui'
import { PlayerUsageGuide } from '../components/PlayerUsageGuide'
import { POSITION_GROUPS, GRADES, parseHeight, formatHeight } from '../data/constants'
import {
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
import { playerUsageDefinition } from '../lib/playerUsage'
import { athleteTimeline, computeSessionForPositionGroup } from '../lib/compute'
import { latestAwarenessFor } from '../lib/awarenessQuiz'
import {
  IRON_MAN_MAX_CALLS,
  IRON_MAN_MAX_FORMATIONS,
  deploymentAssessmentFromValues,
  normalizeIronManPackage,
  parseDeploymentPackageItems,
  recommendDeployment,
} from '../lib/deploymentRecommendation'
import type {
  Athlete,
  DeploymentRosterNeed,
  IronManPackageStatus,
  PlayerUsage,
  PositionGroup,
} from '../types'

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
  const { data, computed, teamId, addAthlete, updateAthlete, deleteAthlete } = useStore()
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
  const [rosterNeed, setRosterNeed] = useState<DeploymentRosterNeed>(
    existing?.deploymentAssessment?.rosterNeed ?? 'none',
  )
  const [mentalReadiness, setMentalReadiness] = useState(
    existing?.deploymentAssessment?.coachMentalReadiness
      ? String(existing.deploymentAssessment.coachMentalReadiness)
      : '',
  )
  const [assignmentReliability, setAssignmentReliability] = useState(
    typeof existing?.deploymentAssessment?.assignmentReliability === 'number'
      ? String(existing.deploymentAssessment.assignmentReliability)
      : '',
  )
  const [packageStatus, setPackageStatus] = useState<IronManPackageStatus>(
    existing?.ironManPackage?.status ?? 'planning',
  )
  const [packageFormations, setPackageFormations] = useState(
    existing?.ironManPackage?.formations.join('\n') ?? '',
  )
  const [packageCalls, setPackageCalls] = useState(
    existing?.ironManPackage?.calls.join('\n') ?? '',
  )
  const [packageResponsibilities, setPackageResponsibilities] = useState(
    existing?.ironManPackage?.responsibilities ?? '',
  )
  const [secondarySnapCapPct, setSecondarySnapCapPct] = useState(
    String(existing?.ironManPackage?.secondarySnapCapPct ?? 30),
  )
  const [packageReviewDate, setPackageReviewDate] = useState(
    existing?.ironManPackage?.reviewDate ?? '',
  )

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
      if (isTwoWay && !cleanSecondary) {
        throw new Error('Choose a secondary position before assigning an Iron Man or Two-Way role.')
      }
      const formations = parseDeploymentPackageItems(packageFormations)
      const calls = parseDeploymentPackageItems(packageCalls)
      if (usage === 'iron-man' && formations.length > IRON_MAN_MAX_FORMATIONS) {
        throw new Error(`Iron Man packages are limited to ${IRON_MAN_MAX_FORMATIONS} formations.`)
      }
      if (usage === 'iron-man' && calls.length > IRON_MAN_MAX_CALLS) {
        throw new Error(`Iron Man packages are limited to ${IRON_MAN_MAX_CALLS} calls or assignments.`)
      }
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
        deploymentAssessment: deploymentAssessmentFromValues({
          rosterNeed,
          coachMentalReadiness: mentalReadiness ? Number(mentalReadiness) : undefined,
          assignmentReliability: assignmentReliability ? Number(assignmentReliability) : undefined,
          updatedAt: new Date().toISOString(),
        }),
        ironManPackage: usage === 'iron-man'
          ? normalizeIronManPackage({
              status: packageStatus,
              formations,
              calls,
              responsibilities: packageResponsibilities,
              secondarySnapCapPct: Number(secondarySnapCapPct),
              reviewDate: packageReviewDate,
            })
          : undefined,
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
  const usageDetail = playerUsageDefinition(usage)
  const latestTesting = existing
    ? athleteTimeline(computed, existing.id).slice(-1)[0]
    : undefined
  const primaryScore = latestTesting && existing
    ? computeSessionForPositionGroup(
        latestTesting.session,
        { ...existing, position: position.trim() || group, positionGroup: group },
        latestTesting.event,
        group,
      ).fai
    : undefined
  const secondaryScore = latestTesting && existing && secondaryPosition.trim()
    ? computeSessionForPositionGroup(
        {
          ...latestTesting.session,
          positionSnapshot: secondaryPosition.trim(),
          positionGroupSnapshot: secondaryGroup,
        },
        {
          ...existing,
          position: secondaryPosition.trim(),
          positionGroup: secondaryGroup,
        },
        latestTesting.event,
        secondaryGroup,
      ).fai
    : undefined
  const latestAwareness = existing
    ? latestAwarenessFor(data.awarenessResults, existing.id)
    : undefined
  const recommendation = recommendDeployment({
    hasSecondaryPosition: Boolean(secondaryPosition.trim()),
    primaryScore,
    secondaryScore,
    awarenessScore: latestAwareness?.score,
    rosterNeed,
    coachMentalReadiness: mentalReadiness ? Number(mentalReadiness) : undefined,
    assignmentReliability: assignmentReliability ? Number(assignmentReliability) : undefined,
  })
  const formationItems = parseDeploymentPackageItems(packageFormations)
  const callItems = parseDeploymentPackageItems(packageCalls)

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="page-kicker">Roster profile</div>
          <h1 className="page-title">{existing ? 'Edit athlete' : 'Add athlete'}</h1>
        </div>
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
          <div className={labelCls}>Player deployment</div>
          <p className="mt-1 mb-3 text-xs leading-relaxed text-muted">Choose the preparation model—not just the positions the athlete can physically play.</p>
          <PlayerUsageGuide value={usage} onChange={setUsage} />
        </div>

        <div className="rounded-xl border border-line bg-ink/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-fai">FAI deployment recommendation</div>
              <div className="mt-1 text-lg font-black text-chalk">{recommendation.headline}</div>
              <div className="mt-1 text-xs text-muted">{recommendation.confidence}% evidence confidence{typeof recommendation.readinessScore === 'number' ? ` · ${recommendation.readinessScore} readiness` : ''}</div>
            </div>
            <button
              type="button"
              onClick={() => setUsage(recommendation.usage)}
              className="rounded-lg border border-fai/40 bg-fai/10 px-4 py-2 text-xs font-black text-fai"
            >
              Apply {playerUsageDefinition(recommendation.usage).label}
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label>
              <span className={labelCls}>Roster need</span>
              <select className={inputCls} value={rosterNeed} onChange={(event) => setRosterNeed(event.target.value as DeploymentRosterNeed)}>
                <option value="none">No secondary need</option>
                <option value="emergency">Emergency depth</option>
                <option value="rotation">Rotation role</option>
                <option value="starter">Starter-level need</option>
              </select>
            </label>
            <label>
              <span className={labelCls}>Mental readiness</span>
              <select className={inputCls} value={mentalReadiness} onChange={(event) => setMentalReadiness(event.target.value)}>
                <option value="">Not graded</option>
                <option value="1">1 · Overloaded</option>
                <option value="2">2 · Needs heavy support</option>
                <option value="3">3 · Limited package ready</option>
                <option value="4">4 · Two-plan ready</option>
                <option value="5">5 · Full command</option>
              </select>
            </label>
            <label>
              <span className={labelCls}>Assignment reliability</span>
              <input className={inputCls} type="number" min="0" max="100" value={assignmentReliability} onChange={(event) => setAssignmentReliability(event.target.value)} placeholder="0-100" />
            </label>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-muted">Why</div>
              <ul className="mt-2 space-y-1 text-xs leading-relaxed text-chalk">
                {recommendation.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
              </ul>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-muted">Guardrails</div>
              <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted">
                {recommendation.guardrails.map((guardrail) => <li key={guardrail}>• {guardrail}</li>)}
              </ul>
            </div>
          </div>
          {recommendation.missingInputs.length > 0 && (
            <div className="mt-3 rounded-lg border border-gold/30 bg-gold/5 p-2 text-xs text-gold">
              Missing evidence: {recommendation.missingInputs.join(', ')}. The engine stays conservative until these are recorded.
            </div>
          )}
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
                {usageDetail.installScope} The FAI blend uses {usageDetail.primaryPct}% primary and {usageDetail.secondaryPct}% secondary.
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

            {usage === 'iron-man' && (
              <div className="mt-4 border-t border-fai/20 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-black text-chalk">Restricted Iron Man Package</div>
                    <p className="mt-1 text-xs text-muted">One or two formations, no more than ten calls, and a maximum 30% planned secondary workload.</p>
                  </div>
                  <select className="rounded-lg border border-line bg-panel px-3 py-2 text-xs font-bold text-chalk" value={packageStatus} onChange={(event) => setPackageStatus(event.target.value as IronManPackageStatus)}>
                    <option value="planning">Planning</option>
                    <option value="installing">Installing</option>
                    <option value="ready">Ready</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className={labelCls}>Allowed formations</span>
                    <textarea className={`${inputCls} min-h-24`} value={packageFormations} onChange={(event) => setPackageFormations(event.target.value)} placeholder="Doubles&#10;Trips" />
                    <span className={`mt-1 block text-[11px] ${formationItems.length > IRON_MAN_MAX_FORMATIONS ? 'text-down' : 'text-muted'}`}>{formationItems.length}/{IRON_MAN_MAX_FORMATIONS} formations</span>
                  </label>
                  <label>
                    <span className={labelCls}>Allowed calls / assignments</span>
                    <textarea className={`${inputCls} min-h-24`} value={packageCalls} onChange={(event) => setPackageCalls(event.target.value)} placeholder="Cloud&#10;Sky&#10;Boundary pressure" />
                    <span className={`mt-1 block text-[11px] ${callItems.length > IRON_MAN_MAX_CALLS ? 'text-down' : 'text-muted'}`}>{callItems.length}/{IRON_MAN_MAX_CALLS} calls</span>
                  </label>
                  <label>
                    <span className={labelCls}>Secondary snap ceiling</span>
                    <div className="flex items-center gap-2"><input className={inputCls} type="number" min="0" max="30" value={secondarySnapCapPct} onChange={(event) => setSecondarySnapCapPct(event.target.value)} /><span className="text-sm font-black text-muted">%</span></div>
                  </label>
                  <label>
                    <span className={labelCls}>Package review date</span>
                    <input className={inputCls} type="date" value={packageReviewDate} onChange={(event) => setPackageReviewDate(event.target.value)} />
                  </label>
                  <label className="sm:col-span-2">
                    <span className={labelCls}>Simplified responsibility rules</span>
                    <textarea className={`${inputCls} min-h-20`} value={packageResponsibilities} onChange={(event) => setPackageResponsibilities(event.target.value)} placeholder="Example: field-side only; no motion checks; play Cloud unless the formation is empty." />
                  </label>
                </div>
              </div>
            )}
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
