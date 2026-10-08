/**
 * Quick Add (brief §19–20, §45 priority 1; plan C1). A correction must be savable in 10–20 seconds:
 * N → S or W → type or paste → Ctrl Enter.
 *
 * Step 1 asks Speaking or Writing (skipped when the caller sets a mode). Step 2 shows only the
 * essential fields; "More details" holds the rest. Smart paste splits a labelled ChatGPT correction
 * into fields. An unsent note is kept as a draft in localStorage and restored on the next open.
 */
import { MessageCircle, PenLine, RotateCcw } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useHotkeys } from '@/app/hotkeys'
import type { QuickAddOptions } from '@/app/overlays'
import { Button } from '@/components/ui/Button'
import { Combobox } from '@/components/ui/Combobox'
import { Dialog } from '@/components/ui/Dialog'
import { Field, TextArea } from '@/components/ui/Field'
import { ICON_STROKE } from '@/components/ui/icons'
import { KeyHint, modLabel } from '@/components/ui/Kbd'
import { UnderlineTabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useTopics } from '@/lib/hooks'
import { createNote, setLastStudied } from '@/lib/repo'
import { FIELD_LABELS, MODE_LABELS, TASK_TYPES } from '@/lib/taxonomy'
import { htmlToMarkdown } from '@/lib/text'
import type { Mode } from '@/lib/types'
import {
  buildDraft,
  emptyValues,
  fieldLabel,
  firstEmptyField,
  hasContent,
  hasDetails,
  hasText,
  mergeValues,
  PATTERN_HINT,
  PLACEHOLDERS,
  reviewStartLabel,
  valuesForMode,
  valuesForNext,
  type FocusKey,
  type FormValues,
  type TextKey,
  type WritingTask,
} from './form'
import { choiceId, ModeChoice } from './ModeChoice'
import { MoreDetails } from './MoreDetails'
import { DraftLine, FilledLine, PasteBar, UpgradeField } from './parts'
import {
  applyOffer,
  isOfferLive,
  looksLikeNoteText,
  makeOffer,
  normalizePasted,
  offerFields,
  type PasteOffer,
} from './smartPaste'
import { clearDraft, readDraft, readLastUsed, readMoreOpen, writeDraft, writeLastUsed, writeMoreOpen } from './storage'

export interface QuickAddDialogProps {
  open: boolean
  options: QuickAddOptions
  onClose: () => void
}

const DRAFT_DELAY_MS = 300
const EMPTY_UPGRADE = 'Add the better version first.'

const MODE_TABS = [
  { value: 'speaking', label: 'Speaking', icon: MessageCircle },
  { value: 'writing', label: 'Writing', icon: PenLine },
]
const TASK_TABS = TASK_TYPES.map((t) => ({ value: t.value, label: t.label }))

/**
 * Rendered by OverlayProvider at all times. Each open starts a fresh session (fresh state, draft check);
 * the last session stays mounted while the dialog fades out.
 */
export function QuickAddDialog(props: QuickAddDialogProps): React.JSX.Element | null {
  const [run, setRun] = useState<{ n: number; open: boolean; options: QuickAddOptions | null }>({
    n: 0,
    open: false,
    options: null,
  })
  if (props.open && (!run.open || props.options !== run.options)) {
    setRun({ n: run.n + 1, open: true, options: props.options })
  } else if (!props.open && run.open) {
    setRun({ ...run, open: false })
  }
  if (run.n === 0 || !run.options) return null
  return <QuickAddSession key={run.n} open={props.open} options={run.options} onClose={props.onClose} />
}

interface Init {
  step: 'choose' | 'form'
  mode: Mode
  values: FormValues
  /** What Discard returns to: empty fields plus any context the caller passed (topic, task type). */
  base: FormValues
  restored: boolean
  /**
   * True when this session may write and clear the stored draft: it restored the draft, or none was waiting.
   * A session that leaves a waiting draft alone (a prefill, another mode) never writes over it or clears it.
   */
  ownsDraft: boolean
  moreOpen: boolean
  lastUsed: Mode | null
}

