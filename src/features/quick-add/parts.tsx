import { CircleAlert, ClipboardPaste } from 'lucide-react'
import React from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import { TextArea, type TextAreaProps } from '@/components/ui/Field'
import { ICON_STROKE, SparkIcon } from '@/components/ui/icons'

/**
 * The upgrade field: the one that matters most, so it is the strongest on the form (brief §18, plan C1).
 * Ink label with a tiny gold ✦ (refinement v1.1 #3), larger text in deep sage (refinement v1.1 #4).
 */
export const UpgradeField = React.forwardRef<
  HTMLTextAreaElement,
  { id: string; label: string; error?: string } & Omit<TextAreaProps, 'id'>
>(function UpgradeField(props, ref) {
  const { id, label, error, className, ...rest } = props
  const errorId = `${id}-error`
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-small font-medium text-ink">
        <SparkIcon className="size-2.5 shrink-0 fill-current stroke-none text-gold" aria-hidden="true" />
        <span>{label}</span>
      </label>
      <TextArea
        ref={ref}
        id={id}
        aria-required="true"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn('min-h-20 px-3.5 py-2.5 text-note text-upgrade max-sm:text-note', className)}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="flex items-center gap-1.5 text-small text-crimson">
          <CircleAlert className="size-3.5 shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  )
})

/** The quiet offer after a labelled correction is pasted (mockup m01). Undo lives in the toast after Fill. */
export function PasteBar(props: {
  count: number
  labels: string[]
  onFill: () => void
  onKeep: () => void
}): React.JSX.Element {
  return (
    <div
      role="status"
      className="flex flex-col gap-1.5 rounded-md border border-indigo/20 bg-indigo/[0.05] py-3 pr-3 pl-3.5 sm:flex-row sm:items-center sm:gap-4"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <ClipboardPaste className="mt-0.5 size-4 shrink-0 text-indigo" strokeWidth={ICON_STROKE} aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-small text-ink">{`This looks like a correction. Fill ${props.count} fields from it?`}</p>
          <p className="mt-0.5 text-meta text-graphite">{props.labels.join(', ')}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 max-sm:ml-6.5">
        <Button size="sm" variant="secondary" onClick={props.onFill}>
          Fill fields
        </Button>
        <Button size="sm" variant="ghost" onClick={props.onKeep}>
          Keep as pasted
        </Button>
      </div>
    </div>
  )
}

/** "Draft restored · Discard" above the fields when an unsent note comes back. */
export function DraftLine(props: { onDiscard: () => void }): React.JSX.Element {
  return (
    <p className="flex items-center gap-2 text-small text-graphite">
      <span>Draft restored</span>
      <span aria-hidden="true">·</span>
      <button
        type="button"
        onClick={props.onDiscard}
        className="-mx-1 inline-flex cursor-pointer items-center rounded-xs px-1 text-small text-indigo underline decoration-indigo/35 underline-offset-3 hover:decoration-indigo max-sm:min-h-11"
      >
        Discard
      </button>
    </p>
  )
}
