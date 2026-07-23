// ---------------------------------------------------------------------------
// Football Awareness Quiz.
//
// A 15-question, multiple-choice football-IQ check athletes take from their own
// account. Scoring is pure and deterministic so it can be unit-tested and run
// on device; the resulting awareness score (0-100) is stored per athlete.
//
// Questions favor widely-true fundamentals over level-specific rule quirks so
// the score reflects football knowledge, not a particular rulebook edition.
// ---------------------------------------------------------------------------

export type AwarenessTopic =
  | 'Rules'
  | 'Scoring'
  | 'Positions'
  | 'Coverage'
  | 'Situational'

export interface QuizQuestion {
  id: string
  topic: AwarenessTopic
  prompt: string
  options: string[]
  /** Index into `options` of the correct answer. */
  answer: number
  explanation: string
}

export interface AwarenessQuiz {
  id: string
  title: string
  questions: QuizQuestion[]
}

export const AWARENESS_QUIZ: AwarenessQuiz = {
  id: 'awareness-v1',
  title: 'Football Awareness Quiz',
  questions: [
    {
      id: 'q1',
      topic: 'Rules',
      prompt: 'How many players from one team are on the field at the snap?',
      options: ['9', '10', '11', '12'],
      answer: 2,
      explanation: 'Each team lines up 11 players at the snap; 12 is a penalty.',
    },
    {
      id: 'q2',
      topic: 'Rules',
      prompt: 'At least how many offensive players must be on the line of scrimmage at the snap?',
      options: ['5', '6', '7', '8'],
      answer: 2,
      explanation: 'A legal formation needs at least 7 players on the line of scrimmage.',
    },
    {
      id: 'q3',
      topic: 'Scoring',
      prompt: 'How many points is a touchdown worth (before any try)?',
      options: ['3', '6', '7', '2'],
      answer: 1,
      explanation: 'A touchdown is 6 points; the extra-point or two-point try comes after.',
    },
    {
      id: 'q4',
      topic: 'Scoring',
      prompt: 'How many points is a safety worth for the defense?',
      options: ['1', '2', '3', '6'],
      answer: 1,
      explanation: 'A safety scores 2 points and the scoring team also receives the ball.',
    },
    {
      id: 'q5',
      topic: 'Scoring',
      prompt: 'A successful field goal is worth how many points?',
      options: ['2', '3', '4', '6'],
      answer: 1,
      explanation: 'A field goal is worth 3 points.',
    },
    {
      id: 'q6',
      topic: 'Rules',
      prompt: 'How many yards must the offense gain to earn a new set of downs (standard)?',
      options: ['5', '10', '15', '20'],
      answer: 1,
      explanation: 'The offense has four downs to gain 10 yards for a new first down.',
    },
    {
      id: 'q7',
      topic: 'Rules',
      prompt: 'What is the penalty for a false start?',
      options: [
        '5 yards, dead ball',
        '10 yards, replay down',
        '15 yards, automatic first down',
        'Loss of down only',
      ],
      answer: 0,
      explanation: 'A false start is a 5-yard, dead-ball penalty on the offense.',
    },
    {
      id: 'q8',
      topic: 'Positions',
      prompt: 'Which of these players is normally an eligible receiver?',
      options: ['Left tackle', 'Right guard', 'Center', 'Running back'],
      answer: 3,
      explanation: 'Interior offensive linemen are ineligible; a running back is eligible.',
    },
    {
      id: 'q9',
      topic: 'Positions',
      prompt: 'Whose primary job is to protect the quarterback and open running lanes?',
      options: ['Linebackers', 'Offensive line', 'Wide receivers', 'Safeties'],
      answer: 1,
      explanation: 'The offensive line blocks to protect the QB and create running lanes.',
    },
    {
      id: 'q10',
      topic: 'Coverage',
      prompt: 'In Cover 2, how many defenders split the deep part of the field?',
      options: ['One', 'Two', 'Three', 'Four'],
      answer: 1,
      explanation: 'Cover 2 uses two deep safeties, each responsible for half the deep field.',
    },
    {
      id: 'q11',
      topic: 'Coverage',
      prompt: 'What is man-to-man coverage?',
      options: [
        'Each defender guards a specific area of the field',
        'Each defender guards a specific offensive player',
        'All defenders rush the passer',
        'The defense only covers the deep third',
      ],
      answer: 1,
      explanation: 'In man coverage each defender is responsible for a specific receiver, not a zone.',
    },
    {
      id: 'q12',
      topic: 'Rules',
      prompt: 'At the snap, an offensive player in motion may NOT be moving in which direction?',
      options: [
        'Parallel to the line of scrimmage',
        'Toward his own end zone',
        'Toward the line of scrimmage',
        'Straight backward',
      ],
      answer: 2,
      explanation: 'A player in motion cannot be moving toward the line of scrimmage at the snap.',
    },
    {
      id: 'q13',
      topic: 'Situational',
      prompt: 'With no timeouts late in a half, how does a quarterback quickly stop the clock right after the snap?',
      options: [
        'Take a knee',
        'Spike the ball',
        'Throw it deep',
        'Call timeout',
      ],
      answer: 1,
      explanation: 'Spiking the ball immediately after the snap is a legal way to stop the clock.',
    },
    {
      id: 'q14',
      topic: 'Situational',
      prompt: 'What is an "audible"?',
      options: [
        'A defensive substitution',
        'The quarterback changing the play at the line of scrimmage',
        'A type of onside kick',
        'A referee signal',
      ],
      answer: 1,
      explanation: 'An audible is a play change the QB calls at the line based on the defense.',
    },
    {
      id: 'q15',
      topic: 'Situational',
      prompt: 'It is 3rd & 2. Which choice most reliably keeps the drive alive?',
      options: [
        'A deep shot down the sideline',
        'A short, high-percentage run or throw for the first down',
        'A quarterback kneel',
        'A punt',
      ],
      answer: 1,
      explanation: 'On 3rd & short, a high-percentage play to move the chains is the sound choice.',
    },
  ],
}

export const AWARENESS_QUESTION_COUNT = AWARENESS_QUIZ.questions.length

export interface AwarenessScore {
  correct: number
  total: number
  /** 0-100, rounded. */
  score: number
}

/**
 * Score a set of answers. `answers[i]` is the chosen option index for question
 * i, or -1/undefined if skipped. Unknown/short arrays simply count as misses.
 */
export function scoreAwareness(
  answers: ReadonlyArray<number | undefined>,
  quiz: AwarenessQuiz = AWARENESS_QUIZ,
): AwarenessScore {
  const total = quiz.questions.length
  let correct = 0
  quiz.questions.forEach((question, index) => {
    if (answers[index] === question.answer) correct += 1
  })
  return { correct, total, score: total > 0 ? Math.round((correct / total) * 100) : 0 }
}

export type AwarenessLevel = 'Elite IQ' | 'Sharp' | 'Developing' | 'Needs Study'

export function awarenessLevel(score: number): AwarenessLevel {
  if (score >= 90) return 'Elite IQ'
  if (score >= 75) return 'Sharp'
  if (score >= 60) return 'Developing'
  return 'Needs Study'
}

/** The athlete's most recent awareness result, if any (latest by takenAt). */
export function latestAwarenessFor<T extends { athleteId: string; takenAt: string }>(
  results: readonly T[],
  athleteId: string,
): T | undefined {
  return results
    .filter((result) => result.athleteId === athleteId)
    .sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0]
}
