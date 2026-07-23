import { describe, expect, it } from 'vitest'
import {
  AWARENESS_QUIZ,
  AWARENESS_QUESTION_COUNT,
  awarenessBoostByAthlete,
  awarenessBoostForScore,
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

  it('maps awareness scores to the FAI boost bands', () => {
    expect(awarenessBoostForScore(100)).toBe(5)
    expect(awarenessBoostForScore(93)).toBe(3)
    expect(awarenessBoostForScore(90)).toBe(3)
    expect(awarenessBoostForScore(85)).toBe(2)
    expect(awarenessBoostForScore(80)).toBe(2)
    expect(awarenessBoostForScore(77)).toBe(1.5)
    expect(awarenessBoostForScore(75)).toBe(1.5)
    expect(awarenessBoostForScore(74)).toBe(0)
    expect(awarenessBoostForScore(0)).toBe(0)
  })

  it('boosts each athlete from their latest qualifying score, omitting the rest', () => {
    const boosts = awarenessBoostByAthlete([
      { athleteId: 'a', score: 60, takenAt: '2026-07-01T00:00:00.000Z' },
      { athleteId: 'a', score: 100, takenAt: '2026-07-20T00:00:00.000Z' }, // latest wins → +5
      { athleteId: 'b', score: 80, takenAt: '2026-07-10T00:00:00.000Z' }, // +2
      { athleteId: 'c', score: 50, takenAt: '2026-07-10T00:00:00.000Z' }, // below threshold → omitted
    ])
    expect(boosts.get('a')).toBe(5)
    expect(boosts.get('b')).toBe(2)
    expect(boosts.has('c')).toBe(false)
    // A never-tested athlete is simply absent → no effect.
    expect(boosts.has('z')).toBe(false)
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
