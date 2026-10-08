import type React from 'react'
import { useCallback } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useParagraph } from '@/lib/hooks'
import { ParagraphEditor } from './ParagraphEditor'
import { PARAGRAPHS_PATH, ParagraphReader } from './ParagraphReader'

interface EditState {
  /** Set when Edit was pressed on the reader, so Done can step back instead of adding a history entry. */
  fromReader?: boolean
}

/**
 * Route /writing/paragraphs/:id (brief §23). Reading mode with selection to note, or the focus editor
 * with ?edit=1 (mockups 09 and 10).
 */
export function ParagraphScreen(): React.JSX.Element {
  const { id } = useParams()
  const paragraph = useParagraph(id)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const editing = params.get('edit') === '1'

  const startEdit = useCallback(() => {
    const next = new URLSearchParams(params)
    next.set('edit', '1')
    navigate({ pathname: location.pathname, search: `?${next.toString()}` }, { state: { fromReader: true } satisfies EditState })
  }, [navigate, location.pathname, params])

  const finishEdit = useCallback(() => {
    if ((location.state as EditState | null)?.fromReader) {
      navigate(-1)
      return
    }
    const next = new URLSearchParams(params)
    next.delete('edit')
    const search = next.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true })
  }, [navigate, location.pathname, location.state, params])

  if (paragraph === undefined) return <div className="min-h-[50vh]" aria-busy="true" />

  if (paragraph === null) {
    return (
      <EmptyState
        decoration="book"
        title="This paragraph does not exist."
        body="It may have been deleted."
        action={
          <ButtonLink to={PARAGRAPHS_PATH} variant="secondary">
            Back to Model Paragraphs
          </ButtonLink>
        }
      />
    )
  }

  return editing ? (
    <ParagraphEditor key={paragraph.id} paragraph={paragraph} onDone={finishEdit} />
  ) : (
    <ParagraphReader key={paragraph.id} paragraph={paragraph} onEdit={startEdit} />
  )
}
