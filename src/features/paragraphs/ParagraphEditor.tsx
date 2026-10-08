import { Check, ChevronDown, FileText, PenLine } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import { Combobox } from '@/components/ui/Combobox'
import { focusableIn, useScrollLock } from '@/components/ui/Dialog'
import { TextArea } from '@/components/ui/Field'
import { ICON_STROKE } from '@/components/ui/icons'
import { KeyHint, modLabel } from '@/components/ui/Kbd'
import { useTopics } from '@/lib/hooks'
import { updateParagraph } from '@/lib/repo'
import { genresFor, TASK_TYPES } from '@/lib/taxonomy'
import { plainText } from '@/lib/text'
import type { Paragraph, TaskType } from '@/lib/types'
import { PROSE } from './ParagraphBody'
import { plural, UNTITLED, wordCount } from './paragraphText'

const AUTOSAVE_MS = 500

type Draft = Pick<Paragraph, 'title' | 'body' | 'task_type' | 'task_genre' | 'topic'>
type Status = 'idle' | 'saving' | 'saved' | 'error'

function draftOf(p: Paragraph): Draft {
  return { title: p.title, body: p.body, task_type: p.task_type, task_genre: p.task_genre, topic: p.topic }
}

/** A select that reads as plain text with a chevron until hovered (mockup 10). */
function QuietSelect(props: {
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  placeholder?: string
  icon?: React.ReactNode
  onChange: (v: string) => void
}): React.JSX.Element {
  const { label, value, options, placeholder, icon, onChange } = props
  return (
    <span className="relative inline-flex items-center">
      {icon ? <span className="pointer-events-none absolute left-2 flex">{icon}</span> : null}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-7 cursor-pointer appearance-none rounded-sm border border-transparent bg-transparent pr-6 text-small transition-colors duration-150',
          'hover:bg-stone hover:text-ink focus-visible:text-ink',
          'max-sm:h-11 max-sm:text-body-lg',
          icon ? 'pl-7' : 'pl-2',
          'text-graphite',
        )}
      >
        {placeholder !== undefined ? (
          <option value="" className="bg-paper text-ink">
            {placeholder}
          </option>
        ) : null}
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-paper text-ink">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-1.5 size-3.5 text-graphite"
        strokeWidth={ICON_STROKE}
        aria-hidden="true"
      />
    </span>
  )
}

/**
 * The bare paragraph field has no box, so focus shows as a thin indigo rule in the left margin. The negative margin
 * and wider width keep the text where it was.
 */
const BODY_FOCUS = cn(
  '-ml-3.5 w-[calc(100%+0.875rem)] border-l-2 border-transparent pl-3 transition-colors duration-150',
  'focus-visible:border-indigo/60',
)

const TASK_OPTIONS = TASK_TYPES.map((t) => ({ value: t.value, label: t.label }))

/** The topic Combobox, made quiet: no box until hover or focus. Sizes stay touch-friendly under 640px. */
const QUIET_COMBO = cn(
  // The field grows with its text, like the selects beside it (field-sizing: content).
  '[&_input]:w-auto [&_input]:min-w-24 [&_input]:max-w-64 [&_input]:[field-sizing:content]',
  '[&_input]:h-7 [&_input]:border-transparent [&_input]:bg-transparent [&_input]:pl-2 [&_input]:pr-7 [&_input]:text-small [&_input]:text-graphite',
  '[&_input:focus-visible]:text-ink [&_input:hover]:text-ink [&>button]:w-7',
  'max-sm:[&_input]:h-11 max-sm:[&_input]:text-body-lg',
)

/**
 * Distraction-free editor for a model paragraph (brief §20, §23; mockup 10). Full viewport over the shell.
 * Autosaves 500ms after typing stops. Done, Esc or Ctrl/Cmd+Enter returns to reading mode.
 */
