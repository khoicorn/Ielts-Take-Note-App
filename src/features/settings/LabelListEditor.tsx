import { Plus } from 'lucide-react'
import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'
import { Tag } from '@/components/ui/Tag'
import { useToast } from '@/components/ui/Toast'

const MAX_LABEL = 60

/**
 * A built-in list (muted, fixed) plus the owner's own labels (removable), with an add field.
 * Used for Speaking topics, Writing language topics and error types.
 */
export function LabelListEditor(props: {
  id: string
  title: string
  /** Accessible name of the add field, e.g. "Add a Speaking topic". */
  addLabel: string
  placeholder: string
  defaults: readonly string[]
  custom: readonly string[]
  onChange: (next: string[]) => Promise<unknown>
}): React.JSX.Element {
  const { id, title, addLabel, placeholder, defaults, custom, onChange } = props
  const toast = useToast()
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState('')
  const inputId = `${id}-add`
  const messageId = `${id}-message`

  const add = async () => {
    const label = draft.trim().replace(/\s+/g, ' ')
    if (!label) return
    const taken = [...defaults, ...custom].some((l) => l.toLowerCase() === label.toLowerCase())
    if (taken) {
      setMessage(`“${label}” is already in the list.`)
      return
    }
    await onChange([...custom, label])
    setDraft('')
    setMessage('')
  }

  const remove = async (label: string) => {
    const before = [...custom]
    await onChange(custom.filter((l) => l !== label))
    toast.show(`Removed “${label}”.`, { action: { label: 'Undo', onClick: () => void onChange(before) } })
  }

  return (
    <div className="border-b border-line py-5 last:border-b-0">
      <h3 id={`${id}-title`} className="text-body text-ink">
        {title}
      </h3>
      <p className="mt-1 text-small text-graphite">
        <span>Built in: </span>
        {defaults.join(' · ')}
      </p>
      {custom.length ? (
        <ul aria-label={`Your ${title.toLowerCase()}`} className="mt-3 flex flex-wrap gap-2">
          {custom.map((label) => (
            <li key={label} className="max-w-full">
              <Tag tone="indigo" onRemove={() => void remove(label)}>
                {label}
              </Tag>
            </li>
          ))}
        </ul>
      ) : null}
      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void add()
        }}
      >
        <TextInput
          id={inputId}
          aria-label={addLabel}
          aria-describedby={message ? messageId : undefined}
          placeholder={placeholder}
          value={draft}
          maxLength={MAX_LABEL}
          autoComplete="off"
          onChange={(e) => {
            setDraft(e.target.value)
            if (message) setMessage('')
          }}
          className="max-w-72"
        />
        <Button type="submit" icon={Plus} disabled={!draft.trim()}>
          Add
        </Button>
      </form>
      {/* Always in the page, so screen readers announce the message when it appears. */}
      <p id={messageId} role="status" className={message ? 'mt-2 text-small text-graphite' : undefined}>
        {message}
      </p>
    </div>
  )
}
