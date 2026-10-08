import { ArrowRight } from 'lucide-react'
import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useHotkeys } from '@/app/hotkeys'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import { Combobox } from '@/components/ui/Combobox'
import { useConfirm } from '@/components/ui/Confirm'
import { useAnyDialogOpen } from '@/components/ui/Dialog'
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field'
import { ICON_STROKE } from '@/components/ui/icons'
import { modLabel } from '@/components/ui/Kbd'
import { SegmentedControl, UnderlineTabs } from '@/components/ui/Tabs'
import { TagInput } from '@/components/ui/TagInput'
import { useToast } from '@/components/ui/Toast'
import { isDayKey } from '@/lib/dates'
import { useErrorTypes, useTopics } from '@/lib/hooks'
import { updateNote } from '@/lib/repo'
import { FIELD_LABELS, genresFor, MODE_LABELS, NOTE_TYPES, TASK_TYPES } from '@/lib/taxonomy'
import type { DayKey, Mode, Note, NoteContentPatch, NoteType, TaskType } from '@/lib/types'

/** The owner-written fields this form edits. Review fields are never touched (brief §41). */
interface FormState {
  mode: Mode
  task_type: TaskType
  topic: string
  subtopic: string
  task_genre: string
  original_text: string
  upgraded_text: string
  explanation: string
  example_sentence: string
  reusable_pattern: string
  model_paragraph: string
  recall_prompt: string
  note_type: NoteType
  error_type: string
  error_pattern: string
  fix_pattern: string
  tags: string[]
  date_created: DayKey
}

function fromNote(n: Note): FormState {
  return {
    mode: n.mode,
    task_type: n.task_type,
    topic: n.topic,
    subtopic: n.subtopic,
    task_genre: n.task_genre,
    original_text: n.original_text,
    upgraded_text: n.upgraded_text,
    explanation: n.explanation,
    example_sentence: n.example_sentence,
    reusable_pattern: n.reusable_pattern,
    model_paragraph: n.model_paragraph,
    recall_prompt: n.recall_prompt,
    note_type: n.note_type,
    error_type: n.error_type,
    error_pattern: n.error_pattern,
    fix_pattern: n.fix_pattern,
    tags: [...n.tags],
    date_created: n.date_created,
  }
}

function toPatch(s: FormState): NoteContentPatch {
  const { date_created, ...rest } = s
  const patch: NoteContentPatch = { ...rest }
  if (isDayKey(date_created)) patch.date_created = date_created
  if (s.mode === 'speaking') {
    patch.task_type = ''
    patch.task_genre = ''
  }
  return patch
}

/** Keeps a custom stored value selectable even when it is not in the list. */
function withCurrent(options: readonly string[], current: string): string[] {
  const list = [...options]
  if (current && !list.includes(current)) list.push(current)
  return list
}

const EMPTY_UPGRADE = 'Add the better version first.'
const ID = 'nd-edit'

/**
 * Edit mode of Note Detail: the same fields as Quick Add, all visible, plus topic, task, error, tags and date.
 * Ctrl/Cmd+Enter saves. Esc cancels and asks first when something changed. Saving keeps review data.
 */
