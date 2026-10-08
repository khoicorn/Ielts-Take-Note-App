import { Check, ChevronDown, CircleAlert } from 'lucide-react'
import React, {
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { htmlToMarkdown } from '@/lib/text'
import { cn } from './cn'
import { ICON_STROKE } from './icons'

/**
 * Shared look for text controls: paper surface, warm hairline border, small radius.
 * Focus: the border and a 1px outline take the focus color (a crisp 2px edge, no glow): ink-indigo by day,
 * amber by night (design v1.2 rule 10).
 * Under 640px the text is 16px so mobile Safari does not zoom on focus.
 */
const controlBase = cn(
  'w-full rounded-sm border border-line-strong bg-paper text-body max-sm:text-body-lg',
  'placeholder:text-graphite transition-[border-color,background-color] duration-150',
  'hover:border-ink/30 focus-visible:border-focus focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-focus',
  'aria-invalid:border-crimson/70 disabled:cursor-not-allowed disabled:opacity-50',
)

/** controlBase plus ink text. Select sets its own text color, because cn() does not resolve two text-* colors. */
export const controlClass = cn(controlBase, 'text-ink')

/* ---------- Field ---------- */

export function Field(props: {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  optional?: boolean
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  const { label, htmlFor, hint, error, optional, children, className } = props
  const hintId = hint ? `${htmlFor}-hint` : undefined
  const errorId = error ? `${htmlFor}-error` : undefined
  let child = children
  if (isValidElement(children)) {
    const own = (children.props as Record<string, unknown>)['aria-describedby'] as string | undefined
    const describedBy = [own, hintId, errorId].filter(Boolean).join(' ') || undefined
    child = cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      'aria-describedby': describedBy,
      'aria-invalid': error ? true : (children.props as Record<string, unknown>)['aria-invalid'],
    })
  }
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="flex items-baseline gap-2 text-small text-graphite">
        <span>{label}</span>
        {optional ? <span className="text-meta text-graphite">optional</span> : null}
      </label>
      {child}
      {hint ? (
        <p id={hintId} className="text-meta text-graphite">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-center gap-1.5 text-small text-crimson">
          <CircleAlert className="size-3.5 shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  )
}

/* ---------- TextInput ---------- */

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput(props, ref) {
    const { className, type = 'text', ...rest } = props
    return <input ref={ref} type={type} className={cn(controlClass, 'h-10 px-3 max-sm:h-11', className)} {...rest} />
  },
)

/* ---------- TextArea ---------- */

export interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  value: string
  onValueChange: (v: string) => void
  /** Default 2; the field grows with its content. */
  minRows?: number
  /** Default true: HTML from the clipboard (ChatGPT) becomes the Markdown subset, inserted at the cursor. */
  richPaste?: boolean
  /** Called on every paste with the inserted text. Quick Add uses it for smart split. */
  onPasteText?: (pastedPlainText: string) => void
  /** bare: no border or padding, for the focus-mode paragraph editor. */
  variant?: 'field' | 'bare'
}

/** Inserts text at the selection. Uses the browser's editing command when it can, so Ctrl+Z works. */
function insertText(
  el: HTMLTextAreaElement,
  text: string,
  value: string,
  onValueChange: (v: string) => void,
  pending: React.MutableRefObject<[number, number] | null>,
  selectAfter?: [number, number],
): void {
  const start = el.selectionStart ?? value.length
  const end = el.selectionEnd ?? value.length
  let ok = false
  try {
    ok = typeof document.execCommand === 'function' && document.execCommand('insertText', false, text)
  } catch {
    ok = false
  }
  if (ok && el.value === value.slice(0, start) + text + value.slice(end)) {
    if (selectAfter) el.setSelectionRange(selectAfter[0], selectAfter[1])
    return
  }
  const next = value.slice(0, start) + text + value.slice(end)
  pending.current = selectAfter ?? [start + text.length, start + text.length]
  el.value = next
  el.setSelectionRange(pending.current[0], pending.current[1])
  onValueChange(next)
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(props, ref) {
  const {
    value,
    onValueChange,
    minRows = 2,
    richPaste = true,
    onPasteText,
    variant = 'field',
    className,
    onKeyDown,
    onPaste,
    ...rest
  } = props
  const innerRef = useRef<HTMLTextAreaElement>(null)
  const pending = useRef<[number, number] | null>(null)
  useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement)

  const grow = useCallback(() => {
    const el = innerRef.current
    if (!el) return
    el.style.height = 'auto'
    const h = el.scrollHeight
    if (h > 0) {
      const border = el.offsetHeight - el.clientHeight
      el.style.height = `${h + Math.max(0, border)}px`
    } else {
      el.style.height = ''
    }
  }, [])

  useLayoutEffect(() => {
    grow()
    const el = innerRef.current
    if (el && pending.current && document.activeElement === el) {
      el.setSelectionRange(pending.current[0], pending.current[1])
    }
    pending.current = null
  }, [value, grow])

  useEffect(() => {
    window.addEventListener('resize', grow)
    return () => window.removeEventListener('resize', grow)
  }, [grow])

  /** Wraps the selection in a marker, or removes the marker when it is already there. */
  const toggleMarker = (el: HTMLTextAreaElement, marker: string) => {
    const s = el.selectionStart ?? 0
    const e = el.selectionEnd ?? 0
    const selected = value.slice(s, e)
    const m = marker.length
    const before = value.slice(Math.max(0, s - m), s)
    const after = value.slice(e, e + m)
    const isItalic = marker === '*'
    // For italic, "**" around the selection is bold, not italic.
    const wrapped =
      before === marker &&
      after === marker &&
      (!isItalic || (value[s - 2] !== '*' && value[e + 1] !== '*'))
    if (wrapped) {
      el.setSelectionRange(s - m, e + m)
      insertText(el, selected, value, onValueChange, pending, [s - m, e - m])
      return
    }
    if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= m * 2) {
      const inner = selected.slice(m, selected.length - m)
      insertText(el, inner, value, onValueChange, pending, [s, s + inner.length])
      return
    }
    insertText(el, `${marker}${selected}${marker}`, value, onValueChange, pending, [s + m, e + m])
  }

  return (
    <textarea
      ref={innerRef}
      rows={minRows}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (e.defaultPrevented) return
        const mod = e.ctrlKey || e.metaKey
        if (!mod || e.altKey || e.shiftKey) return
        const k = e.key.toLowerCase()
        if (k === 'b' || k === 'i') {
          e.preventDefault()
          toggleMarker(e.currentTarget, k === 'b' ? '**' : '*')
        }
      }}
      onPaste={(e) => {
        onPaste?.(e)
        if (e.defaultPrevented) return
        const cd = e.clipboardData
        const html = richPaste && cd ? cd.getData('text/html') : ''
        if (html && html.trim()) {
          const md = htmlToMarkdown(html)
          if (md) {
            e.preventDefault()
            insertText(e.currentTarget, md, value, onValueChange, pending)
            onPasteText?.(md)
            return
          }
        }
        const plain = cd ? cd.getData('text/plain') : ''
        if (plain) onPasteText?.(plain)
      }}
      className={cn(
        variant === 'field'
          ? cn(controlClass, 'block resize-none px-3 py-2 leading-[1.6]')
          : 'block w-full resize-none border-0 bg-transparent p-0 text-ink placeholder:text-graphite focus-visible:outline-none',
        className,
      )}
      {...rest}
    />
  )
})

