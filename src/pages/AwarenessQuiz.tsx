import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { useAccountAccess } from '../hooks/useAccountAccess'
import { Card, Pill, SectionTitle } from '../components/ui'
import {
  AWARENESS_QUIZ,
  awarenessLevel,
  latestAwarenessFor,
  scoreAwareness,
} from '../lib/awarenessQuiz'

const LEVEL_TONE: Record<string, 'up' | 'fai' | 'gold' | 'down'> = {
  'Elite IQ': 'up',
  Sharp: 'fai',
  Developing: 'gold',
  'Needs Study': 'down',
}

function ScoreHero({ score, correct, total }: { score: number; correct: number; total: number }) {
  const level = awarenessLevel(score)
  return (
    <div className="relative overflow-hidden rounded-2xl border border-fai/30 bg-gradient-to-b from-[#0a1520] to-[#070c12] p-6 text-center">
      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-fai">Awareness Score</div>
      <div className="nums mt-2 text-7xl font-black leading-none text-chalk drop-shadow-[0_0_18px_rgba(103,232,249,0.45)]">
        {score}
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        <Pill tone={LEVEL_TONE[level]}>{level}</Pill>
        <span className="text-xs text-muted nums">{correct}/{total} correct</span>
      </div>
    </div>
  )
}

export default function AwarenessQuiz() {
  const { data, submitAwarenessResult } = useStore()
  const { role, athleteId } = useAccountAccess()
  const isAthlete = role === 'athlete' && Boolean(athleteId)
  const quiz = AWARENESS_QUIZ

  const previousBest = useMemo(
    () => (athleteId ? latestAwarenessFor(data.awarenessResults, athleteId) : undefined),
    [data.awarenessResults, athleteId],
  )

  const [answers, setAnswers] = useState<(number | undefined)[]>(
    () => quiz.questions.map(() => undefined),
  )
  const [submitted, setSubmitted] = useState<{ score: number; correct: number; total: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string>()

  const answeredCount = answers.filter((value) => value !== undefined).length
  const allAnswered = answeredCount === quiz.questions.length

  async function submit() {
    const result = scoreAwareness(answers, quiz)
    setSubmitted(result)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (isAthlete && athleteId) {
      setSaving(true)
      setSaveError(undefined)
      try {
        await submitAwarenessResult({
          athleteId,
          quizId: quiz.id,
          score: result.score,
          correct: result.correct,
          total: result.total,
          takenAt: new Date().toISOString(),
        })
      } catch (error: unknown) {
        setSaveError(error instanceof Error ? error.message : 'Could not save your result.')
      } finally {
        setSaving(false)
      }
    }
  }

  function retake() {
    setAnswers(quiz.questions.map(() => undefined))
    setSubmitted(null)
    setSaveError(undefined)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-chalk">
          Football <span className="text-fai">Awareness</span> Quiz
        </h1>
        <div className="mt-1 text-xs text-muted">
          {quiz.questions.length} questions on football knowledge. Your score becomes your awareness rating.
          {!isAthlete && ' You’re viewing this as a preview — results are only saved for approved athlete accounts.'}
        </div>
      </div>

      {submitted ? (
        <>
          <ScoreHero score={submitted.score} correct={submitted.correct} total={submitted.total} />
          {saving && <div className="text-center text-xs text-muted">Saving your score…</div>}
          {saveError && <div className="text-center text-xs text-down">{saveError}</div>}
          {!isAthlete && (
            <div className="rounded-xl border border-dashed border-line bg-panel-2/30 p-3 text-center text-xs text-muted">
              Preview mode — this score was not saved.
            </div>
          )}

          <Card className="p-5">
            <SectionTitle>Review</SectionTitle>
            <div className="space-y-3">
              {quiz.questions.map((question, index) => {
                const picked = answers[index]
                const correct = picked === question.answer
                return (
                  <div
                    key={question.id}
                    className={`rounded-xl border p-3 ${correct ? 'border-up/30 bg-up/5' : 'border-down/30 bg-down/5'}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`text-sm font-black ${correct ? 'text-up' : 'text-down'}`}>
                        {correct ? '✓' : '✕'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-chalk">{index + 1}. {question.prompt}</div>
                        <div className="mt-1 text-xs text-up">
                          Answer: {question.options[question.answer]}
                        </div>
                        {!correct && picked !== undefined && (
                          <div className="text-xs text-down">You picked: {question.options[picked]}</div>
                        )}
                        <div className="mt-1 text-xs leading-relaxed text-muted">{question.explanation}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <button
            type="button"
            onClick={retake}
            className="w-full rounded-lg border border-line px-5 py-3 text-sm font-bold text-chalk hover:border-fai/40"
          >
            Retake quiz
          </button>
        </>
      ) : (
        <>
          {previousBest && (
            <div className="flex items-center justify-between rounded-xl border border-line bg-panel-2/30 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Your last score</span>
              <span className="flex items-center gap-2">
                <Pill tone={LEVEL_TONE[awarenessLevel(previousBest.score)]}>
                  {awarenessLevel(previousBest.score)}
                </Pill>
                <span className="nums text-lg font-black text-chalk">{previousBest.score}</span>
              </span>
            </div>
          )}

          <div className="space-y-4">
            {quiz.questions.map((question, index) => (
              <Card key={question.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold text-chalk">
                    <span className="text-fai">{index + 1}.</span> {question.prompt}
                  </div>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted">
                    {question.topic}
                  </span>
                </div>
                <div className="mt-3 grid gap-2">
                  {question.options.map((option, optionIndex) => {
                    const selected = answers[index] === optionIndex
                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        data-testid={optionIndex === 0 ? 'quiz-first-option' : undefined}
                        onClick={() =>
                          setAnswers((prev) => {
                            const next = [...prev]
                            next[index] = optionIndex
                            return next
                          })
                        }
                        className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
                          selected
                            ? 'border-fai bg-fai/10 text-chalk'
                            : 'border-line bg-panel text-muted hover:border-fai/40 hover:text-chalk'
                        }`}
                      >
                        <span className={`mr-2 font-black ${selected ? 'text-fai' : 'text-muted'}`}>
                          {String.fromCharCode(65 + optionIndex)}
                        </span>
                        {option}
                      </button>
                    )
                  })}
                </div>
              </Card>
            ))}
          </div>

          <div className="sticky bottom-4 z-20">
            <button
              type="button"
              onClick={submit}
              disabled={!allAnswered}
              data-testid="quiz-submit"
              className="w-full rounded-xl bg-fai px-5 py-3 text-sm font-black text-ink shadow-lg disabled:opacity-40"
            >
              {allAnswered ? 'Submit Quiz' : `Answer all questions (${answeredCount}/${quiz.questions.length})`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
