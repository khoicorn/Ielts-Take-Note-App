import { ArrowLeft, ArrowRight, Check, Clock3, RotateCcw } from 'lucide-react'
import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { BRASS_BORDER, SMALL_CAPS } from '@/components/ui/candlelit'
import { cn } from '@/components/ui/cn'
import { Field, TextArea } from '@/components/ui/Field'
import { ICON_STROKE } from '@/components/ui/icons'
import { Section } from '@/components/ui/Section'
import { evaluateLexis } from './lexicalFeedback'
import { lessonForDay, taskLabel, WRITING_CURRICULUM } from './curriculum'

type Phase = 'teach' | 'test' | 'feedback'

interface SavedPlan {
  day: number
  phase: Phase
  answers: Record<string, string>
  completed: number[]
}

const STORAGE_KEY = 'ielts-upgrade-writing-course-v1'
const EMPTY_PLAN: SavedPlan = { day: 1, phase: 'teach', answers: {}, completed: [] }

function readPlan(): SavedPlan {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as Partial<SavedPlan>
    const day = typeof parsed.day === 'number' ? Math.max(1, Math.min(14, Math.round(parsed.day))) : 1
    const phase = parsed.phase === 'test' || parsed.phase === 'feedback' ? parsed.phase : 'teach'
    const answers = parsed.answers && typeof parsed.answers === 'object' ? parsed.answers : {}
    const completed = Array.isArray(parsed.completed)
      ? parsed.completed.filter((value): value is number => typeof value === 'number' && value >= 1 && value <= 14)
      : []
    return { day, phase, answers, completed }
  } catch {
    return EMPTY_PLAN
  }
}

function phaseNumber(phase: Phase): number {
  return phase === 'teach' ? 1 : phase === 'test' ? 2 : 3
}

