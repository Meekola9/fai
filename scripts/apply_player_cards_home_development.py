from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"Expected block not found in {path}: {old[:140]!r}")
    file.write_text(text.replace(old, new, 1))


# ---------------------------------------------------------------------------
# Coach-facing athlete profile
# ---------------------------------------------------------------------------
profile = "src/pages/AthleteProfile.tsx"

replace_once(
    profile,
    "import { CATEGORIES, CATEGORY_SHORT, formatHeight } from '../data/constants'",
    "import { CATEGORIES, CATEGORY_SHORT } from '../data/constants'",
)
replace_once(
    profile,
    """import {
  Avatar,
  Card,
  FaiRing,
  Pill,
  SectionTitle,
} from '../components/ui'""",
    "import { Card, Pill, SectionTitle } from '../components/ui'",
)
replace_once(
    profile,
    "import { OverallRatingName } from '../components/OverallRatingName'",
    """import { AthletePlayerCard } from '../components/AthletePlayerCard'
import { HomeDevelopmentPlan } from '../components/HomeDevelopmentPlan'""",
)
replace_once(
    profile,
    "const { data, computed, resultsForEvent, gradeLabelFor, canEdit } = useStore()",
    "const { data, computed, resultsForEvent, gradeLabelFor, canEdit, teamName } = useStore()",
)

old_no_data = """        <Card className=\"p-6\">
          <div className=\"flex items-center gap-4\">
            <Avatar name={athlete.name} photoUrl={athlete.photoUrl} size={80} />
            <div>
              <h1 className=\"text-2xl font-black tracking-tight text-chalk\">{athlete.name}</h1>
              <div className=\"mt-1 flex flex-wrap items-center gap-2 text-sm text-muted\">
                <Pill tone=\"fai\">{athlete.positionGroup}</Pill>
                <span>{athlete.secondaryPosition ? `${athlete.position} / ${athlete.secondaryPosition}` : athlete.position}</span>
                <span>· {gradeLabelFor(athlete, 'long')}</span>
                <span>· {formatHeight(athlete.heightIn)}</span>
                <span>· {athlete.weightLbs} lbs</span>
              </div>
            </div>
          </div>
          <div className=\"mt-6 rounded-xl border border-dashed border-line bg-panel-2/30 p-6 text-center\">
            <div className=\"text-base font-bold text-chalk\">No 2026 testing data yet</div>
            <div className=\"mt-1 text-sm text-muted\">Historical seasons are available only from Rankings.</div>
            <div className=\"mt-4 flex flex-wrap justify-center gap-2\">
              {canEdit && (
                <Link to={`/entry?athlete=${athlete.id}`} className=\"inline-block rounded-lg bg-fai px-5 py-2 text-sm font-bold text-ink\">+ Enter 2026 Testing Data</Link>
              )}
              <Link to=\"/leaderboard\" className=\"inline-block rounded-lg border border-line px-5 py-2 text-sm font-bold text-chalk\">View Rankings</Link>
            </div>
          </div>
        </Card>"""
new_no_data = """        <AthletePlayerCard
          athlete={athlete}
          teamName={teamName}
          gradeLabel={gradeLabelFor(athlete, 'long')}
          weightLbs={athlete.weightLbs}
          statusLabel=\"No 2026 testing\"
        />
        <Card className=\"p-6\">
          <div className=\"rounded-xl border border-dashed border-line bg-panel-2/30 p-6 text-center\">
            <div className=\"text-base font-bold text-chalk\">No 2026 testing data yet</div>
            <div className=\"mt-1 text-sm text-muted\">Complete the testing battery to activate the rating, archetype, ranks, weaknesses, and at-home development plan.</div>
            <div className=\"mt-4 flex flex-wrap justify-center gap-2\">
              {canEdit && (
                <Link to={`/entry?athlete=${athlete.id}`} className=\"inline-block rounded-lg bg-fai px-5 py-2 text-sm font-bold text-ink\">+ Enter 2026 Testing Data</Link>
              )}
              <Link to=\"/leaderboards\" className=\"inline-block rounded-lg border border-line px-5 py-2 text-sm font-bold text-chalk\">View Rankings</Link>
            </div>
          </div>
        </Card>"""
replace_once(profile, old_no_data, new_no_data)