export function ParagraphEditor(props: { paragraph: Paragraph; onDone: () => void }): React.JSX.Element {
  const { paragraph, onDone } = props
  const [draft, setDraft] = useState<Draft>(() => draftOf(paragraph))
  const [status, setStatus] = useState<Status>('idle')
  const latest = useRef(draft)
  latest.current = draft
  const dirty = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const saving = useRef<Promise<void>>(Promise.resolve())
  const rootRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const topics = useTopics('writing', draft.task_type || undefined)
  const id = paragraph.id
  const isNew = paragraph.body.trim() === '' && (paragraph.title.trim() === '' || paragraph.title === UNTITLED)

  const save = useCallback((): Promise<void> => {
    if (timer.current !== undefined) clearTimeout(timer.current)
    timer.current = undefined
    if (!dirty.current) return saving.current
    dirty.current = false
    const values = latest.current
    saving.current = saving.current
      .then(() => updateParagraph(id, values))
      .then(
        () => setStatus((s) => (dirty.current ? s : 'saved')),
        () => {
          dirty.current = true
          setStatus('error')
        },
      )
    return saving.current
  }, [id])

  const change = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    dirty.current = true
    setStatus('saving')
    if (timer.current !== undefined) clearTimeout(timer.current)
    timer.current = setTimeout(() => void save(), AUTOSAVE_MS)
  }

  // Leaving by any route (Back, a link) still saves what was typed.
  useEffect(
    () => () => {
      void save()
    },
    [save],
  )

  // A reload or a closed tab does not unmount the editor. Save a pending change at once, so the write starts
  // before the page goes away. While a change is not saved yet, the browser also asks before leaving.
  useEffect(() => {
    const flush = () => {
      if (dirty.current) void save()
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty.current) return
      void save()
      e.preventDefault()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [save])

  // Focus: a new paragraph starts at the title; an existing one at the end of the text.
  useLayoutEffect(() => {
    if (isNew) {
      titleRef.current?.focus()
      titleRef.current?.select()
    } else {
      const el = bodyRef.current
      el?.focus({ preventScroll: true })
      el?.setSelectionRange(el.value.length, el.value.length)
    }
    // Only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The shell behind stays still while the editor is open.
  useScrollLock(true)

  const done = async () => {
    await save()
    // A failed save keeps the editor open, so nothing typed is lost.
    if (!dirty.current) onDone()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.defaultPrevented) return
    if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault()
      void done()
      return
    }
    // Focus stays inside the editor (it covers the app).
    if (e.key === 'Tab') {
      const items = focusableIn(rootRef.current)
      const first = items[0]
      const last = items[items.length - 1]
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      }
    }
  }

  const genres = genresFor(draft.task_type)
  const genreLabel = draft.task_type === 'task2' ? 'Essay type' : 'Chart type'
  const words = wordCount(plainText(draft.body))

  const statusView =
    status === 'saving' ? (
      'Saving…'
    ) : status === 'saved' ? (
      <>
        <Check className="size-3.5" strokeWidth={ICON_STROKE} aria-hidden="true" />
        Saved
      </>
    ) : status === 'error' ? (
      <span className="text-crimson">Not saved. Try again.</span>
    ) : null

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Edit model paragraph"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-40 overflow-y-auto bg-paper text-ink animate-fade"
    >
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 bg-paper px-4 sm:px-8">
        <p className="flex items-center gap-2 text-small text-graphite">
          <FileText className="size-4" strokeWidth={ICON_STROKE} aria-hidden="true" />
          Model paragraph
        </p>
        <div className="flex items-center gap-4">
          <span role="status" className="inline-flex min-w-16 items-center justify-end gap-1.5 text-meta text-graphite">
            {statusView}
          </span>
          <Button variant="secondary" size="sm" kbd="Esc" onClick={() => void done()}>
            Done
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[680px] px-4 pt-10 pb-32 sm:px-0 sm:pt-24 sm:pb-40">
        <input
          ref={titleRef}
          type="text"
          aria-label="Title"
          value={draft.title}
          placeholder={UNTITLED}
          autoComplete="off"
          onChange={(e) => change({ title: e.target.value })}
          className="block w-full border-0 border-b border-transparent bg-transparent p-0 pb-1 max-sm:min-h-11 font-serif text-title font-normal tracking-[-0.005em] text-ink transition-colors duration-150 placeholder:text-graphite focus-visible:border-indigo/60 focus-visible:outline-none"
        />

        <div role="group" aria-label="Paragraph details" className="mt-3 -ml-2 flex flex-wrap items-center gap-1">
          <QuietSelect
            label="Task type"
            value={draft.task_type}
            placeholder="No task type"
            options={TASK_OPTIONS}
            icon={<PenLine className="size-3.5 text-sage" strokeWidth={ICON_STROKE} aria-hidden="true" />}
            onChange={(v) => {
              const task = v as TaskType
              const keepGenre = genresFor(task).includes(draft.task_genre)
              change({ task_type: task, task_genre: keepGenre ? draft.task_genre : '' })
            }}
          />
          {genres.length > 0 ? (
            <QuietSelect
              label={genreLabel}
              value={draft.task_genre}
              placeholder={genreLabel}
              options={genres.map((g) => ({ value: g, label: g }))}
              onChange={(v) => change({ task_genre: v })}
            />
          ) : null}
          <Combobox
            id={`paragraph-topic-${id}`}
            aria-label="Topic"
            placeholder="Topic"
            value={draft.topic}
            options={topics}
            allowCreate
            onChange={(v) => change({ topic: v })}
            className={QUIET_COMBO}
          />
        </div>

        <TextArea
          ref={bodyRef}
          aria-label="Paragraph"
          variant="bare"
          minRows={6}
          value={draft.body}
          placeholder="Write or paste the paragraph."
          onValueChange={(v) => change({ body: v })}
          className={cn(PROSE, BODY_FOCUS, 'mt-10 placeholder:text-graphite')}
        />
      </main>

      <footer className="fixed inset-x-0 bottom-0 flex h-12 items-center justify-between gap-4 bg-paper px-4 pb-[env(safe-area-inset-bottom)] text-meta text-graphite sm:px-8">
        <span className="tabular-nums">{plural(words, 'word')}</span>
        <span className="hidden items-center gap-2 sm:inline-flex">
          Paste keeps paragraphs, bold and lists
          <span aria-hidden="true">·</span>
          <KeyHint keys={`${modLabel()} B`} />
          bold
        </span>
      </footer>
    </div>,
    document.body,
  )
}