/* ---------- Select ---------- */

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & {
    options: readonly (string | { value: string; label: string })[]
    placeholder?: string
  },
): React.JSX.Element {
  const { options, placeholder, className, value, onChange, ...rest } = props
  // Uncontrolled selects (defaultValue) keep their own value here, so the text color can follow it.
  const [ownValue, setOwnValue] = useState(() => String(rest.defaultValue ?? ''))
  const current = value !== undefined ? String(value) : ownValue
  // The placeholder option ("None") reads as a hint, in graphite. A chosen value is ink.
  const showsPlaceholder = placeholder !== undefined && current === ''
  return (
    <div className={cn('relative min-w-0', className)}>
      <select
        value={value}
        onChange={(e) => {
          if (value === undefined) setOwnValue(e.target.value)
          onChange?.(e)
        }}
        className={cn(
          controlBase,
          'h-10 cursor-pointer appearance-none truncate pr-9 pl-3 max-sm:h-11',
          showsPlaceholder ? 'text-graphite' : 'text-ink',
        )}
        {...rest}
      >
        {placeholder !== undefined ? (
          <option value="" className="text-graphite">
            {placeholder}
          </option>
        ) : null}
        {options.map((o) =>
          typeof o === 'string' ? (
            <option key={o} value={o} className="text-ink">
              {o}
            </option>
          ) : (
            <option key={o.value} value={o.value} className="text-ink">
              {o.label}
            </option>
          ),
        )}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-graphite"
        strokeWidth={ICON_STROKE}
        aria-hidden="true"
      />
    </div>
  )
}

/* ---------- Checkbox ---------- */

export function Checkbox(props: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }): React.JSX.Element {
  const auto = useId()
  const id = props.id ?? auto
  return (
    <label htmlFor={id} className="inline-flex min-h-8 cursor-pointer items-center gap-2.5 text-body text-ink select-none max-sm:min-h-11">
      <span className="relative inline-flex size-4 shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={props.checked}
          onChange={(e) => props.onChange(e.target.checked)}
          className={cn(
            'peer size-4 cursor-pointer appearance-none rounded-xs border border-line-strong bg-paper transition-colors duration-150',
            // Filled controls use indigo-fill (design v1.2). By night the deep fill gets a gilt edge so it reads as on.
            'checked:border-indigo-fill checked:bg-indigo-fill hover:border-ink/40 dark:checked:border-gold/75',
          )}
        />
        <Check
          className="pointer-events-none absolute inset-0 m-auto size-3 text-on-accent opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
          strokeWidth={2}
          aria-hidden="true"
        />
      </span>
      <span>{props.label}</span>
    </label>
  )
}

/* ---------- Switch ---------- */

export function Switch(props: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }): React.JSX.Element {
  const auto = useId()
  const id = props.id ?? auto
  const labelId = `${id}-label`
  const { checked } = props
  // The whole row is a <label> for the button, so a tap anywhere in its 44px height toggles the switch.
  return (
    <label htmlFor={id} className="inline-flex min-h-8 cursor-pointer items-center gap-3 select-none max-sm:min-h-11">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        onClick={() => props.onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-sm border transition-colors duration-180',
          checked ? 'border-indigo-fill bg-indigo-fill dark:border-gold/75' : 'border-line-strong bg-stone',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'block size-3.5 rounded-xs transition-transform duration-180 ease-quiet',
            checked ? 'translate-x-[17px] bg-on-accent' : 'translate-x-[2px] bg-graphite',
          )}
        />
      </button>
      <span id={labelId} className="text-body text-ink">
        {props.label}
      </span>
    </label>
  )
}
