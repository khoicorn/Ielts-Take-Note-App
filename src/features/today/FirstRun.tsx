import { MessageSquareQuote, Plus, RotateCcw } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import { useQuickAdd } from '@/app/overlays'
import { Quote } from '@/components/notes/Quote'
import { Button } from '@/components/ui/Button'
import { ICON_STROKE, QuillIcon, type IconType } from '@/components/ui/icons'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import { loadExampleData } from '@/lib/repo'

function Step(props: { icon: IconType; n: number; title: string; children: React.ReactNode }): React.JSX.Element {
  const { icon: Icon, n, title, children } = props
  return (
    <li className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-5 border-b border-line pt-[22px] pb-6 first:border-t">
      <span className="pt-[3px] text-indigo" aria-hidden="true">
        <Icon className="size-[22px]" strokeWidth={ICON_STROKE} />
      </span>
      <div className="min-w-0">
        <p className="text-note text-ink">
          <span className="mr-1 text-graphite tabular-nums">{n}.</span>
          {title}
        </p>
        {children}
      </div>
    </li>
  )
}

/** A thin-line star chart in the margin (mockup 12). Decorative: five stars, the brightest in antique gold. */
function StarChart(props: { className?: string }): React.JSX.Element {
  const line = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    vectorEffect: 'non-scaling-stroke' as const,
  }
  return (
    <svg viewBox="0 0 248 220" className={props.className} aria-hidden="true" focusable="false">
      <circle {...line} cx="132" cy="112" r="92" strokeDasharray="1 5" opacity={0.35} />
      <path {...line} d="M18 176C78 150 150 104 236 34" strokeDasharray="1 4" opacity={0.35} />
      <path {...line} d="M54 160L96 118L140 134L182 70M140 134L206 128" opacity={0.6} />
      <circle cx="54" cy="160" r="2" fill="currentColor" />
      <circle cx="96" cy="118" r="2.2" fill="currentColor" />
      <circle cx="140" cy="134" r="1.8" fill="currentColor" />
      <circle cx="206" cy="128" r="1.8" fill="currentColor" />
      <path
        className="text-gold"
        fill="currentColor"
        d="M182 60C182.9 66.6 185.4 69.1 192 70C185.4 70.9 182.9 73.4 182 80C181.1 73.4 178.6 70.9 172 70C178.6 69.1 181.1 66.6 182 60Z"
      />
      {[
        [70, 52, 1],
        [226, 182, 1],
        [120, 196, 0.9],
        [30, 96, 0.9],
        [218, 82, 0.9],
      ].map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="currentColor" opacity={0.35} />
      ))}
    </svg>
  )
}

/**
 * Today with an empty notebook (brief §44): the save → upgrade → review loop in three lines,
 * each with a real example, then one clear action.
 */
export function FirstRun(props: { title: string }): React.JSX.Element {
  const quickAdd = useQuickAdd()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const loadExamples = async () => {
    setLoading(true)
    try {
      await loadExampleData()
      toast.show('Example notes added. Remove them in Settings.')
    } catch {
      toast.show('Example notes could not be added. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader title={props.title} description="A private notebook for the corrections you get from a teacher or ChatGPT." />
      <div className="relative sm:mt-2">
        <ol aria-label="How it works" className="max-w-[460px]">
          <Step icon={MessageSquareQuote} n={1} title="Save what you said.">
            <p className="mt-1 text-body text-crimson">
              <VisuallyHidden>For example: </VisuallyHidden>
              <Quote text="We enjoyed the scenario." className="inline-block -indent-[0.36em]" />
            </p>
          </Step>
          <Step icon={QuillIcon} n={2} title="Save the better version.">
            <p className="mt-1 text-note text-upgrade">
              <VisuallyHidden>For example: </VisuallyHidden>
              <Quote text="The scenery was beautiful." className="inline-block -indent-[0.36em]" />
            </p>
          </Step>
          <Step icon={RotateCcw} n={3} title="Review it until it sticks.">
            <p className="mt-1 text-body text-graphite">You review it today, then tomorrow, in 3 days and in a week.</p>
          </Step>
        </ol>
        <StarChart className="absolute -top-3 right-0 hidden h-[220px] w-[248px] text-graphite xl:block" />
      </div>
      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Button variant="primary" size="lg" icon={Plus} kbd="N" onClick={() => quickAdd.open()}>
          Add first note
        </Button>
        <Button variant="ghost" size="lg" loading={loading} onClick={() => void loadExamples()}>
          Load example notes
        </Button>
      </div>
      <p className="mt-3 text-small text-graphite">
        Example notes show a Band 6.5 learner’s notebook. Remove them in Settings at any time.
      </p>
    </>
  )
}
