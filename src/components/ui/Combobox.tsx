import { Check, ChevronDown, Plus } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { normalizeText } from '@/lib/text'
import { cn } from './cn'
import { controlClass } from './Field'
import { useFloatingPosition } from './floating'
import { ICON_STROKE } from './icons'

interface Item {
  kind: 'option' | 'create'
  value: string
  label: string
}

/**
 * Type to filter, ↑↓ to move, Enter to choose, Esc to close (ARIA combobox pattern).
 * With allowCreate, a last option "Use “X”" accepts free text, and leaving the field keeps what was typed.
 */
export function Combobox(props: {
  id: string
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  placeholder?: string
  allowCreate?: boolean
  'aria-label'?: string
  autoFocus?: boolean
  /** Passed through by Field for hints and errors. */
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  className?: string
}): React.JSX.Element {
  const { id, value, onChange, options, placeholder, allowCreate = false, autoFocus, className } = props
  const listId = `${id}-listbox`
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [input, setInput] = useState(value)
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState(false)
  const [active, setActive] = useState(-1)
  const pos = useFloatingPosition(wrapRef, open, { preferredHeight: 264, layer: listRef })

  useEffect(() => {
    if (!open) setInput(value)
  }, [value, open])

  const query = typed ? input.trim() : ''
  // Matching options (prefix matches first, then the rest, each in the given order), then "Use “X”".
  const ordered = useMemo<Item[]>(() => {
    const q = normalizeText(query)
    const toItem = (o: string): Item => ({ kind: 'option', value: o, label: o })
    if (!q) return options.map(toItem)
    const matching = options.filter((o) => normalizeText(o).includes(q))
    const prefix = matching.filter((o) => normalizeText(o).startsWith(q))
    const rest = matching.filter((o) => !normalizeText(o).startsWith(q))
    const out = [...prefix, ...rest].map(toItem)
    const exact = options.some((o) => normalizeText(o) === q)
    if (allowCreate && !exact) out.push({ kind: 'create', value: query, label: `Use “${query}”` })
    return out
  }, [options, query, allowCreate])

  const optionId = (i: number) => `${id}-opt-${i}`

  const openList = (fromTyping: boolean) => {
    setOpen(true)
    setTyped(fromTyping)
    if (!fromTyping) {
      const idx = options.indexOf(value)
      setActive(idx >= 0 ? idx : 0)
    }
  }

  const close = (revert: boolean) => {
    setOpen(false)
    setTyped(false)
    setActive(-1)
    if (revert) setInput(value)
  }

  const choose = (item: Item) => {
    onChange(item.value)
    setInput(item.value)
    close(false)
  }

  const commitTyped = () => {
    if (!typed) return
    const t = input.trim()
    const match = options.find((o) => normalizeText(o) === normalizeText(t))
    if (match !== undefined) {
      if (match !== value) onChange(match)
      setInput(match)
    } else if (allowCreate) {
      if (t !== value) onChange(t)
      setInput(t)
    } else {
      setInput(value)
    }
  }

  // Scroll the active option into view.
  useEffect(() => {
    if (!open || active < 0) return
    const el = document.getElementById(optionId(active))
    el?.scrollIntoView?.({ block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const n = ordered.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) openList(false)
      else if (n) setActive((a) => (a + 1) % n)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) openList(false)
      else if (n) setActive((a) => (a <= 0 ? n - 1 : a - 1))
    } else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      if (open) {
        e.preventDefault()
        if (active >= 0 && active < n) choose(ordered[active])
        else {
          commitTyped()
          close(false)
        }
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault()
        e.stopPropagation()
        close(true)
      }
    } else if (e.key === 'Home' && open) {
      setActive(0)
    } else if (e.key === 'End' && open) {
      setActive(n - 1)
    }
  }

  return (
    <div ref={wrapRef} className={cn('relative min-w-0', className)}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-label={props['aria-label']}
        aria-describedby={props['aria-describedby']}
        aria-invalid={props['aria-invalid']}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 && active < ordered.length ? optionId(active) : undefined}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={input}
        onChange={(e) => {
          setInput(e.target.value)
          setTyped(true)
          setOpen(true)
          setActive(0)
        }}
        onFocus={(e) => {
          // Typing replaces the current topic instead of adding to it.
          e.currentTarget.select()
        }}
        onClick={(e) => {
          if (open) return
          // The click that opens the list selects the value, so typing starts a new search.
          e.currentTarget.select()
          openList(false)
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          commitTyped()
          close(false)
        }}
        className={cn(controlClass, 'h-10 pr-9 pl-3 max-sm:h-11')}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          inputRef.current?.focus()
          if (open) close(true)
          else openList(false)
        }}
        className="absolute inset-y-0 right-0 flex w-9 cursor-pointer items-center justify-center text-graphite hover:text-ink"
      >
        <ChevronDown className={cn('size-4 transition-transform duration-180', open && 'rotate-180')} strokeWidth={ICON_STROKE} />
      </button>
      {open
        ? createPortal(
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              data-floating=""
              aria-label={props['aria-label']}
              onMouseDown={(e) => e.preventDefault()}
              style={
                pos
                  ? { top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }
                  : { visibility: 'hidden' }
              }
              className="fixed z-[60] overflow-y-auto rounded-md border border-line bg-paper py-1 shadow-float"
            >
              {ordered.length === 0 ? (
                <li role="presentation" className="px-3 py-2 text-small text-graphite">
                  No matches
                </li>
              ) : (
                ordered.map((item, i) => {
                  const selected = item.kind === 'option' && item.value === value
                  return (
                    <li
                      key={`${item.kind}-${item.value}`}
                      id={optionId(i)}
                      role="option"
                      aria-selected={i === active}
                      onMouseMove={() => setActive(i)}
                      onClick={() => choose(item)}
                      className={cn(
                        'flex min-h-9 cursor-pointer items-center justify-between gap-3 px-3 text-body text-ink max-sm:min-h-11',
                        i === active && 'bg-stone/70',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {item.kind === 'create' ? (
                          <Plus className="size-3.5 shrink-0 text-graphite" strokeWidth={ICON_STROKE} aria-hidden="true" />
                        ) : null}
                        <span className="truncate">{item.label}</span>
                      </span>
                      {selected ? (
                        <Check className="size-4 shrink-0 text-indigo" strokeWidth={ICON_STROKE} aria-hidden="true" />
                      ) : null}
                    </li>
                  )
                })
              )}
            </ul>,
            document.body,
          )
        : null}
    </div>
  )
}
