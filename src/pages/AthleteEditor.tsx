import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Card } from '../components/ui'
import { POSITION_GROUPS, GRADES, parseHeight, formatHeight } from '../data/constants'
import type { Athlete, PositionGroup } from '../types'

const inputCls =
  'w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm font-semibold text-chalk outline-none placeholder:text-muted focus:border-fai'
const labelCls = 'text-xs font-semibold uppercase tracking-wider text-muted'

export default function AthleteEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, addAthlete, updateAthlete, deleteAthlete } = useStore()
  const existing = id ? data.athletes.find((a) => a.id === id) : undefined

  const [name, setName] = useState(existing?.name ?? '')
  const [grade, setGrade] = useState(existing?.grade ?? 9)
  const [position, setPosition] = useState(existing?.position ?? '')
  const [group, setGroup] = useState<PositionGroup>(existing?.positionGroup ?? 'WR')
  const [height, setHeight] = useState(existing ? formatHeight(existing.heightIn) : '')
  const [weight, setWeight] = useState(existing?.weightLbs ? String(existing.weightLbs) : '')
  const [photoUrl, setPhotoUrl] = useState(existing?.photoUrl ?? '')
  const [hudlUrl, setHudlUrl] = useState(existing?.hudlUrl ?? '')

  function save() {
    if (!name.trim()) return
    const payload: Omit<Athlete, 'id'> = {
      name: name.trim(),
      grade: Number(grade),
      position: position.trim() || group,
      positionGroup: group,
      heightIn: parseHeight(height),
      weightLbs: Number(weight) || 0,
      photoUrl: photoUrl.trim() || undefined,
      hudlUrl: hudlUrl.trim() || undefined,
    }
    if (existing) {
      updateAthlete({ ...payload, id: existing.id })
      nav(`/athletes/${existing.id}`)
    } else {
      const newId = addAthlete(payload)
      nav(`/athletes/${newId}`)
    }
  }

  function remove() {
    if (!existing) return
    if (confirm(`Delete ${existing.name} and all their testing data? This cannot be undone.`)) {
      deleteAthlete(existing.id)
      nav('/athletes')
    }
  }

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
            <label className={labelCls}>Position Group</label>
            <select className={inputCls} value={group} onChange={(e) => setGroup(e.target.value as PositionGroup)}>
              {POSITION_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Position</label>
            <input className={inputCls} value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Slot WR" />
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

        <div>
          <label className={labelCls}>Photo URL (optional)</label>
          <input className={inputCls} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" />
        </div>

        <div>
          <label className={labelCls}>Hudl / film link (optional)</label>
          <input className={inputCls} value={hudlUrl} onChange={(e) => setHudlUrl(e.target.value)} placeholder="https://www.hudl.com/…" />
          <p className="mt-1 text-xs text-muted">
            Paste a Hudl highlight <strong>embed</strong> link (or YouTube/Vimeo) to play inline on the profile; any other Hudl link shows a “Watch film” button.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={save}
            disabled={!name.trim()}
            className="rounded-lg bg-fai px-6 py-2 text-sm font-bold text-ink disabled:opacity-40"
          >
            {existing ? 'Save Changes' : 'Create Athlete'}
          </button>
          {existing && (
            <button onClick={remove} className="rounded-lg border border-down/40 px-4 py-2 text-sm font-bold text-down hover:bg-down/10">
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
