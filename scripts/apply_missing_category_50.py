from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Missing marker: {label}')
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# Scoring engine: an entirely untested category contributes neutral 50.
# ---------------------------------------------------------------------------
p = Path('src/lib/compute.ts')
s = p.read_text()
s = replace_once(
    s,
    """  Athlete,
  Category,
  CategoryScores,
""",
    """  Athlete,
  CategoryScores,
""",
    'remove unused Category import',
)
s = replace_once(
    s,
    """  METRICS_BY_CATEGORY,
  metricWeightFor,
  REQUIRED_METRICS,
""",
    """  METRICS_BY_CATEGORY,
  metricWeightFor,
  NEUTRAL_SCORE,
  REQUIRED_METRICS,
""",
    'import neutral score',
)
s = replace_once(
    s,
    """function emptyCategories(): CategoryScores {
  return Object.fromEntries(CATEGORIES.map((category) => [category, 0])) as CategoryScores
}
""",
    """function emptyCategories(): CategoryScores {
  // A category with no usable test result is neutral—not zero and not omitted.
  // Raw metrics remain undefined, so completion and missing-test UI stay honest.
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, NEUTRAL_SCORE]),
  ) as CategoryScores
}
""",
    'neutral category defaults',
)
s = replace_once(
    s,
    """  const categories = emptyCategories()
  const categoryHasData = new Map<Category, boolean>()
  for (const category of CATEGORIES) {
""",
    """  const categories = emptyCategories()
  for (const category of CATEGORIES) {
""",
    'remove category data map',
)
s = replace_once(
    s,
    """    categoryHasData.set(category, scoredMetrics.length > 0)
    if (scoredMetrics.length > 0) {
""",
    """    if (scoredMetrics.length > 0) {
""",
    'remove category data marker',
)
s = replace_once(
    s,
    """  const categoryWeights = categoryWeightsFor(positionGroup)
  const conditioningPresent = categoryHasData.get('Conditioning') === true
  const denominator = conditioningPresent ? 1 : 1 - categoryWeights.Conditioning
  let weighted = 0
  for (const category of CATEGORIES) {
    if (category === 'Conditioning' && !conditioningPresent) continue
    weighted += categories[category] * categoryWeights[category]
  }
  const fai = denominator > 0 ? round1(clamp(weighted / denominator, 0, 100)) : 0
""",
    """  const categoryWeights = categoryWeightsFor(positionGroup)
  let weighted = 0
  for (const category of CATEGORIES) {
    weighted += categories[category] * categoryWeights[category]
  }
  const fai = round1(clamp(weighted, 0, 100))
""",
    'full weighted neutral calculation',
)
p.write_text(s)


# ---------------------------------------------------------------------------
# Regression coverage.
# ---------------------------------------------------------------------------
p = Path('src/lib/compute.test.ts')
s = p.read_text()
s = replace_once(
    s,
    """    expect(computed[0].completionPct).toBe(100)
    expect(computed[0].scoreStatus).toBe('complete')
""",
    """    expect(computed[0].completionPct).toBe(100)
    expect(computed[0].scoreStatus).toBe('complete')
    expect(computed[0].categories.Conditioning).toBe(50)
    expect(computed[0].metrics.cond51015).toBeUndefined()
""",
    'optional missing conditioning assertion',
)
s = replace_once(
    s,
    """  it('stacks the Playmaker and awareness boosts onto FAI while keeping the base', () => {
""",
    """  it('defaults entirely missing categories to 50 without hiding missing tests', () => {
    const partial = computeAll({
      athletes: [athlete],
      events: [event],
      sessions: [session('neutral-missing', '2026-06-01', {
        dash40_1: 4.7,
        fly10_1: 1.55,
      })],
    })[0]

    expect(partial.categories.Jump).toBe(50)
    expect(partial.categories.Power).toBe(50)
    expect(partial.categories.Pursuit).toBe(50)
    expect(partial.categories['Change of Direction']).toBe(50)
    expect(partial.categories.Conditioning).toBe(50)
    expect(partial.categories.Strength).toBe(50)
    expect(partial.metrics.verticalJump).toBeUndefined()
    expect(partial.metrics.broadJump).toBeUndefined()
    expect(partial.completionPct).toBeLessThan(60)
    expect(partial.scoreStatus).toBe('insufficient')

    const weights = categoryWeightsFor('WR')
    const expectedFai = Math.round((
      partial.categories.Speed * weights.Speed
      + partial.categories.Acceleration * weights.Acceleration
      + partial.categories.Jump * weights.Jump
      + partial.categories.Power * weights.Power
      + partial.categories.Pursuit * weights.Pursuit
      + partial.categories['Change of Direction'] * weights['Change of Direction']
      + partial.categories.Conditioning * weights.Conditioning
      + partial.categories.Strength * weights.Strength
    ) * 10) / 10
    expect(partial.fai).toBe(expectedFai)
  })

  it('stacks the Playmaker and awareness boosts onto FAI while keeping the base', () => {
""",
    'missing category regression test',
)
p.write_text(s)