function PhaseRail(props: { phase: Phase }): React.JSX.Element {
  const active = phaseNumber(props.phase)
  const labels = ['Teach', 'Test', 'Score & feedback']
  return (
    <ol aria-label="Session steps" className="mt-5 grid grid-cols-3 border-y border-line py-3">
      {labels.map((label, index) => {
        const step = index + 1
        const reached = step <= active
        return (
          <li key={label} className={cn('flex items-center gap-2 px-2 text-small first:pl-0 last:pr-0', reached ? 'text-ink' : 'text-graphite')}>
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex size-5 shrink-0 items-center justify-center rounded-full border text-meta tabular-nums',
                step === active ? 'border-brass bg-stone text-ink' : reached ? 'border-line-strong text-brass' : 'border-line text-graphite',
              )}
            >
              {step < active ? <Check className="size-3" strokeWidth={ICON_STROKE} /> : step}
            </span>
            <span>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

function DayPicker(props: { plan: SavedPlan; onChoose: (day: number) => void }): React.JSX.Element {
  const unlocked = Math.min(14, Math.max(1, props.plan.completed.length + 1))
  return (
    <div className="overflow-x-auto border-b border-line pb-3 [scrollbar-width:none]">
      <div className="flex min-w-max gap-1" role="group" aria-label="Fourteen-day writing plan">
        {WRITING_CURRICULUM.map((lesson) => {
          const complete = props.plan.completed.includes(lesson.day)
          const disabled = lesson.day > unlocked
          const selected = lesson.day === props.plan.day
          return (
            <button
              key={lesson.day}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`Day ${lesson.day}, ${taskLabel(lesson.task)}${complete ? ', complete' : disabled ? ', locked' : ''}`}
              onClick={() => props.onChoose(lesson.day)}
              className={cn(
                'inline-flex h-9 min-w-10 cursor-pointer items-center justify-center rounded-sm border px-2 text-small tabular-nums transition-colors duration-150 max-sm:h-11',
                selected
                  ? 'border-brass bg-stone text-ink'
                  : complete
                    ? 'border-line-strong text-brass hover:bg-stone/60'
                    : 'border-line text-graphite hover:text-ink',
                'disabled:cursor-not-allowed disabled:opacity-35',
              )}
            >
              {complete ? <Check className="mr-1 size-3.5" strokeWidth={ICON_STROKE} aria-hidden="true" /> : null}
              {lesson.day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function WritingStudyPlan(): React.JSX.Element {
  const [plan, setPlan] = useState<SavedPlan>(readPlan)
  const lesson = lessonForDay(plan.day)
  const answer = plan.answers[String(plan.day)] ?? ''
  const feedback = useMemo(() => evaluateLexis(answer, lesson), [answer, lesson])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan))
    } catch {
      // Private browsing can block storage; the lesson still works for the current visit.
    }
  }, [plan])

  const updateAnswer = (value: string) => setPlan((current) => ({ ...current, answers: { ...current.answers, [String(current.day)]: value } }))
  const chooseDay = (day: number) => setPlan((current) => ({ ...current, day, phase: current.completed.includes(day) ? 'feedback' : 'teach' }))
  const completeDay = () => {
    setPlan((current) => {
      const completed = [...new Set([...current.completed, current.day])].sort((a, b) => a - b)
      return current.day < 14 ? { ...current, completed, day: current.day + 1, phase: 'teach' } : { ...current, completed, phase: 'feedback' }
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="mt-7 animate-fade">
      <section className={cn('rounded-md border bg-paper/45 p-5 sm:p-6', BRASS_BORDER)} aria-labelledby="study-plan-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={SMALL_CAPS}>14-day lexical resource plan</p>
            <h2 id="study-plan-title" className="mt-1 font-serif text-section font-normal text-ink">
              One hour a day · Task 1, then Task 2
            </h2>
            <p className="mt-2 max-w-[68ch] text-body text-graphite">
              Week 1 develops Academic Task 1 phrasing. Week 2 transfers the same precision to Task 2 arguments.
              Each session follows Teach → Test → Score & feedback.
            </p>
          </div>
          <div className="flex items-center gap-2 text-small text-graphite">
            <Clock3 className="size-4 text-brass" strokeWidth={ICON_STROKE} aria-hidden="true" />
            15 min teach · 25 min write · 20 min review
          </div>
        </div>
        <div className="mt-5">
          <DayPicker plan={plan} onChoose={chooseDay} />
        </div>
      </section>

      <article className="mt-8" aria-labelledby="lesson-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={SMALL_CAPS}>Day {lesson.day} · {taskLabel(lesson.task)} · 60 minutes</p>
            <h2 id="lesson-title" className="mt-1 font-serif text-title font-normal tracking-[-0.01em] text-ink">
              {lesson.title}
            </h2>
            <p className="mt-2 max-w-[68ch] text-body-lg text-graphite">{lesson.focus}</p>
          </div>
          <p className="text-small text-graphite tabular-nums">{plan.completed.length} of 14 complete</p>
        </div>
        <PhaseRail phase={plan.phase} />

        {plan.phase === 'teach' ? (
          <div className="mt-8">
            <Section title="1. Teach" mark id="teach">
              <ul className="mt-5 grid gap-3 text-body-lg text-ink">
                {lesson.principles.map((principle) => (
                  <li key={principle} className="flex gap-3">
                    <span aria-hidden="true" className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-brass" />
                    <span>{principle}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7 overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-left text-body">
                  <thead>
                    <tr className="border-b border-line-strong text-small text-graphite">
                      <th scope="col" className="w-[27%] px-3 py-2 font-medium">Clumsy / Band 6</th>
                      <th scope="col" className="w-[31%] px-3 py-2 font-medium">Natural / Band 7+</th>
                      <th scope="col" className="px-3 py-2 font-medium">Why it is better</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lesson.contrasts.map((contrast) => (
                      <tr key={contrast.clumsy} className="border-b border-line align-top last:border-0">
                        <td className="px-3 py-4 text-crimson">“{contrast.clumsy}”</td>
                        <td className="px-3 py-4 font-medium text-upgrade">“{contrast.natural}”</td>
                        <td className="px-3 py-4 text-graphite">{contrast.why}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-7 flex justify-end">
                <Button variant="primary" iconRight={ArrowRight} onClick={() => setPlan((current) => ({ ...current, phase: 'test' }))}>
                  Start targeted exercise
                </Button>
              </div>
            </Section>
          </div>
        ) : null}

        {plan.phase === 'test' ? (
          <div className="mt-8">
            <Section title="2. Test" mark id="test">
              <div className="mt-5 rounded-sm border border-line bg-stone/45 p-4 sm:p-5">
                <p className="text-body-lg font-medium text-ink">{lesson.prompt}</p>
                <p className="mt-2 text-body text-graphite">{lesson.directions}</p>
                <p className="mt-3 text-small text-graphite">Target length: {lesson.minWords}–{lesson.maxWords} words</p>
              </div>
              <Field
                label="Your answer"
                htmlFor="study-answer"
                hint="Your draft is saved in this browser. Submit only when you are ready to see feedback."
                className="mt-6"
              >
                <TextArea
                  id="study-answer"
                  value={answer}
                  onValueChange={updateAnswer}
                  minRows={9}
                  placeholder="Write your response here…"
                />
              </Field>
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className={cn('text-small tabular-nums', feedback.inRange ? 'text-upgrade' : 'text-graphite')}>
                  {feedback.wordCount} words
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" icon={ArrowLeft} onClick={() => setPlan((current) => ({ ...current, phase: 'teach' }))}>
                    Review lesson
                  </Button>
                  <Button
                    variant="primary"
                    iconRight={ArrowRight}
                    disabled={feedback.wordCount < 25}
                    onClick={() => setPlan((current) => ({ ...current, phase: 'feedback' }))}
                  >
                    Submit for feedback
                  </Button>
                </div>
              </div>
            </Section>
          </div>
        ) : null}

        {plan.phase === 'feedback' ? (
          <div className="mt-8">
            <Section title="3. Score & feedback" mark id="feedback">
              <div className="mt-5 grid gap-5 sm:grid-cols-[170px_1fr]">
                <div className={cn('rounded-md border bg-paper p-5 text-center', BRASS_BORDER)}>
                  <p className={SMALL_CAPS}>Lexical estimate</p>
                  <p className="mt-2 font-serif text-numeral text-brass tabular-nums">{feedback.band.toFixed(1)}</p>
                  <p className="mt-2 text-meta text-graphite">Practice estimate, not an official IELTS score</p>
                </div>
                <div>
                  <p className="text-body-lg text-ink">{feedback.summary}</p>
                  <dl className="mt-4 grid gap-3 text-body sm:grid-cols-2">
                    <div className="rounded-sm border border-line p-3">
                      <dt className="text-small text-graphite">Target phrases used</dt>
                      <dd className="mt-1 text-upgrade">{feedback.usedTargets.length ? feedback.usedTargets.join(' · ') : 'None yet'}</dd>
                    </div>
                    <div className="rounded-sm border border-line p-3">
                      <dt className="text-small text-graphite">Next lexical targets</dt>
                      <dd className="mt-1 text-ink">{feedback.missingTargets.length ? feedback.missingTargets.join(' · ') : 'All targets met'}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="mt-9">
                <h3 className="font-serif text-section font-normal text-ink">Line-by-line feedback</h3>
                <div className="mt-4 grid gap-4">
                  {feedback.sentences.map((item, index) => (
                    <div key={`${index}-${item.sentence}`} className="border-l-2 border-line-strong pl-4">
                      <p className="text-small text-graphite">Sentence {index + 1}</p>
                      <p className="mt-1 text-body text-ink">“{item.sentence}”</p>
                      {item.issues.length ? (
                        <div className="mt-3 grid gap-2">
                          <p className="text-body text-upgrade"><span className="font-medium">Band 7+ rewrite:</span> “{item.upgraded}”</p>
                          {item.issues.map((issue) => (
                            <p key={`${issue.original}-${issue.why}`} className="text-small text-graphite">
                              Replace <span className="text-crimson">“{issue.original}”</span> with <span className="text-upgrade">“{issue.replacement}”</span>. {issue.why}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-small text-graphite">No clumsy target pattern was flagged. Check the sentence once more for accuracy and repetition.</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-9 rounded-sm border border-line bg-stone/40 p-4 sm:p-5">
                <h3 className="font-serif text-section font-normal text-ink">Band 7+ model</h3>
                <p className="mt-3 font-serif text-note text-ink">“{lesson.model}”</p>
                <p className="mt-3 text-small text-graphite">Compare phrase choices and organisation. Do not memorise the paragraph as a script.</p>
              </div>

              <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-line pt-5">
                <Button variant="ghost" icon={RotateCcw} onClick={() => setPlan((current) => ({ ...current, phase: 'test' }))}>
                  Revise answer
                </Button>
                <Button variant="primary" iconRight={lesson.day < 14 ? ArrowRight : Check} onClick={completeDay}>
                  {lesson.day < 14 ? `Complete day ${lesson.day}` : 'Complete the plan'}
                </Button>
              </div>
            </Section>
          </div>
        ) : null}
      </article>
    </div>
  )
}
