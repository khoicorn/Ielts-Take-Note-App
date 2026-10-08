import { X } from 'lucide-react'
import type React from 'react'
import { cn } from './cn'
import { ICON_STROKE } from './icons'

export type TagTone = 'neutral' | 'plum' | 'sage' | 'indigo' | 'gold'

/*
 * Small rounded tags are the one place rounded-full is allowed (brief §12).
 * Gold and sage are never text colors, so those tones tint the border and fill only.
 */
const TONE: Record<TagTone, string> = {
  neutral: 'border-line-strong text-graphite',
  plum: 'border-plum/30 bg-plum/[0.07] text-plum',
  sage: 'border-sage/40 bg-sage/10 text-upgrade',
  indigo: 'border-indigo/30 bg-indigo/[0.07] text-indigo',
  gold: 'border-gold/55 bg-gold/10 text-ink',
}

function textOf(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  return ''
}

export function Tag(props: {
  children: React.ReactNode
  tone?: TagTone
  onRemove?: () => void
  title?: string
  className?: string
}): React.JSX.Element {
  const { children, tone = 'neutral', onRemove, title, className } = props
  const name = title ?? textOf(children)
  return (
    <span
      title={title}
      className={cn(
        'inline-flex h-6 max-w-full items-center gap-1 rounded-full border px-2.5 text-meta leading-none whitespace-nowrap',
        TONE[tone],
        onRemove && 'pr-1',
        className,
      )}
    >
      <span className="truncate">{children}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={name ? `Remove ${name}` : 'Remove'}
          className={cn(
            'relative inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full opacity-70 hover:bg-ink/10 hover:opacity-100',
            // A 44 x 44px hit area on touch screens (16px button + 14px each side) without changing the look.
            'max-sm:after:absolute max-sm:after:-inset-[14px] max-sm:after:content-[""]',
          )}
        >
          <X className="size-3" strokeWidth={ICON_STROKE} aria-hidden="true" />
        </button>
      ) : null}
    </span>
  )
}