export function NoteEditForm(props: {
  note: Note
  /** Called with the saved note after a save, or with nothing after Cancel. */
  onDone: (saved?: Note) => void
  /** Tells the screen whether there are unsaved changes (the back link asks before leaving). */
  onDirtyChange?: (dirty: boolean) => void
}): React.JSX.Element {
  const { note, onDone, onDirtyChange } = props
  const toast = useToast()
  const confirm = useConfirm()
  const dialogOpen = useAnyDialogOpen()
  // The screen remounts the form for another note, so the starting values are read once.
  const [initial] = useState(() => fromNote(note))
  const [state, setState] = useState<FormState>(initial)
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const firstRef = useRef<HTMLTextAreaElement>(null)
  const upgradeRef = useRef<HTMLTextAreaElement>(null)

  const labels = FIELD_LABELS[state.mode]
  const isWriting = state.mode === 'writing'
  const topics = useTopics(state.mode, isWriting ? state.task_type : undefined)
  const errorTypes = useErrorTypes()
  const genres = genresFor(isWriting ? state.task_type : '')
  const dirty = useMemo(() => JSON.stringify(state) !== JSON.stringify(initial), [state, initial])
  const canSave = state.upgraded_text.trim().length > 0

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  // Closing or reloading the tab with unsaved edits: the browser asks first.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    firstRef.current?.focus({ preventScroll: true })
  }, [])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((s) => ({ ...s, [key]: value }))
    if (key === 'upgraded_text' && error) setError(undefined)
  }

  const setMode = (mode: Mode) =>
    setState((s) => ({
      ...s,
      mode,
      // A Writing note always belongs to a task. Speaking notes have none.
      task_type: mode === 'writing' ? s.task_type || 'task1' : '',
      task_genre: mode === 'writing' ? s.task_genre : '',
    }))

  const save = async () => {
    if (saving) return
    if (!canSave) {
      setError(EMPTY_UPGRADE)
      upgradeRef.current?.focus()
      return
    }
    setSaving(true)
    try {
      const updated = await updateNote(note.id, toPatch(state))
      toast.show('Changes saved.')
      onDirtyChange?.(false)
      onDone(updated)
    } catch (e) {
      setSaving(false)
      toast.show(e instanceof Error ? e.message : 'The note could not be saved.')
    }
  }

  const cancel = async () => {
    if (dirty) {
      const ok = await confirm({
        title: 'Discard your changes?',
        body: 'Your edits to this note will be lost.',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        tone: 'danger',
      })
      if (!ok) return
    }
    onDirtyChange?.(false)
    onDone()
  }

  useHotkeys(
    {
      'mod+enter': () => void save(),
      escape: () => void cancel(),
    },
    { enabled: !dialogOpen, allowInInputs: ['mod+enter', 'escape'] },
  )

  return (
    <form
      aria-label="Edit note"
      noValidate
      // Enter in a one-line field must not save by accident. Saving is the button or Ctrl/Cmd+Enter.
      onSubmit={(e) => e.preventDefault()}
      className="min-w-0"
    >
      <div className="mb-8">
        <h2 className="font-serif text-section font-normal text-ink">Edit note</h2>
        <p className="mt-1 text-small text-graphite">Editing keeps the review history and the mastery level.</p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-small text-graphite">Notebook</span>
            <SegmentedControl<Mode>
              aria-label="Notebook"
              value={state.mode}
              onChange={setMode}
              options={(['speaking', 'writing'] as const).map((m) => ({ value: m, label: MODE_LABELS[m] }))}
            />
          </div>
          {isWriting ? (
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-small text-graphite">Task type</span>
              <UnderlineTabs
                aria-label="Task type"
                value={state.task_type || 'task1'}
                onChange={(v) => set('task_type', v as TaskType)}
                items={TASK_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />
            </div>
          ) : null}
        </div>

        <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
          <Field label={isWriting ? 'Language topic' : 'Topic'} htmlFor={`${ID}-topic`}>
            <Combobox
              id={`${ID}-topic`}
              value={state.topic}
              onChange={(v) => set('topic', v)}
              options={topics}
              allowCreate
              placeholder={isWriting ? 'Increase' : 'Travel'}
            />
          </Field>
          {isWriting ? (
            <Field label={state.task_type === 'task2' ? 'Essay type' : 'Chart type'} htmlFor={`${ID}-genre`}>
              <Select
                id={`${ID}-genre`}
                value={state.task_genre}
                onChange={(e) => set('task_genre', e.target.value)}
                options={withCurrent(genres, state.task_genre)}
                placeholder="None"
              />
            </Field>
          ) : (
            <Field label="Subtopic" htmlFor={`${ID}-subtopic`}>
              <TextInput
                id={`${ID}-subtopic`}
                value={state.subtopic}
                onChange={(e) => set('subtopic', e.target.value)}
                placeholder="Nha Trang trip"
              />
            </Field>
          )}
        </div>

        <Field label={labels.original} htmlFor={`${ID}-original`}>
          <TextArea
            ref={firstRef}
            id={`${ID}-original`}
            value={state.original_text}
            onValueChange={(v) => set('original_text', v)}
            placeholder={isWriting ? 'The number of visitors of the City Zoo increased steadily.' : 'We enjoyed the scenario.'}
          />
        </Field>

        <Field label={labels.upgraded} htmlFor={`${ID}-upgraded`} error={error}>
          <TextArea
            ref={upgradeRef}
            id={`${ID}-upgraded`}
            value={state.upgraded_text}
            onValueChange={(v) => set('upgraded_text', v)}
            required
            placeholder={isWriting ? 'The number of visitors to the City Zoo increased steadily.' : 'The scenery was beautiful.'}
            // Larger and in deep sage: the upgrade stands out more than the mistake (brief §18, refinement 4).
            className="text-note! text-upgrade!"
          />
        </Field>

        <Field label={labels.explanation} htmlFor={`${ID}-explanation`}>
          <TextArea
            id={`${ID}-explanation`}
            value={state.explanation}
            onValueChange={(v) => set('explanation', v)}
            minRows={3}
          />
        </Field>

        <Field label={labels.example} htmlFor={`${ID}-example`} hint="Bold words (Ctrl B) become the blank in review.">
          <TextArea id={`${ID}-example`} value={state.example_sentence} onValueChange={(v) => set('example_sentence', v)} />
        </Field>

        <Field label={labels.pattern} htmlFor={`${ID}-pattern`} hint="Use ___ for slots">
          <TextArea
            id={`${ID}-pattern`}
            value={state.reusable_pattern}
            onValueChange={(v) => set('reusable_pattern', v)}
            placeholder={isWriting ? 'The number of visitors to ___ increased steadily from ___ to ___.' : undefined}
          />
        </Field>

        {isWriting || state.model_paragraph.trim() ? (
          <Field label="Model paragraph" htmlFor={`${ID}-paragraph`} optional>
            <TextArea
              id={`${ID}-paragraph`}
              value={state.model_paragraph}
              onValueChange={(v) => set('model_paragraph', v)}
              minRows={3}
              className="font-serif text-body-lg!"
            />
          </Field>
        ) : null}

        {isWriting || state.recall_prompt.trim() ? (
          <Field label="Recall prompt" htmlFor={`${ID}-recall`} optional>
            <TextInput
              id={`${ID}-recall`}
              value={state.recall_prompt}
              onChange={(e) => set('recall_prompt', e.target.value)}
              placeholder="Describe a stable trend."
            />
          </Field>
        ) : null}

        <div className="grid gap-x-4 gap-y-6 border-t border-line pt-6 sm:grid-cols-2">
          <Field label="Error type" htmlFor={`${ID}-error`}>
            <Select
              id={`${ID}-error`}
              value={state.error_type}
              onChange={(e) => set('error_type', e.target.value)}
              options={withCurrent(errorTypes, state.error_type)}
              placeholder="None"
            />
          </Field>
          <Field label="Note type" htmlFor={`${ID}-note-type`}>
            <Select
              id={`${ID}-note-type`}
              value={state.note_type}
              onChange={(e) => set('note_type', e.target.value as NoteType)}
              options={NOTE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
          </Field>
        </div>

        <div className="grid items-end gap-x-3 gap-y-6 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <Field label="Mistake pattern" htmlFor={`${ID}-error-pattern`}>
            <TextInput
              id={`${ID}-error-pattern`}
              value={state.error_pattern}
              onChange={(e) => set('error_pattern', e.target.value)}
              placeholder="visitors of + place"
            />
          </Field>
          <ArrowRight
            className="mb-3 hidden size-4 text-graphite sm:block"
            strokeWidth={ICON_STROKE}
            aria-hidden="true"
          />
          <Field label="Fix pattern" htmlFor={`${ID}-fix-pattern`}>
            <TextInput
              id={`${ID}-fix-pattern`}
              value={state.fix_pattern}
              onChange={(e) => set('fix_pattern', e.target.value)}
              placeholder="visitors to + place"
            />
          </Field>
        </div>

        <div className="grid gap-x-4 gap-y-6 sm:grid-cols-[minmax(0,1fr)_11rem]">
          <Field label="Tags" htmlFor={`${ID}-tags`}>
            <TagInput id={`${ID}-tags`} value={state.tags} onChange={(v) => set('tags', v)} placeholder="trends, idiom" />
          </Field>
          <Field label="Date" htmlFor={`${ID}-date`}>
            <TextInput
              id={`${ID}-date`}
              type="date"
              value={state.date_created}
              onChange={(e) => set('date_created', e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div
        className={cn(
          'sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 mt-10 flex flex-wrap items-center justify-end gap-2',
          'border-t border-line bg-page px-4 py-3 sm:bottom-0 sm:mx-0 sm:px-0',
        )}
      >
        <Button variant="ghost" onClick={() => void cancel()} kbd="Esc">
          Cancel
        </Button>
        <Button variant="primary" onClick={() => void save()} disabled={!canSave} loading={saving} kbd={`${modLabel()} Enter`}>
          Save changes
        </Button>
      </div>
    </form>
  )
}
