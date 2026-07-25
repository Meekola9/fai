import type { Category } from '../types'

export interface HomeExercise {
  name: string
  prescription: string
  cue: string
  equipment?: string
}

export interface HomeTrainingPlan {
  category: Category
  objective: string
  frequency: string
  exercises: readonly HomeExercise[]
}

export const HOME_TRAINING_PLANS: Record<Category, HomeTrainingPlan> = {
  Speed: {
    category: 'Speed',
    objective: 'Improve upright mechanics, stiffness, and fast ground contacts.',
    frequency: '2 days per week after a full warm-up',
    exercises: [
      { name: 'Wall switch series', prescription: '3 × 8 each leg', cue: 'Tall hips; switch quickly without arching the back.', equipment: 'Wall' },
      { name: 'Ankle pogos', prescription: '3 × 20 contacts', cue: 'Stay tall and bounce from the ankles with quiet landings.' },
      { name: 'Fast-leg cycles', prescription: '3 × 10 each leg', cue: 'Step over the opposite knee and strike down under the hips.' },
    ],
  },
  Acceleration: {
    category: 'Acceleration',
    objective: 'Build projection, first-step force, and early sprint posture.',
    frequency: '2 days per week with at least 48 hours between sessions',
    exercises: [
      { name: 'Wall drive holds', prescription: '3 × 20 seconds each leg', cue: 'Straight line from head through heel; push the wall away.', equipment: 'Wall' },
      { name: 'Falling starts', prescription: '6 × 5–10 yards', cue: 'Fall as one unit, punch out, and keep the first steps low.', equipment: 'Safe outdoor space' },
      { name: 'Split-stance isometric push', prescription: '3 × 15 seconds each side', cue: 'Drive the front foot backward into the floor without moving.' },
    ],
  },
  Jump: {
    category: 'Jump',
    objective: 'Improve elastic response, landing control, and vertical force.',
    frequency: '2 days per week; stop before jump height drops',
    exercises: [
      { name: 'Snap-down to stick', prescription: '3 × 5 reps', cue: 'Land quietly with knees tracking over the toes.' },
      { name: 'Countermovement jumps', prescription: '4 × 4 reps', cue: 'Use a fast dip and finish tall; reset fully between jumps.' },
      { name: 'Single-leg calf raises', prescription: '3 × 15 each side', cue: 'Use full range and pause at the top.', equipment: 'Step optional' },
    ],
  },
  Power: {
    category: 'Power',
    objective: 'Produce force quickly through the hips and legs.',
    frequency: '2 days per week with low repetitions and full recovery',
    exercises: [
      { name: 'Squat jumps', prescription: '4 × 5 reps', cue: 'Jump violently, land softly, and reset before every rep.' },
      { name: 'Standing broad jumps', prescription: '4 × 3 reps', cue: 'Throw the arms, extend the hips, and stick the landing.', equipment: 'Safe outdoor space' },
      { name: 'Explosive incline push-ups', prescription: '3 × 6 reps', cue: 'Move fast while keeping the body rigid.', equipment: 'Bench, couch, or sturdy table' },
    ],
  },
  Pursuit: {
    category: 'Pursuit',
    objective: 'Improve reaction, closing angles, and transition speed.',
    frequency: '2–3 short sessions per week',
    exercises: [
      { name: 'Backpedal-break-sprint', prescription: '4 × 3 reps each direction', cue: 'Keep the feet active, plant outside the frame, and drive out.', equipment: '5–10 yards of space' },
      { name: 'Angle pursuit drill', prescription: '5 reps each side', cue: 'Take an intercept angle instead of chasing directly behind.', equipment: 'Cone or household marker' },
      { name: 'Partner or phone reaction shuffle', prescription: '6 × 10 seconds', cue: 'React to the signal and keep the hips square.' },
    ],
  },
  'Change of Direction': {
    category: 'Change of Direction',
    objective: 'Improve braking, body control, and re-acceleration.',
    frequency: '2 days per week on a non-slip surface',
    exercises: [
      { name: 'Deceleration stick', prescription: '4 × 3 reps each leg', cue: 'Lower the hips before the stop and hold the finish for two seconds.' },
      { name: 'Lateral bound and hold', prescription: '3 × 5 each side', cue: 'Land over the whole foot and stabilize before the next rep.' },
      { name: '5-5 shuttle', prescription: '4 reps', cue: 'Sink before the line, plant outside the body, and push away.', equipment: 'Two markers 5 yards apart' },
    ],
  },
  Conditioning: {
    category: 'Conditioning',
    objective: 'Build repeat-effort capacity without turning every session into a max test.',
    frequency: '2 days per week away from hard speed work',
    exercises: [
      { name: 'Tempo run-walks', prescription: '8 × 60 yards at 65–70%', cue: 'Stay relaxed and walk back for recovery.', equipment: 'Safe field or straight path' },
      { name: 'Jump-rope intervals', prescription: '6 × 45 seconds; 30 seconds rest', cue: 'Keep contacts low and rhythmic.', equipment: 'Jump rope' },
      { name: 'Bodyweight capacity circuit', prescription: '3 rounds: 10 squats, 8 push-ups, 20 mountain climbers', cue: 'Move steadily; do not race the first round.' },
    ],
  },
  Strength: {
    category: 'Strength',
    objective: 'Build general force capacity and trunk control with bodyweight.',
    frequency: '2–3 days per week',
    exercises: [
      { name: 'Rear-foot split squats', prescription: '3 × 8–12 each leg', cue: 'Control the descent and drive through the whole front foot.', equipment: 'Couch or chair optional' },
      { name: 'Push-ups', prescription: '3 sets, stopping 2 reps before failure', cue: 'Keep the body straight and bring the chest between the hands.' },
      { name: 'Single-leg hip bridges', prescription: '3 × 12 each leg', cue: 'Finish with the glute, not the lower back.' },
    ],
  },
}

export function homeTrainingPlansFor(categories: readonly Category[], limit = 2): HomeTrainingPlan[] {
  const unique = [...new Set(categories)]
  return unique.slice(0, limit).map((category) => HOME_TRAINING_PLANS[category])
}
