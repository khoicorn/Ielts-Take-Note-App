import { ArrowRight, ChevronRight, RotateCcw } from 'lucide-react'
import type React from 'react'
import { Combobox } from '@/components/ui/Combobox'
import { FavoriteStar } from '@/components/ui/FavoriteStar'
import { cn } from '@/components/ui/cn'
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field'
import { ICON_STROKE } from '@/components/ui/icons'
import { SegmentedControl } from '@/components/ui/Tabs'
import { TagInput } from '@/components/ui/TagInput'
import { useErrorTypes, useTopics } from '@/lib/hooks'
import { genresFor, NOTE_TYPES } from '@/lib/taxonomy'
import type { Mode, NoteType, ReviewStart } from '@/lib/types'
import { fieldLabel, REVIEW_START_OPTIONS, reviewStartLabel, type FormValues, type TextKey } from './form'
import { useTagSuggestions } from './useTagSuggestions'

const NOTE_TYPE_OPTIONS = NOTE_TYPES.map((t) => ({ value: t.value, label: t.label }))
const PATTERN_HINT = 'Type ___ for a blank.'

export interface MoreDetailsProps {
  idBase: string
  mode: Mode
  values: FormValues
  open: boolean
  onToggle: () => void
  onChange: (patch: Partial<FormValues>) => void
  /** Smart paste works in every text field. */
  onPasteText: (key: TextKey) => (text: string) => void
}

/** The disclosure row. Closed, it lists what is inside; on a phone it shows when the first review is. */
function MoreToggle(props: { id: string; open: boolean; start: ReviewStart; onToggle: () => void }): React.JSX.Element {
  const { open } = props
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={open ? props.id : undefined}
      onClick={props.onToggle}
      className={cn(
        '-mx-2 flex min-h-10 w-[calc(100%+1rem)] cursor-pointer items-center gap-2 rounded-sm px-2 text-left text-small',
        'text-graphite transition-colors duration-150 hover:bg-stone/40 max-sm:min-h-11',
      )}
    >
      <ChevronRight
        className={cn('size-4 shrink-0 transition-transform duration-180', open && 'rotate-90')}
        strokeWidth={ICON_STROKE}
        aria-hidden="true"
      />
      <span className="text-ink">More details</span>
      <span className="ml-auto text-right text-meta text-graphite">
        {open ? (
          'All optional'
        ) : (
          <>
            <span className="max-sm:hidden">Why, error type, tags, review, Must Remember</span>
            <span className="inline-flex items-center gap-1.5 sm:hidden">
              <RotateCcw className="size-3.5" strokeWidth={ICON_STROKE} aria-hidden="true" />
              {reviewStartLabel(props.start)}
            </span>
          </>
        )}
      </span>
    </button>
  )
}

