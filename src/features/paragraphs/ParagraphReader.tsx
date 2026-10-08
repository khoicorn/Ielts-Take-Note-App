import { Archive, ArchiveRestore, ArrowLeft, Ellipsis, Highlighter, PenLine, Pencil, Trash2 } from 'lucide-react'
import type React from 'react'
import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useQuickAdd } from '@/app/overlays'
import { useHotkeys } from '@/app/hotkeys'
import { NoteRow } from '@/components/notes/NoteRow'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/Confirm'
import { FavoriteStar, MustRememberMark } from '@/components/ui/FavoriteStar'
import { isAnyDialogOpen } from '@/components/ui/Dialog'
import { IconButton } from '@/components/ui/IconButton'
import { ICON_STROKE } from '@/components/ui/icons'
import { Kbd } from '@/components/ui/Kbd'
import { PageHeader } from '@/components/ui/PageHeader'
import { Menu } from '@/components/ui/Popover'
import type { MenuItem } from '@/components/ui/Popover'
import { Section } from '@/components/ui/Section'
import { useToast } from '@/components/ui/Toast'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import { formatShortDate } from '@/lib/dates'
import { useNotesFromParagraph } from '@/lib/hooks'
import { archiveParagraph, deleteParagraph, restoreParagraph, updateParagraph } from '@/lib/repo'
import type { NoteType, Paragraph } from '@/lib/types'
import { ParagraphBody } from './ParagraphBody'
import type { TextRange } from './paragraphText'
import { findSavedPhrases, layoutBody, paragraphMeta, paragraphTitle, plural, selectionNoteOptions, wordCount } from './paragraphText'
import { SelectionMenu } from './SelectionMenu'
import { useBodySelection } from './useBodySelection'

export const PARAGRAPHS_PATH = '/writing?tab=paragraphs'

/** Shown while the paragraph has keyboard focus: how to pick words without a mouse. */
function KeyboardHint(): React.JSX.Element {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="inline-flex items-center gap-1">
        <Kbd>←</Kbd>
        <Kbd>→</Kbd>
      </span>
      pick a word
      <span aria-hidden="true">·</span>
      <Kbd>Shift</Kbd>
      select more
      <span aria-hidden="true">·</span>
      <span className="inline-flex items-center gap-1">
        <Kbd>1</Kbd>–<Kbd>5</Kbd>
      </span>
      save
    </span>
  )
}

/**
 * Model paragraph, reading mode (brief §23, mockup 09). Select words with the mouse, a finger or the
 * keyboard, and save them as a note in one step.
 */
