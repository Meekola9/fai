import { describe, expect, it } from 'vitest'
import {
  AWARENESS_QUIZ,
  AWARENESS_QUESTION_COUNT,
  awarenessLevel,
  latestAwarenessFor,
  scoreAwareness,
} from './awarenessQuiz'

describe('awareness quiz', () => {
  it('ships exactly 15 well-formed questions', () => {
    expect(AWARENESS_QUESTION_COUNT).toBe(15)
    const ids = AWARENESS_QUIZ.questions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const question of AWARENESS_QUIZ.questions) {
      expect(question.options.length).toBeGreaterThanOrEqual(2)
      expect(question.answer).toBeGreaterThanOrEqual(0)
      expect(question.answer).toBeLessThan(question.options.length)
      expect(question.explanation.length).toBeGreaterThan(0)
    }
  })

  it('scores all-correct as 100 and all-wrong as 0', () => {
    const allCorrect = AWARENESS_QUIZ.questions.map((q) => q.answer)
    expect(scoreAwareness(allCorrect)).toEqual({ correct: 15, total: 15, score: 100 })

    const allWrong = AWARENESS_QUIZ.questions.map((q) => (q.answer === 0 ? 1 : 0))
    expect(scoreAwareness(allWrong)).toEqual({ correct: 0, total: 15, score: 0 })
  })

  it('rounds partial scores and treats skips as misses', () => {
    // Answer the first 9 correctly, skip the rest → 9/15 = 60.
    const answers = AWARENESS_QUIZ.questions.map((q, index) => (index < 9 ? q.answer : undefined))
    const result = scoreAwareness(answers)
    expect(result.correct).toBe(9)
    expect(result.score).toBe(60)
  })

  it('bands the awareness level', () => {
    expect(awarenessLevel(95)).toBe('Elite IQ')
    expect(awarenessLevel(80)).toBe('Sharp')
    expect(awarenessLevel(65)).toBe('Developing')
    expect(awarenessLevel(40)).toBe('Needs Study')
  })

  it('finds an athlete’s most recent result', () => {
    const results = [
      { athleteId: 'a', takenAt: '2026-07-01T10:00:00.000Z', score: 60 },
      { athleteId: 'a', takenAt: '2026-07-20T10:00:00.000Z', score: 87 },
      { athleteId: 'b', takenAt: '2026-07-25T10:00:00.000Z', score: 40 },
    ]
    expect(latestAwarenessFor(results, 'a')?.score).toBe(87)
    expect(latestAwarenessFor(results, 'c')).toBeUndefined()
  })
})
