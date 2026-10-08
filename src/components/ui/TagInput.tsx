import React, { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { normalizeTag } from '@/lib/text'
import { ACTIVE_OPTION, cn } from './cn'
import { useFloatingPosition } from './floating'
import { Tag } from './Tag'

/** Enter or comma adds a tag, Backspace on an empty field removes the last one. */
export function TagInput(props: {
  id: string
  value: string[]
  onChange: (v: string[]) => void
  suggestions?: readonly string[]
  placeholder?: string
  'aria-describedby'?: string
}): React.JSX.Element {
  const { id, value, onChange, suggestions = [], placeholder } = props
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = `${id}-suggestions`

  const matches = useMemo(() => {
    const q = normalizeTag(text)
    if (!q) return []
    return suggestions
      .map((s) => normalizeTag(s))
      .filter((s, i, arr) => s && s.includes(q) && s !== q && !value.includes(s) && arr.indexOf(s) === i)
      .slice(0, 6)
  }, [text, suggestions, value])

  const open = focused && matches.length > 0
  const pos = useFloatingPosition(wrapRef, open, { preferredHeight: 220, layer: listRef })

  const add = (raw: string) => {
    const parts = raw.split(',').map(normalizeTag).filter(Boolean)
    const next = [...value]
    for (const p of parts) if (!next.includes(p)) next.push(p)
    if (next.length !== value.length) onChange(next)
    setText('')
    setActive(-1)
  }

  return (
    <div
      ref={wrapRef}
      onClick={() => inputRef.current?.focus()}
      className={cn(
        'flex min-h-10 w-full cursor-text flex-wrap items-center gap-1.5 rounded-sm border border-line-strong bg-paper px-2 py-1.5',
        'transition-colors duration-150 hover:border-ink/30 max-sm:min-h-11',
        focused && 'border-indigo outline-1 outline-indigo',
      )}
    >
      {value.map((t) => (
        <Tag key={t} onRemove={() => onChange(value.filter((v) => v !== t))}>
          {t}
        </Tag>
      ))}
      <input
        ref={inputRef}
        id={id}
        type="text"
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-describedby={props['aria-describedby']}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        value={text}
        placeholder={value.length === 0 ? placeholder : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          if (text.trim()) add(text)
        }}
        onChange={(e) => {
          const v = e.target.value
          if (v.includes(',')) add(v)
          else {
            setText(v)
            setActive(-1)
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
            if (open && active >= 0) {
              e.preventDefault()
              add(matches[active])
            } else if (text.trim()) {
              e.preventDefault()
              add(text)
            }
          } else if (e.key === 'Backspace' && text === '' && value.length > 0) {
            onChange(value.slice(0, -1))
          } else if (e.key === 'ArrowDown' && open) {
            e.preventDefault()
            setActive((a) => (a + 1) % matches.length)
          } else if (e.key === 'ArrowUp' && open) {
            e.preventDefault()
            setActive((a) => (a <= 0 ? matches.length - 1 : a - 1))
          } else if (e.key === 'Escape' && open) {
            e.preventDefault()
            e.stopPropagation()
            setText('')
          }
        }}
        className="h-7 min-w-24 flex-1 bg-transparent px-1 text-body text-ink placeholder:text-graphite focus-visible:outline-none max-sm:text-body-lg"
      />
      {open
        ? createPortal(
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              data-floating=""
              aria-label="Tag suggestions"
              onMouseDown={(e) => e.preventDefault()}
              style={pos ? { top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight } : { visibility: 'hidden' }}
              className="fixed z-[60] overflow-y-auto rounded-md border border-line bg-paper py-1 shadow-float"
            >
              {matches.map((m, i) => (
                <li
                  key={m}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => add(m)}
                  className={cn('flex min-h-9 cursor-pointer items-center px-3 text-body text-ink max-sm:min-h-11', i === active && ACTIVE_OPTION)}
                >
                  {m}
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  )
}