function initialState(options: QuickAddOptions, now: Date): Init {
  const prefill = options.prefill
  const preset: Mode | undefined =
    options.mode ?? (prefill?.mode === 'speaking' || prefill?.mode === 'writing' ? prefill.mode : undefined)
  const last = readLastUsed()
  const lastUsed = last?.mode ?? null
  const withContent = hasContent(prefill) || Boolean(options.sourceParagraphId)
  let base = mergeValues(emptyValues(now, last?.task_type ?? 'task1'), prefill)
  if (options.sourceParagraphId) base = { ...base, source_paragraph_id: options.sourceParagraphId }
  const storedMore = readMoreOpen()

  // A prefill with note text (a paragraph selection, a search) is a new note: the draft waits.
  const waiting = readDraft(now)
  const draft = withContent ? null : waiting
  if (draft && (!preset || draft.mode === preset)) {
    return {
      step: 'form',
      mode: draft.mode,
      values: draft.values,
      base,
      restored: true,
      ownsDraft: true,
      moreOpen: storedMore || hasDetails(draft.mode, draft.values, now),
      lastUsed,
    }
  }
  const mode = preset ?? lastUsed ?? 'speaking'
  return {
    step: preset ? 'form' : 'choose',
    mode,
    values: base,
    base,
    restored: false,
    ownsDraft: waiting === null,
    moreOpen: storedMore || (withContent && hasDetails(mode, base, now)),
    lastUsed,
  }
}

