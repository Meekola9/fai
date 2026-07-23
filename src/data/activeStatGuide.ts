import { STAT_GUIDE, type StatGuideEntry } from './statGuide'

const POWER_CLEAN_GUIDE: readonly StatGuideEntry[] = [
  {
    id: 'test-power-clean-max',
    name: 'Power Clean Max',
    section: 'test',
    metricKey: 'powerCleanMax',
    unit: 'pounds',
    direction: 'higher',
    required: true,
    category: 'Power',
    meaning: 'The heaviest technically valid Power Clean completed for one repetition, or the estimated one-repetition maximum created from a legacy body-weight hang-clean AMRAP result when no direct max exists.',
    footballMeaning: 'Provides a weight-room measure of rapid force production, coordinated triple extension, bar acceleration, and the ability to express lower-body power through the entire body.',
    interpretation: 'The raw result is displayed in pounds, but FAI grades the lift relative to testing body weight. Current anchors are 0.60× BW = 45, 0.75× = 65, 0.80× = 70, 1.00× = 80, 1.20× = 90, and 1.50× = 100. A directly recorded max always overrides an estimate from the former body-weight repetition test.',
    caution: 'Power Clean performance is strongly influenced by Olympic-lift technique, catch quality, mobility, coaching standard, and testing confidence. Body-weight-relative scoring is fairer across athlete sizes, but it can still favor lighter athletes if technical proficiency differs substantially. It should not be treated as a direct measurement of blocking, tackling, or collision ability.',
    scoringNote: 'FAI converts the Power Clean max to a clean-to-body-weight ratio, interpolates between the selected high-school standards, and averages that normalized score with Broad Jump inside the Power category. The raw max remains available for absolute-load rankings.',
    searchTerms: ['power clean', 'clean max', 'one rep max', '1rm', 'explosive strength', 'body weight ratio', 'relative power'],
  },
  {
    id: 'test-legacy-hang-clean',
    name: 'Legacy Body-Weight Hang-Clean Reps',
    section: 'test',
    unit: 'repetitions',
    direction: 'higher',
    required: false,
    category: 'Power',
    meaning: 'The historical number of technically valid hang-clean repetitions completed with the bar loaded to the athlete’s body weight during the former testing protocol.',
    footballMeaning: 'The old test reflected repeated explosive output, coordination, and relative power endurance, while also allowing earlier athletes to remain comparable after the testing battery changed.',
    interpretation: 'FAI converts the recorded body weight and repetitions into an estimated Power Clean 1RM using body weight × (1 + repetitions ÷ 30), rounded to the nearest five pounds. That estimated max is then graded against the same body-weight-relative Power Clean standards.',
    caution: 'This is an estimate rather than a measured maximum, and high-repetition Olympic-lift sets can become technique- and fatigue-limited. The original testing weight must be present for a valid conversion.',
    scoringNote: 'Used only when no direct Power Clean max is recorded. The legacy repetition count remains stored for transparency and historical review.',
    searchTerms: ['hang clean', 'body weight reps', 'legacy clean', 'epley', 'estimated max'],
  },
]

/** Current public guide with the retired clean-repetition entry replaced. */
export const ACTIVE_STAT_GUIDE: readonly StatGuideEntry[] = [
  ...STAT_GUIDE.filter((entry) => entry.id !== 'test-hang-clean'),
  ...POWER_CLEAN_GUIDE,
]