export function ParagraphReader(props: { paragraph: Paragraph; onEdit: () => void }): React.JSX.Element {
  const { paragraph: p, onEdit } = props
  const navigate = useNavigate()
  const location = useLocation()
  const quickAdd = useQuickAdd()
  const confirm = useConfirm()
  const toast = useToast()
  const notes = useNotesFromParagraph(p.id)
  const bodyRef = useRef<HTMLDivElement>(null)
  const helpId = useId()
  const [keyboardFocus, setKeyboardFocus] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const layout = useMemo(() => layoutBody(p.body), [p.body])
  const marks = useMemo(() => findSavedPhrases(layout.text, notes ?? []), [layout.text, notes])
  const linkFrom = location.pathname + location.search
  const noteIds = useMemo(() => (notes ?? []).map((n) => n.id), [notes])

  const onChoose = useCallback(
    (sel: TextRange, type: NoteType) => quickAdd.open(selectionNoteOptions(p, layout.text, sel, type)),
    [quickAdd, p, layout.text],
  )
  const selection = useBodySelection({ rootRef: bodyRef, text: layout.text, onChoose })
  const fallbackAnchor = useCallback(() => bodyRef.current, [])

  useHotkeys({ e: () => (isAnyDialogOpen() ? undefined : onEdit()) })

  const toggleFavorite = async () => {
    const next = !p.is_favorite
    await updateParagraph(p.id, { is_favorite: next })
    toast.show(next ? 'Added to Must Remember.' : 'Removed from Must Remember.')
  }

  const archive = async () => {
    await archiveParagraph(p.id)
    toast.show('Paragraph archived.', { action: { label: 'Undo', onClick: () => void restoreParagraph(p.id) } })
  }

  const restore = async () => {
    await restoreParagraph(p.id)
    toast.show('Paragraph restored.')
  }

  const remove = async () => {
    const ok = await confirm({
      title: 'Delete this paragraph?',
      body: 'Notes made from it are kept.',
      confirmLabel: 'Delete paragraph',
      tone: 'danger',
    })
    if (!ok) return
    setLeaving(true)
    await deleteParagraph(p.id)
    navigate(PARAGRAPHS_PATH, { replace: true })
    toast.show('Paragraph deleted.')
  }

  const menuItems: (MenuItem | 'separator')[] = [
    p.is_archived
      ? { label: 'Restore', icon: ArchiveRestore, onSelect: () => void restore() }
      : { label: 'Archive', icon: Archive, onSelect: () => void archive() },
    'separator',
    { label: 'Delete', icon: Trash2, tone: 'danger', onSelect: () => void remove() },
  ]

  if (leaving) return <div className="min-h-[50vh]" />

  const metaParts = paragraphMeta(p).split(' · ').filter(Boolean)
  const words = wordCount(layout.text)
  const hasBody = layout.text.trim().length > 0
  const favorites = (notes ?? []).some((n) => n.is_favorite)

  return (
    <div className="mx-auto max-w-[1040px]">
      <article className="max-w-[760px]">
        <div className="mb-10 flex items-center justify-between gap-4 sm:mb-12">
          <Link
            to={PARAGRAPHS_PATH}
            className="-ml-1.5 inline-flex h-8 items-center gap-1.5 rounded-sm px-1.5 text-small text-graphite transition-colors duration-150 hover:text-ink max-sm:min-h-11"
          >
            <ArrowLeft className="size-4" strokeWidth={ICON_STROKE} aria-hidden="true" />
            Model Paragraphs
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <FavoriteStar active={p.is_favorite} onToggle={() => void toggleFavorite()} label="Must Remember" />
            <Button variant="secondary" size="sm" icon={Pencil} kbd="E" onClick={onEdit}>
              Edit
            </Button>
            <Menu
              aria-label="Paragraph actions"
              trigger={<IconButton icon={Ellipsis} label="More actions" size="sm" />}
              items={menuItems}
            />
          </div>
        </div>

        <div className="[&>header]:mb-0">
          <PageHeader eyebrow="Model paragraph" mark title={paragraphTitle(p)} />
        </div>
        {metaParts.length > 0 ? (
          <p className="mt-2.5 flex flex-wrap items-center gap-y-1 text-small text-graphite">
            <PenLine className="mr-1.5 size-3.5 shrink-0 text-sage" strokeWidth={ICON_STROKE} aria-hidden="true" />
            {metaParts.map((part, i) => (
              <span key={part} className="inline-flex items-center">
                {i > 0 ? (
                  <span aria-hidden="true" className="mx-2">
                    ·
                  </span>
                ) : null}
                {i > 0 ? <VisuallyHidden>, </VisuallyHidden> : null}
                {part}
              </span>
            ))}
          </p>
        ) : null}

        {p.is_archived ? (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
            <p className="text-small text-ink">This paragraph is archived. It is hidden from Model Paragraphs.</p>
            <Button variant="secondary" size="sm" icon={ArchiveRestore} onClick={() => void restore()}>
              Restore
            </Button>
          </div>
        ) : null}

        {hasBody ? (
          <>
            <div className="mt-10 flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:mt-12">
              <p className="flex items-center gap-2 text-small text-graphite" aria-hidden={keyboardFocus || undefined}>
                <Highlighter className="size-4 shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
                {keyboardFocus ? <KeyboardHint /> : 'Select a phrase to save it as a note.'}
              </p>
              <Button
                variant="ghost"
                size="sm"
                disabled={!selection.selection}
                onMouseDown={(e) => e.preventDefault()}
                onClick={selection.openMenu}
                className="max-sm:hidden"
              >
                Create note from selection
              </Button>
            </div>
            <VisuallyHidden>
              <span id={helpId}>
                Select words to save them as a note. With the keyboard, use the left and right arrow keys to pick a
                word, hold Shift to select more, then press 1 to 5 to choose the note type, or Enter for the list.
              </span>
            </VisuallyHidden>

            <ParagraphBody
              ref={bodyRef}
              layout={layout}
              marks={marks}
              linkState={{ ids: noteIds, from: linkFrom }}
              describedBy={helpId}
              className="mt-6 sm:mt-8"
              onKeyDown={selection.bodyHandlers.onKeyDown}
              onPointerDown={selection.bodyHandlers.onPointerDown}
              onFocus={(e) => {
                let visible = false
                try {
                  visible = e.currentTarget.matches(':focus-visible')
                } catch {
                  visible = false
                }
                setKeyboardFocus(visible)
              }}
              onBlur={() => setKeyboardFocus(false)}
            />
            <SelectionMenu
              open={selection.menuOpen && !!selection.selection}
              text={selection.selection?.text ?? ''}
              menuRef={selection.menuRef}
              anchorRange={selection.anchorRange}
              fallbackAnchor={fallbackAnchor}
              focusOnOpen={selection.focusMenu}
              onFocused={selection.menuFocused}
              onChoose={selection.choose}
              onDismiss={selection.dismiss}
              onPress={selection.menuPressed}
            />
            <p className="mt-5 text-meta text-graphite tabular-nums">
              {plural(words, 'word')} · Added {formatShortDate(p.created_at)}
            </p>
          </>
        ) : (
          <div className="mt-12 border-y border-line py-8">
            <p className="font-serif text-section text-ink">This paragraph is empty.</p>
            <p className="mt-1 text-body text-graphite">Write or paste the paragraph you want to learn from.</p>
            <Button variant="secondary" size="sm" icon={Pencil} className="mt-5" onClick={onEdit}>
              Write the paragraph
            </Button>
          </div>
        )}

        <Section
          id="paragraph-notes"
          title="Notes from this paragraph"
          className="mt-16 sm:mt-[72px]"
          action={
            notes && notes.length > 0 ? (
              <span className="hidden items-center gap-5 text-graphite sm:inline-flex">
                {marks.length > 0 ? (
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className="inline-block w-[22px] border-b-2 border-dotted border-gold" />
                    Underlined in the text
                  </span>
                ) : null}
                {favorites ? (
                  <MustRememberMark />
                ) : null}
              </span>
            ) : null
          }
        >
          {notes === undefined ? null : notes.length === 0 ? (
            <p className="py-4 text-small text-graphite">
              {hasBody ? 'No notes yet. Select a phrase above to save one.' : 'No notes yet.'}
            </p>
          ) : (
            <div>
              {notes.map((n) => (
                <NoteRow key={n.id} note={n} view="compact" to={`/notes/${n.id}`} linkState={{ ids: noteIds, from: linkFrom }} />
              ))}
            </div>
          )}
        </Section>
      </article>
    </div>
  )
}
