/**
 * Small (32px) toolbar controls for list screens: the "Filter this list" field and the Sort select.
 * Field.tsx only has 40px controls; these keep the same look at the mockup's toolbar size.
 * Under 640px they grow to 44px with 16px text (touch targets, no zoom on focus in mobile Safari).
 */
import { ChevronDown, Search } from 'lucide-react'
import type React from 'react'
import { cn } from '@/components/ui/cn'
import { ICON_STROKE } from '@/components/ui/icons'

const SMALL_CONTROL = cn(
  'h-8 rounded-sm border border-line-strong bg-paper text-small max-sm:h-11 max-sm:text-body-lg',
  'placeholder:text-graphite transition-[border-color] duration-150',
  'hover:border-ink/30 focus-visible:border-focus focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-focus',
)

export function ListFilterInput(props: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}): React.JSX.Element {
  const { value, onChange, placeholder = 'Filter this list', className } = props
  return (
    <div className={cn('relative min-w-0', className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-graphite"
        strokeWidth={ICON_STROKE}
        aria-hidden="true"
      />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.preventDefault()
            e.stopPropagation()
            onChange('')
          }
        }}
        className={cn(SMALL_CONTROL, 'w-full pr-3 pl-8 text-ink')}
      />
    </div>
  )
}

export function SmallSelect<T extends string>(props: {
  label: string
  value: T
  onChange: (v: T) => void
  options: readonly { value: T; label: string }[]
  /** Take the free width of a flex row (mobile toolbar). */
  fill?: boolean
  className?: string
}): React.JSX.Element {
  const { label, value, onChange, options, fill, className } = props
  return (
    <label className={cn('relative inline-flex items-center', fill ? 'min-w-0 flex-1' : 'shrink-0', className)}>
      <span className="pointer-events-none absolute left-2.5 text-small text-graphite max-sm:text-body">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(SMALL_CONTROL, 'cursor-pointer appearance-none truncate pr-8 pl-11 text-ink max-sm:pl-12', fill && 'w-full')}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 size-3.5 text-graphite"
        strokeWidth={ICON_STROKE}
        aria-hidden="true"
      />
    </label>
  )
}

/** A full-width 32px select for the filter panel (mockup 14b). The placeholder option reads in graphite. */
export function PanelSelect(props: {
  id?: string
  value: string
  onChange: (v: string) => void
  options: readonly { value: string; label: string }[]
  placeholder: string
}): React.JSX.Element {
  const { id, value, onChange, options, placeholder } = props
  return (
    <span className="relative flex min-w-0">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(SMALL_CONTROL, 'w-full cursor-pointer appearance-none truncate pr-8 pl-2.5', value === '' ? 'text-graphite' : 'text-ink')}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-ink">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-graphite"
        strokeWidth={ICON_STROKE}
        aria-hidden="true"
      />
    </span>
  )
}

/** A 32px date field for the filter panel. */
export function PanelDate(props: React.InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  const { className, ...rest } = props
  return <input type="date" className={cn(SMALL_CONTROL, 'w-full min-w-0 px-2.5 text-ink', className)} {...rest} />
}