old_header = """      <Card glow className=\"p-5\">
        <div className=\"flex flex-col gap-5 sm:flex-row sm:items-center\">
          <Avatar name={athlete.name} photoUrl={athlete.photoUrl} size={96} />
          <div className=\"flex-1\">
            <h1 className=\"text-3xl font-black tracking-tight text-chalk\">{athlete.name}</h1>
            <div className=\"mt-1 flex flex-wrap items-center gap-2 text-sm text-muted\">
              <Pill tone=\"fai\">{athlete.positionGroup}</Pill>
              <span>{athlete.secondaryPosition ? `${athlete.position} / ${athlete.secondaryPosition}` : athlete.position}</span>
              <span>· {gradeLabelFor(athlete, 'long')}</span>
              <span>· {current.session.weightLbsSnapshot ?? athlete.weightLbs} lbs at test</span>
            </div>
            <div className=\"mt-3 flex flex-wrap gap-2\">
              <Pill tone=\"fai\">2026 season</Pill>
              <Pill tone={rankEligible ? 'up' : 'gold'}>
                {rankEligible ? 'Official score' : `${current.scoreStatus} · ${current.completionPct}% complete`}
              </Pill>
              <OverallRatingName score={current.fai} />
              {rankEligible && <Pill tone=\"gold\">2026 Team Rank #{displayResult.teamRank} / {displayResult.teamCount}</Pill>}
              {rankEligible && <Pill>{current.session.positionGroupSnapshot ?? athlete.positionGroup} Rank #{displayResult.groupRank} / {displayResult.groupCount}</Pill>}
              {displayResult.impactBoostPct > 0 && (
                <Pill tone=\"fai\">⚡ +{displayResult.impactBoostPct}% Playmaker</Pill>
              )}
              {displayResult.awarenessBoostPct > 0 && (
                <Pill tone=\"fai\">🧠 +{displayResult.awarenessBoostPct}% Awareness IQ</Pill>
              )}
              {(displayResult.impactBoostPct > 0 || displayResult.awarenessBoostPct > 0) && (
                <Pill tone=\"gold\">Boosted from {displayResult.baseFai.toFixed(1)}</Pill>
              )}
              {typeof current.metrics.bestFly === 'number' && current.metrics.bestFly > 0 && (
                <Pill tone=\"gold\">
                  Top Speed {flyTimeToMph(current.metrics.bestFly).toFixed(1)} mph
                </Pill>
              )}
            </div>
          </div>
          <div className=\"text-center\">
            <FaiRing score={current.fai} size={130} label={rankEligible ? 'FAI' : 'PROV'} />
            <div className=\"mt-2\"><OverallRatingName score={current.fai} compact /></div>
          </div>
        </div>

        {!rankEligible && (
          <div className=\"mt-5 rounded-xl border border-flame/30 bg-flame/5 p-4 text-sm text-muted\">
            This 2026 score is visible for coaching feedback but is excluded from official rankings until all required tests are complete.
          </div>
        )}
      </Card>"""
new_header = """      <AthletePlayerCard
        athlete={athlete}
        score={current.fai}
        archetype={positionArchetype?.name}
        teamName={teamName}
        gradeLabel={gradeLabelFor(athlete, 'long')}
        weightLbs={current.session.weightLbsSnapshot ?? athlete.weightLbs}
        rankEligible={rankEligible}
        teamRank={displayResult.teamRank}
        teamCount={displayResult.teamCount}
        groupRank={displayResult.groupRank}
        groupCount={displayResult.groupCount}
        strongestTrait={strong[0] ? `${strong[0]} ${positionCurrent.categories[strong[0]].toFixed(0)}` : undefined}
        statusLabel={rankEligible ? 'Official 2026 score' : `${current.scoreStatus} · ${current.completionPct}% complete`}
      />

      <Card className=\"p-4\">
        <div className=\"flex flex-wrap items-center gap-2\">
          <Pill tone=\"fai\">2026 season</Pill>
          <Pill tone={rankEligible ? 'up' : 'gold'}>{rankEligible ? 'Official score' : `${current.scoreStatus} · ${current.completionPct}% complete`}</Pill>
          {displayResult.impactBoostPct > 0 && <Pill tone=\"fai\">⚡ +{displayResult.impactBoostPct}% Playmaker</Pill>}
          {displayResult.awarenessBoostPct > 0 && <Pill tone=\"fai\">🧠 +{displayResult.awarenessBoostPct}% Awareness IQ</Pill>}
          {(displayResult.impactBoostPct > 0 || displayResult.awarenessBoostPct > 0) && <Pill tone=\"gold\">Boosted from {displayResult.baseFai.toFixed(1)}</Pill>}
          {typeof current.metrics.bestFly === 'number' && current.metrics.bestFly > 0 && <Pill tone=\"gold\">Top Speed {flyTimeToMph(current.metrics.bestFly).toFixed(1)} mph</Pill>}
        </div>
        {!rankEligible && (
          <div className=\"mt-3 rounded-xl border border-flame/30 bg-flame/5 p-3 text-sm text-muted\">
            This score is visible for coaching feedback but is excluded from official rankings until all required tests are complete.
          </div>
        )}
      </Card>"""
