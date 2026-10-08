import type React from 'react'
import { cn } from './cn'

type Decoration = 'quill' | 'constellation' | 'moon' | 'book'

/* Thin-line drawings (1px, graphite) with one small gold spark. No illustrations. */

const LINE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  vectorEffect: 'non-scaling-stroke' as const,
}

function Spark(props: { x: number; y: number; r: number }) {
  const { x, y, r } = props
  const k = r * 0.18
  const d = `M${x} ${y - r}C${x + k} ${y - k} ${x + k} ${y - k} ${x + r} ${y}C${x + k} ${y + k} ${x + k} ${y + k} ${x} ${y + r}C${x - k} ${y + k} ${x - k} ${y + k} ${x - r} ${y}C${x - k} ${y - k} ${x - k} ${y - k} ${x} ${y - r}Z`
  return <path d={d} className="text-gold" fill="currentColor" />
}

function Drawing(props: { kind: Decoration }): React.JSX.Element {
  switch (props.kind) {
    case 'quill':
      return (
        <>
          <path {...LINE} d="M51 8C35 10 23 22 19 40C35 37 47 26 51 8Z" />
          <path {...LINE} d="M12 53L39 26" />
          <path {...LINE} d="M24.5 36.5L32 35.6M29.5 31.4L37 30.6M34.5 26.2L41.6 25.4" opacity={0.6} />
          <path {...LINE} d="M7 57H31" opacity={0.5} strokeDasharray="1 3" />
          <Spark x={50} y={47} r={3.6} />
        </>
      )
    case 'constellation':
      return (
        <>
          <path {...LINE} d="M9 45L21 30L34 37L46 16M34 37L54 33" opacity={0.75} />
          {[
            [9, 45],
            [21, 30],
            [34, 37],
            [54, 33],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.6} fill="currentColor" />
          ))}
          <Spark x={46} y={16} r={4.2} />
          <circle cx={15} cy={14} r={0.8} fill="currentColor" opacity={0.5} />
          <circle cx={57} cy={50} r={0.8} fill="currentColor" opacity={0.5} />
        </>
      )
    case 'moon':
      return (
        <>
          <path {...LINE} d="M37 13.5A18.5 18.5 0 1 0 50.5 39.5A15 15 0 0 1 37 13.5Z" />
          <Spark x={49} y={16} r={3.8} />
          <circle cx={56} cy={27} r={0.9} fill="currentColor" opacity={0.55} />
          <circle cx={42} cy={7} r={0.8} fill="currentColor" opacity={0.45} />
        </>
      )
    case 'book':
      return (
        <>
          <path {...LINE} d="M32 22C26 18 17 17 9 19V48C17 46 26 47 32 51C38 47 47 46 55 48V19C47 17 38 18 32 22Z" />
          <path {...LINE} d="M32 22V51" />
          <path {...LINE} d="M14 26H26M14 31H26M14 36H23M38 26H50M38 31H50M38 36H47" opacity={0.5} />
          <Spark x={32} y={10} r={3.6} />
        </>
      )
  }
}

/**
 * Intentional empty screens (brief §35): a thin-line drawing, a serif title, one calm sentence, one action.
 */
export function EmptyState(props: {
  title: string
  body: string
  action?: React.ReactNode
  decoration?: Decoration
  className?: string
  /** 1 when the empty state is the whole page and nothing else gives it an h1 (404). Default 2. */
  headingLevel?: 1 | 2
}): React.JSX.Element {
  const { title, body, action, decoration, className, headingLevel = 2 } = props
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <div className={cn('mx-auto flex max-w-[420px] flex-col items-center px-4 py-12 text-center sm:py-16', className)}>
      {decoration ? (
        <svg
          viewBox="0 0 64 64"
          className="mb-6 size-16 text-graphite"
          aria-hidden="true"
          focusable="false"
        >
          <Drawing kind={decoration} />
        </svg>
      ) : null}
      <Heading className="font-serif text-section font-normal text-ink">{title}</Heading>
      <p className="mt-2 text-body text-graphite">{body}</p>
      {action ? <div className="mt-7 flex flex-wrap items-center justify-center gap-3">{action}</div> : null}
    </div>
  )
}