export function MoreDetails(props: MoreDetailsProps): React.JSX.Element {
  const { idBase, mode, values: v, open, onChange, onPasteText } = props
  const id = (name: string) => `${idBase}-${name}`
  const sectionId = id('more')
  const writing = mode === 'writing'
  const errorTypes = useErrorTypes()
  const writingTopics = useTopics('writing', v.task_type)
  const tagSuggestions = useTagSuggestions()
  const genres = genresFor(v.task_type)

  const textArea = (key: TextKey, extra: { placeholder?: string; hint?: string } = {}) => (
    <Field label={fieldLabel(mode, key)} htmlFor={id(key)} hint={extra.hint}>
      <TextArea
        id={id(key)}
        value={v[key]}
        onValueChange={(text) => onChange({ [key]: text })}
        onPasteText={onPasteText(key)}
        placeholder={extra.placeholder}
      />
    </Field>
  )

  const errorType = (
    <Field label="Error type" htmlFor={id('error-type')}>
      <Select
        id={id('error-type')}
        value={v.error_type}
        onChange={(e) => onChange({ error_type: e.target.value })}
        options={errorTypes}
        placeholder="Not set"
      />
    </Field>
  )

  const noteType = (
    <Field label="Note type" htmlFor={id('note-type')}>
      <Select
        id={id('note-type')}
        value={v.note_type}
        onChange={(e) => onChange({ note_type: e.target.value as NoteType | '' })}
        options={NOTE_TYPE_OPTIONS}
        placeholder="Not set"
      />
    </Field>
  )

  return (
    <section
      className={cn(
        'px-6 max-sm:px-4',
        open ? 'border-t border-line bg-page pt-2 pb-7' : 'pb-3',
      )}
    >
      <MoreToggle id={sectionId} open={open} start={v.start} onToggle={props.onToggle} />
      {open ? (
        <div id={sectionId} className="mt-3 flex flex-col gap-5">
          {textArea('explanation', {
            placeholder: writing
              ? 'e.g. Use “visitors to + place” rather than “visitors of + place”.'
              : 'e.g. “Scenery” is the view. “Scenario” is a situation.',
          })}
          {writing ? null : textArea('reusable_pattern', { placeholder: 'e.g. I’m pretty flexible about ___.', hint: PATTERN_HINT })}

          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] items-end gap-x-3 max-sm:grid-cols-1 max-sm:gap-y-3">
              <Field label="Mistake pattern" htmlFor={id('error-pattern')}>
                <TextInput
                  id={id('error-pattern')}
                  value={v.error_pattern}
                  onChange={(e) => onChange({ error_pattern: e.target.value })}
                  placeholder="e.g. visitors of + place"
                  autoComplete="off"
                />
              </Field>
              <span className="flex h-10 items-center justify-center text-graphite max-sm:hidden" aria-hidden="true">
                <ArrowRight className="size-4" strokeWidth={ICON_STROKE} />
              </span>
              <Field label="Fix pattern" htmlFor={id('fix-pattern')}>
                <TextInput
                  id={id('fix-pattern')}
                  value={v.fix_pattern}
                  onChange={(e) => onChange({ fix_pattern: e.target.value })}
                  placeholder="e.g. visitors to + place"
                  autoComplete="off"
                />
              </Field>
            </div>
            <p className="text-meta text-graphite">Patterns that repeat are grouped in My Mistakes.</p>
          </div>

          {writing ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {errorType}
                <Field label="Language topic" htmlFor={id('language-topic')}>
                  <Combobox
                    id={id('language-topic')}
                    aria-label="Language topic"
                    value={v.topic}
                    onChange={(topic) => onChange({ topic })}
                    options={writingTopics}
                    placeholder="Choose or type"
                    allowCreate
                  />
                </Field>
                <Field label={v.task_type === 'task2' ? 'Essay type' : 'Chart type'} htmlFor={id('genre')}>
                  <Select
                    id={id('genre')}
                    value={v.task_genre}
                    onChange={(e) => onChange({ task_genre: e.target.value })}
                    options={genres}
                    placeholder="Not set"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {noteType}
                <Field
                  label="Recall prompt"
                  htmlFor={id('recall-prompt')}
                  hint="Shown when you review the pattern."
                  className="sm:col-span-2"
                >
                  <TextInput
                    id={id('recall-prompt')}
                    value={v.recall_prompt}
                    onChange={(e) => onChange({ recall_prompt: e.target.value })}
                    placeholder="e.g. Describe a stable trend."
                    autoComplete="off"
                  />
                </Field>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {errorType}
              {noteType}
              <Field label="Subtopic" htmlFor={id('subtopic')}>
                <TextInput
                  id={id('subtopic')}
                  value={v.subtopic}
                  onChange={(e) => onChange({ subtopic: e.target.value })}
                  placeholder="e.g. Nha Trang trip"
                  autoComplete="off"
                />
              </Field>
            </div>
          )}

          <Field label="Tags" htmlFor={id('tags')}>
            <TagInput
              id={id('tags')}
              value={v.tags}
              onChange={(tags) => onChange({ tags })}
              suggestions={tagSuggestions}
              placeholder="Add a tag"
            />
          </Field>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-small text-graphite" aria-hidden="true">
                First review
              </span>
              <SegmentedControl
                aria-label="First review"
                value={v.start}
                onChange={(start) => onChange({ start })}
                options={REVIEW_START_OPTIONS}
              />
            </div>
            <FavoriteStar variant="field" label="Must Remember" active={v.is_favorite} onToggle={() => onChange({ is_favorite: !v.is_favorite })} />
          </div>

          <Field label="Date" htmlFor={id('date')} className="sm:w-48">
            <TextInput
              id={id('date')}
              type="date"
              value={v.date_created}
              onChange={(e) => onChange({ date_created: e.target.value })}
            />
          </Field>
        </div>
      ) : null}
    </section>
  )
}
