import { render, screen, cleanup } from '@testing-library/react'
import { describe, expect, it, afterEach } from 'vitest'
import type { Note } from '@/lib/types'
import { MemoryRouter } from 'react-router'
import { NotePair } from './NotePair'
import { NoteRow } from './NoteRow'
afterEach(cleanup)

function makeNote(patch: Partial<Note>): Note {
  return {
    id: 'n1',
    mode: 'speaking',
    date_created: '2026-10-07',
    topic: '',
    subtopic: '',
    task_type: '',
    task_genre: '',
    original_text: '',
    upgraded_text: '',
    explanation: '',
    example_sentence: '',
    reusable_pattern: '',
    model_paragraph: '',
    note_type: 'correction',
    error_type: '',
    error_pattern: '',
    fix_pattern: '',
    recall_prompt: '',
    tags: [],
    difficulty: 0,
    is_favorite: false,
    mastery_status: 'new',
    review_stage: 0,
    last_reviewed_at: null,
    next_review_at: null,
    times_reviewed: 0,
    times_seen: 1,
    source_paragraph_id: null,
    is_archived: false,
    archived_at: null,
    created_at: '2026-10-07T08:00:00.000Z',
    updated_at: '2026-10-07T08:00:00.000Z',
    ...patch,
  }
}

/** Type scale from smallest to largest (src/styles/index.css). */
const SCALE = ['text-meta', 'text-small', 'text-body', 'text-body-lg', 'text-note', 'text-section', 'text-recall', 'text-title']

function sizeRank(el: Element): number {
  const cls = Array.from(el.classList)
  const found = SCALE.findIndex((s) => cls.includes(s))
  if (found === -1) throw new Error(`No type-scale class on <${el.tagName.toLowerCase()} class="${el.className}">`)
  return found
}

const TRAVEL = makeNote({
  topic: 'Travel',
  original_text: 'We enjoyed the scenario.',
  upgraded_text: 'The scenery was beautiful.',
  example_sentence: 'The scenery along the coast was beautiful.',
})

describe('NotePair', () => {
  for (const size of ['compact', 'reading', 'detail'] as const) {
    it(`N1 ${size}: mistake and upgrade both render, and the upgrade is larger`, () => {
      render(<NotePair note={TRAVEL} size={size} />)
      const mistake = screen.getByTestId('note-original')
      const upgrade = screen.getByTestId('note-upgraded')
      expect(mistake).toHaveTextContent('We enjoyed the scenario.')
      expect(upgrade).toHaveTextContent('The scenery was beautiful.')
      expect(sizeRank(upgrade)).toBeGreaterThan(sizeRank(mistake))
      expect(mistake.className).toContain('text-crimson')
      // The mistake comes first (brief §18).
      expect(mistake.compareDocumentPosition(upgrade) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  }

  it('N1 the mistake carries the mode field label', () => {
    render(<NotePair note={TRAVEL} size="reading" />)
    expect(screen.getByText('What I Said')).toBeInTheDocument()
    render(<NotePair note={{ ...TRAVEL, id: 'w', mode: 'writing' }} size="detail" />)
    expect(screen.getByText('My Sentence')).toBeInTheDocument()
    expect(screen.getByText('Band 7+ Upgrade')).toBeInTheDocument()
  })

  for (const size of ['compact', 'reading', 'detail'] as const) {
    it(`N2 ${size}: a note with only upgraded_text has no mistake label and no "undefined"`, () => {
      const only = makeNote({ upgraded_text: 'remained relatively stable' })
      const { container } = render(<NotePair note={only} size={size} />)
      expect(screen.queryByTestId('note-original')).not.toBeInTheDocument()
      expect(screen.queryByText(/What I Said/)).not.toBeInTheDocument()
      expect(container.textContent).not.toMatch(/undefined|null/)
      expect(screen.getByTestId('note-upgraded')).toHaveTextContent('remained relatively stable')
      expect(screen.queryByTestId('note-example')).not.toBeInTheDocument()
    })
  }

  it('N3 every text element carries the overflow-wrap class', () => {
    const long = makeNote({
      original_text: 'x'.repeat(40) + ' https://example.com/' + 'a'.repeat(120),
      upgraded_text: 'https://example.com/' + 'b'.repeat(120),
      example_sentence: 'c'.repeat(200),
    })
    for (const size of ['compact', 'reading', 'detail'] as const) {
      const { unmount } = render(<NotePair note={long} size={size} />)
      for (const id of ['note-original', 'note-upgraded']) {
        expect(screen.getByTestId(id).className).toContain('[overflow-wrap:anywhere]')
      }
      if (size === 'reading') expect(screen.getByTestId('note-example').className).toContain('[overflow-wrap:anywhere]')
      unmount()
    }
  })

  it('N2 reading view shows the example; compact view does not', () => {
    const { unmount } = render(<NotePair note={TRAVEL} size="reading" />)
    expect(screen.getByTestId('note-example')).toHaveTextContent('The scenery along the coast was beautiful.')
    unmount()
    render(<NotePair note={TRAVEL} size="compact" />)
    expect(screen.queryByTestId('note-example')).not.toBeInTheDocument()
  })
  it('N4 NoteRow keeps a keyboard focus ring and one text size in the mobile meta line', () => {
    render(
      <MemoryRouter>
        <NoteRow note={{ ...TRAVEL, topic: 'Travel', mastery_status: 'mastered' }} to="/notes/n1" />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link')
    // outline-none would set --tw-outline-style to none and hide the focus-visible ring (Tailwind 4).
    expect(link).not.toHaveClass('outline-none')
    expect(link).toHaveClass('focus-visible:outline-2', 'focus-visible:outline-indigo')
    const metaMark = screen.getAllByText('Mastered')[0].parentElement as HTMLElement
    expect(metaMark).toHaveClass('text-meta')
    expect(metaMark).not.toHaveClass('text-small')
  })
})

describe('NoteRow showMode', () => {
  it('N5 shows the Speaking or Writing mark before the topic only when asked', () => {
    const { unmount } = render(
      <MemoryRouter>
        <NoteRow note={{ ...TRAVEL, topic: 'Travel' }} to="/notes/n1" />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('img', { name: 'Speaking' })).not.toBeInTheDocument()
    unmount()
    render(
      <MemoryRouter>
        <NoteRow note={{ ...TRAVEL, topic: 'Travel' }} to="/notes/n1" showMode />
        <NoteRow note={{ ...TRAVEL, id: 'w', mode: 'writing', task_type: 'task1', topic: '' }} to="/notes/w" showMode />
      </MemoryRouter>,
    )
    // Desktop meta and mobile meta line each carry the mark.
    const speaking = screen.getAllByRole('img', { name: 'Speaking' })
    expect(speaking).toHaveLength(2)
    expect(speaking[0].nextElementSibling).toHaveTextContent('Travel')
    // Without a topic, the mode's word stands in for it.
    expect(screen.getAllByText('Writing').length).toBeGreaterThanOrEqual(1)
  })
})