function QuickAddSession(props: QuickAddDialogProps): React.JSX.Element {
  const { open, options, onClose } = props
  const toast = useToast()
  const navigate = useNavigate()
  const idBase = useId()
  const fieldId = (key: FocusKey | string) => `${idBase}-${key}`

  const [init] = useState(() => initialState(options, new Date()))
  const [step, setStep] = useState(init.step)
  const [mode, setMode] = useState<Mode>(init.mode)
  const [values, setValues] = useState<FormValues>(init.values)
  const [moreOpen, setMoreOpen] = useState(init.moreOpen)
  const [restored, setRestored] = useState(init.restored)
  const [offer, setOffer] = useState<PasteOffer | null>(null)
  /** After Fill fields: the values before, for Undo. Cleared by the next edit, a save or a mode switch. */
  const [filled, setFilled] = useState<{ before: FormValues; field: TextKey } | null>(null)
  const [upgradeError, setUpgradeError] = useState(false)
  const [focusRequest, setFocusRequest] = useState<{ key: FocusKey; end: boolean; n: number } | null>(null)
  const speakingTopics = useTopics('speaking')

  // Refs hold the latest values for keyboard shortcuts, toasts and the draft timer.
  const valuesRef = useRef(values)
  const modeRef = useRef(mode)
  const openRef = useRef(open)
  openRef.current = open
  /** True once the learner changed something. Until then, a stored draft is left as it is. */
  const dirty = useRef(false)
  const ownsDraft = init.ownsDraft
  const saving = useRef(false)
  const alive = useRef(true)
  const initialFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const setAll = useCallback((next: FormValues, byUser = true) => {
    valuesRef.current = next
    setValues(next)
    if (byUser) dirty.current = true
  }, [])

  const change = useCallback(
    (patch: Partial<FormValues>) => {
      const current = valuesRef.current
      // A field that commits on blur may send its unchanged value. Only a real edit ends Undo.
      const edited = (Object.keys(patch) as (keyof FormValues)[]).some(
        (k) => JSON.stringify(patch[k]) !== JSON.stringify(current[k]),
      )
      setAll({ ...current, ...patch })
      if (edited) setFilled(null)
      if (patch.upgraded_text?.trim()) setUpgradeError(false)
    },
    [setAll],
  )

  /* ---------- draft ---------- */

  const persistDraft = useCallback(() => {
    if (!dirty.current || !ownsDraft) return
    if (hasText(valuesRef.current)) writeDraft(modeRef.current, valuesRef.current)
    else clearDraft()
  }, [ownsDraft])

  useEffect(() => {
    if (!open || step !== 'form') return
    const t = window.setTimeout(persistDraft, DRAFT_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [values, mode, open, step, persistDraft])

  // Closing keeps the draft at once (no confirm), so nothing typed in the last 300ms is lost.
  useEffect(() => {
    if (!open) persistDraft()
  }, [open, persistDraft])
  useEffect(() => () => persistDraft(), [persistDraft])

  /* ---------- focus ---------- */

  // Read by Dialog when it opens: the last used mode card, or the first empty essential field.
  useLayoutEffect(() => {
    initialFocusRef.current = document.getElementById(
      step === 'choose' ? choiceId(idBase, init.lastUsed ?? 'speaking') : fieldId(firstEmptyField(mode, valuesRef.current)),
    )
  })

  const focusField = useCallback((key: FocusKey, end = false) => {
    setFocusRequest((r) => ({ key, end, n: (r?.n ?? 0) + 1 }))
  }, [])

  useEffect(() => {
    if (!focusRequest) return
    const el = document.getElementById(`${idBase}-${focusRequest.key}`) as HTMLInputElement | HTMLTextAreaElement | null
    if (!el) return
    el.focus()
    if (focusRequest.end) el.setSelectionRange(el.value.length, el.value.length)
  }, [focusRequest, idBase])

  /* ---------- step 1 ---------- */

  const choose = useCallback(
    (m: Mode) => {
      modeRef.current = m
      setMode(m)
      setStep('form')
      writeLastUsed({ mode: m, task_type: valuesRef.current.task_type })
      focusField(firstEmptyField(m, valuesRef.current))
    },
    [focusField],
  )

  const otherChoice = () => {
    const onWriting = document.activeElement?.id === choiceId(idBase, 'writing')
    document.getElementById(choiceId(idBase, onWriting ? 'speaking' : 'writing'))?.focus()
  }

  useHotkeys(
    {
      s: () => choose('speaking'),
      '1': () => choose('speaking'),
      w: () => choose('writing'),
      '2': () => choose('writing'),
      arrowleft: otherChoice,
      arrowright: otherChoice,
      arrowup: otherChoice,
      arrowdown: otherChoice,
    },
    { enabled: open && step === 'choose' },
  )

  /* ---------- save ---------- */

  const save = async (another: boolean) => {
    if (saving.current || !openRef.current) return
    // A topic or tag typed but not chosen yet is committed when its field loses focus.
    const active = document.activeElement
    if (active instanceof HTMLElement && active.getAttribute('role') === 'combobox') active.blur()
    const v = valuesRef.current
    const m = modeRef.current
    if (!v.upgraded_text.trim()) {
      setUpgradeError(true)
      focusField('upgraded_text')
      return
    }
    saving.current = true
    try {
      const note = await createNote(buildDraft(m, v), { start: v.start })
      dirty.current = false
      // Undo belongs to the note just saved. The dialog content stays on screen while it fades out.
      setFilled(null)
      // A draft this session did not restore is still waiting for its own session.
      if (ownsDraft) clearDraft()
      writeLastUsed({ mode: m, task_type: v.task_type })
      void setLastStudied({ mode: m, task_type: note.task_type, topic: note.topic }).catch(() => {})
      toast.show('Note saved.', {
        action: {
          label: 'View',
          onClick: () => {
            if (alive.current && openRef.current) onClose()
            navigate(`/notes/${note.id}`)
          },
        },
      })
      options.onSaved?.(note)
      if (!alive.current) return
      if (another) {
        setAll(valuesForNext(v, new Date()), false)
        setOffer(null)
        setFilled(null)
        setRestored(false)
        setUpgradeError(false)
        focusField('original_text')
      } else {
        onClose()
      }
    } catch {
      persistDraft()
      toast.show('The note could not be saved. Your text is still here.')
    } finally {
      saving.current = false
    }
  }

  useHotkeys(
    {
      'mod+enter': () => void save(false),
      'mod+shift+enter': () => void save(true),
    },
    { enabled: open && step === 'form', allowInInputs: ['mod+enter', 'mod+shift+enter'] },
  )

  /* ---------- smart paste ---------- */

  // A later paste that is not a correction leaves an earlier offer alone.
  const pasteInto = (key: TextKey) => (text: string) => setOffer((current) => makeOffer(key, text) ?? current)

  /** A sentence or a whole correction pasted into Topic goes to the first text field instead. */
  const onTopicPaste = (e: React.ClipboardEvent) => {
    const html = e.clipboardData.getData('text/html')
    const plain = e.clipboardData.getData('text/plain')
    const text = (html.trim() ? htmlToMarkdown(html) : '') || plain
    if (!looksLikeNoteText(text)) return
    e.preventDefault()
    e.stopPropagation()
    const block = normalizePasted(text)
    const current = valuesRef.current.original_text
    change({ original_text: current.trim() ? `${current.replace(/\s+$/, '')}\n${block}` : block })
    setOffer((o) => makeOffer('original_text', block) ?? o)
    focusField('original_text', true)
  }

  const liveOffer = isOfferLive(values, offer) ? offer : null

  const fill = () => {
    if (!liveOffer) return
    const before = valuesRef.current
    const next = applyOffer(before, liveOffer)
    const filled = offerFields(liveOffer)
    setAll(next)
    setOffer(null)
    if (next.upgraded_text.trim()) setUpgradeError(false)
    // Why (and a Speaking pattern) live in More details: open it so the learner sees them.
    if (filled.includes('explanation') || (modeRef.current === 'speaking' && filled.includes('reusable_pattern'))) {
      setMoreOpen(true)
    }
    focusField(firstEmptyField(modeRef.current, next))
    setFilled({ before, field: liveOffer.field })
  }

  const undoFill = () => {
    if (!filled || !openRef.current) return
    setAll(filled.before)
    setFilled(null)
    setOffer(null)
    focusField(filled.field, true)
  }

  const keepPasted = () => {
    if (!liveOffer) return
    setOffer(null)
    focusField(liveOffer.field, true)
  }

  /* ---------- other actions ---------- */

  const discardDraft = () => {
    clearDraft()
    setAll(init.base, false)
    dirty.current = false
    setRestored(false)
    setOffer(null)
    setFilled(null)
    setUpgradeError(false)
    focusField(firstEmptyField(modeRef.current, init.base))
  }

  const switchMode = (m: Mode) => {
    if (m === modeRef.current) return
    modeRef.current = m
    setMode(m)
    setFilled(null)
    setAll(valuesForMode(valuesRef.current))
    writeLastUsed({ mode: m, task_type: valuesRef.current.task_type })
  }

  const toggleMore = () => {
    const next = !moreOpen
    setMoreOpen(next)
    writeMoreOpen(next)
  }

  /* ---------- render ---------- */

  const labels = FIELD_LABELS[mode]
  const writing = mode === 'writing'
  const hasUpgrade = values.upgraded_text.trim() !== ''
  const ph = PLACEHOLDERS[mode]

  const title = step === 'choose' ? 'What are you saving?' : (options.title ?? `New ${MODE_LABELS[mode]} note`)
  const description =
    step === 'choose'
      ? 'Save what you said and the better version. It comes back for review.'
      : `${labels.original} → ${labels.upgraded}`

  const textField = (key: 'original_text' | 'example_sentence' | 'reusable_pattern', extra: { placeholder: string; hint?: string; minRows?: number }) => (
    <Field label={fieldLabel(mode, key)} htmlFor={fieldId(key)} hint={extra.hint}>
      <TextArea
        id={fieldId(key)}
        value={values[key]}
        onValueChange={(text) => change({ [key]: text })}
        onPasteText={pasteInto(key)}
        placeholder={extra.placeholder}
        minRows={extra.minRows}
      />
    </Field>
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="md"
      placement="top"
      initialFocusRef={initialFocusRef}
      // The Save row is sticky at the bottom of this scroll area. Scroll padding keeps a focused field or the
      // More details toggle above it on short screens (WCAG 2.4.11), instead of under it.
      bodyClassName={step === 'form' ? 'p-0! [scroll-padding-bottom:calc(5rem_+_env(safe-area-inset-bottom))]' : undefined}
    >
      {step === 'choose' ? (
        <ModeChoice
          idBase={idBase}
          lastUsed={init.lastUsed}
          initialFocus={init.lastUsed ?? 'speaking'}
          onChoose={choose}
        />
      ) : (
        <div className="flex min-h-full flex-col">
          {/* DOM order sets the tab order: essential fields, then Save, then More details (plan C1). */}
          <div className="order-1 flex flex-col gap-5 px-6 pt-4 pb-5 max-sm:gap-4.5 max-sm:px-4">
            <div className="sm:hidden">
              <UnderlineTabs aria-label="Mode" items={MODE_TABS} value={mode} onChange={(m) => switchMode(m as Mode)} />
            </div>
            {restored ? <DraftLine onDiscard={discardDraft} /> : null}
            {filled ? <FilledLine onUndo={undoFill} /> : null}
            {liveOffer ? (
              <PasteBar
                count={offerFields(liveOffer).length}
                labels={offerFields(liveOffer).map((k) => fieldLabel(mode, k))}
                onFill={fill}
                onKeep={keepPasted}
              />
            ) : null}

            {writing ? (
              <UnderlineTabs
                aria-label="Task type"
                items={TASK_TABS}
                value={values.task_type}
                onChange={(t) => change({ task_type: t as WritingTask, task_genre: '' })}
                className="-mb-1"
              />
            ) : (
              <div onPasteCapture={onTopicPaste} className="sm:w-[calc((100%-1rem)/2)]">
                <Field label="Topic" htmlFor={fieldId('topic')}>
                  <Combobox
                    id={fieldId('topic')}
                    aria-label="Topic"
                    value={values.topic}
                    onChange={(topic) => change({ topic })}
                    options={speakingTopics}
                    placeholder="Choose or type a topic"
                    allowCreate
                  />
                </Field>
              </div>
            )}

            {textField('original_text', { placeholder: ph.original })}
            <UpgradeField
              id={fieldId('upgraded_text')}
              label={labels.upgraded}
              error={upgradeError && !hasUpgrade ? EMPTY_UPGRADE : undefined}
              value={values.upgraded_text}
              onValueChange={(text) => change({ upgraded_text: text })}
              onPasteText={pasteInto('upgraded_text')}
              placeholder={ph.upgraded}
            />
            {writing ? textField('reusable_pattern', { placeholder: ph.pattern, hint: PATTERN_HINT, minRows: 1 }) : null}
            {textField('example_sentence', { placeholder: ph.example, hint: 'A full sentence that uses the upgrade.' })}
          </div>

          <div className="sticky bottom-0 z-10 order-3 mt-auto flex items-center gap-2 border-t border-line bg-paper px-6 py-3.5 max-sm:px-4 max-sm:pb-[max(0.875rem,env(safe-area-inset-bottom))]">
            <Button
              variant="primary"
              className="order-3 max-sm:flex-[1_1_40%]"
              aria-disabled={!hasUpgrade || undefined}
              aria-keyshortcuts="Control+Enter Meta+Enter"
              onClick={() => void save(false)}
            >
              Save
            </Button>
            <Button
              variant="secondary"
              className="order-2 max-sm:flex-auto max-sm:px-3.5"
              aria-disabled={!hasUpgrade || undefined}
              aria-keyshortcuts="Control+Shift+Enter Meta+Shift+Enter"
              onClick={() => void save(true)}
            >
              Save and add another
            </Button>
            <div className="order-1 mr-auto hidden min-w-0 items-center gap-4 text-meta text-graphite sm:flex">
              <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-1.5">
                <KeyHint keys={`${modLabel()} Enter`} />
                to save
              </span>
              {moreOpen ? null : (
                <span className="inline-flex min-w-0 items-center gap-1.5 border-l border-line pl-4">
                  <RotateCcw className="size-3.5 shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
                  <span className="truncate">{reviewStartLabel(values.start)}</span>
                </span>
              )}
            </div>
          </div>

          <div className="order-2">
            <MoreDetails
              idBase={idBase}
              mode={mode}
              values={values}
              open={moreOpen}
              onToggle={toggleMore}
              onChange={change}
              onPasteText={pasteInto}
            />
          </div>
        </div>
      )}
    </Dialog>
  )
}
