import type React from 'react'
import { cn } from '@/components/ui/cn'

/**
 * One setting: a plain title and a short graphite description, with its control.
 * side: the control sits on the right from 640px up (stacked below on phones).
 * stacked: the control always sits below the text (button rows, radio lists).
 * Rows are separated by hairlines; wrap them in <SettingRows> so the last one has none.
 */
export function SettingRow(props: {
  title: string
  description?: React.ReactNode
  /** Makes the title a <label> for this control id. */
  htmlFor?: string
  titleId?: string
  layout?: 'side' | 'stacked'
  children?: React.ReactNode
}): React.JSX.Element {
  const { title, description, htmlFor, titleId, layout = 'side', children } = props
  const side = layout === 'side'
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-line py-5 last:border-b-0',
        side && 'sm:flex-row sm:items-center sm:justify-between sm:gap-10',
      )}
    >
      <div className="min-w-0 sm:max-w-[52ch]">
        {htmlFor ? (
          <label htmlFor={htmlFor} id={titleId} className="block text-body text-ink">
            {title}
          </label>
        ) : (
          <p id={titleId} className="text-body text-ink">
            {title}
          </p>
        )}
        {description ? <div className="mt-0.5 text-small text-graphite">{description}</div> : null}
      </div>
      {children ? <div className={cn('min-w-0', side && 'sm:shrink-0')}>{children}</div> : null}
    </div>
  )
}

export function SettingRows(props: { children: React.ReactNode; className?: string }): React.JSX.Element {
  return <div className={props.className}>{props.children}</div>
}
