import { MessageCircle, PenLine } from 'lucide-react'
import type React from 'react'
import { MODE_LABELS } from '@/lib/taxonomy'
import type { Mode } from '@/lib/types'
import { cn } from '@/components/ui/cn'
import { ICON_STROKE } from '@/components/ui/icons'

/** Speaking (plum speech mark) or Writing (sage pen) with its label. The glyph carries the accent; the word stays graphite. */
export function ModeMark(props: { mode: Mode; showLabel?: boolean; className?: string }): React.JSX.Element {
  const { mode, showLabel = true, className } = props
  const Icon = mode === 'speaking' ? MessageCircle : PenLine
  const label = MODE_LABELS[mode]
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-small whitespace-nowrap text-graphite', className)}
      role={showLabel ? undefined : 'img'}
      aria-label={showLabel ? undefined : label}
    >
      <Icon
        className={cn('size-3.5 shrink-0', mode === 'speaking' ? 'text-plum' : 'text-sage')}
        strokeWidth={ICON_STROKE}
        aria-hidden="true"
      />
      {showLabel ? <span>{label}</span> : null}
    </span>
  )
}