replace_once(profile, old_header, new_header)

insert_after_weakness_grid = """          <div className=\"grid gap-4 sm:grid-cols-2\">
            <Card className=\"p-4\">
              <div className=\"mb-2 text-xs font-bold uppercase tracking-wider text-up\">2026 Strengths</div>
              <div className=\"flex flex-wrap gap-1.5\">{strong.length ? strong.map((category) => <Pill key={category} tone=\"up\">{category} · {positionCurrent.categories[category].toFixed(0)}</Pill>) : <span className=\"text-xs text-muted\">Building baseline strengths.</span>}</div>
            </Card>
            <Card className=\"p-4\">
              <div className=\"mb-2 text-xs font-bold uppercase tracking-wider text-down\">2026 Weaknesses</div>
              <div className=\"flex flex-wrap gap-1.5\">{weak.length ? weak.map((category) => <Pill key={category} tone=\"down\">{category} · {positionCurrent.categories[category].toFixed(0)}</Pill>) : <span className=\"text-xs text-muted\">No major weakness flagged.</span>}</div>
            </Card>
          </div>"""
replace_once(
    profile,
    insert_after_weakness_grid,
    insert_after_weakness_grid + """

          <HomeDevelopmentPlan
            categories={weak}
            scores={positionCurrent.categories}
            title={`${selectedPositionName} At-Home Development`}
          />""",
)

replace_once(
    profile,
    "<Link to=\"/leaderboard\" className=\"font-bold text-fai hover:underline\">View historical seasons in Rankings.</Link>",
    "<Link to=\"/leaderboards\" className=\"font-bold text-fai hover:underline\">View historical seasons in Rankings.</Link>",
)

# ---------------------------------------------------------------------------
# Athlete self-service profile
# ---------------------------------------------------------------------------
account = "src/pages/MyAthleteAccount.tsx"
replace_once(
    account,
    "import { awarenessBoostForScore, awarenessLevel, latestAwarenessFor } from '../lib/awarenessQuiz'",
    """import { awarenessBoostForScore, awarenessLevel, latestAwarenessFor } from '../lib/awarenessQuiz'
import { AthletePlayerCard } from '../components/AthletePlayerCard'
import { HomeDevelopmentPlan } from '../components/HomeDevelopmentPlan'
import { archetypeFor } from '../lib/archetypes'
import { strengths, weaknesses } from '../lib/progress'""",
)
replace_once(
    account,
    "const { data, userEmail, signOut } = useStore()",
    "const { data, userEmail, signOut, teamName, resultsForEvent, gradeLabelFor } = useStore()",
)
replace_once(
    account,
    "  const athlete = claim ? data.athletes.find((item) => item.id === claim.athleteId) : undefined\n",
    """  const athlete = claim ? data.athletes.find((item) => item.id === claim.athleteId) : undefined
  const athleteResult = athlete
    ? resultsForEvent('season-2026').find((item) => item.athlete.id === athlete.id)
    : undefined
  const athleteWeaknesses = athleteResult ? weaknesses(athleteResult.current) : []
  const athleteStrengths = athleteResult ? strengths(athleteResult.current) : []
  const athleteArchetype = athleteResult ? archetypeFor(athleteResult.current) : undefined
""",
)
replace_once(
    account,
    """      <AwarenessQuizCard athleteId={athlete.id} />

      <Card className=\"p-5\">""",
    """      <AthletePlayerCard
        athlete={{ ...athlete, photoUrl: photoPreview || photoUrl || athlete.photoUrl }}
        score={athleteResult?.current.fai}
        archetype={athleteArchetype?.name}
        teamName={teamName}
        gradeLabel={gradeLabelFor(athlete, 'long')}
        weightLbs={athleteResult?.current.session.weightLbsSnapshot ?? athlete.weightLbs}
        rankEligible={athleteResult?.rankEligible}
        teamRank={athleteResult?.teamRank}
        teamCount={athleteResult?.teamCount}
        groupRank={athleteResult?.groupRank}
        groupCount={athleteResult?.groupCount}
        strongestTrait={athleteStrengths[0] && athleteResult ? `${athleteStrengths[0]} ${athleteResult.current.categories[athleteStrengths[0]].toFixed(0)}` : undefined}
        statusLabel={athleteResult ? `${athleteResult.current.scoreStatus} · ${athleteResult.current.completionPct}% complete` : 'No 2026 testing'}
      />

      <HomeDevelopmentPlan
        categories={athleteWeaknesses}
        scores={athleteResult?.current.categories}
        title=\"My At-Home Development Plan\"
      />

      <AwarenessQuizCard athleteId={athlete.id} />

      <Card className=\"p-5\">""",
)

print("Player cards and at-home development plans integrated.")
