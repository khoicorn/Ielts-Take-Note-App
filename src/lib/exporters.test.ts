import { describe, expect, it } from 'vitest'
import { exportFileName, ImportError, parseImport, toCSV, toJSON, toMarkdown } from './exporters'
import { makeNote, makeParagraph, makeReview, TRAVEL_NOTE } from './fixtures'
import type { ExportBundle, Note } from './types'

const NOTE_FIELDS: (keyof Note)[] = [
  'id', 'mode', 'date_created', 'topic', 'subtopic', 'task_type', 'task_genre', 'original_text', 'upgraded_text',
  'explanation', 'example_sentence', 'reusable_pattern', 'model_paragraph', 'note_type', 'error_type', 'error_pattern',
  'fix_pattern', 'recall_prompt', 'tags', 'difficulty', 'is_favorite', 'mastery_status', 'review_stage',
  'last_reviewed_at', 'next_review_at', 'times_reviewed', 'times_seen', 'source_paragraph_id', 'is_archived',
  'archived_at', 'created_at', 'updated_at',
]

function bundle(extra: Partial<ExportBundle> = {}): ExportBundle {
  const note = makeNote({ ...TRAVEL_NOTE, id: 'n1', tags: ['travel', 'nha-trang'] })
  return {
    app: 'ielts-upgrade-notebook',
    version: 1,
    exported_at: '2026-10-07T10:00:00.000Z',
    notes: [note],
    reviews: [makeReview({ id: 'r1', note_id: 'n1' })],
    paragraphs: [makeParagraph({ id: 'p1', title: 'Task 1 — Opposite Trends', body: 'From 2012 to 2022…' })],
    ...extra,
  }
}

function csvRows(csv: string): string[] {
  return csv.replace(/^﻿/, '').split('\r\n')
}

describe('exporters', () => {
  it('E1 quotes CSV values with commas, quotes and newlines', () => {
    const note = makeNote({ id: 'n1', upgraded_text: 'He said "fine", then left.\nNext line', explanation: 'plain' })
    const csv = toCSV([note])
    expect(csv).toContain('"He said ""fine"", then left.\nNext line"')
    expect(csv).toContain(',plain,')
  })

  it('E2 protects against spreadsheet formulas', () => {
    const csv = toCSV([makeNote({ upgraded_text: '=SUM(A1)', original_text: '+1', explanation: '@cmd', example_sentence: '-x' })])
    expect(csv).toContain(",'=SUM(A1),")
    expect(csv).toContain(",'+1,")
    expect(csv).toContain(",'@cmd,")
    expect(csv).toContain(",'-x,")
  })

  it('E3 starts with a BOM and lists every Note field in order', () => {
    const csv = toCSV([makeNote({ id: 'n1', tags: ['a', 'b'], is_favorite: true, next_review_at: null })])
    expect(csv.startsWith('﻿')).toBe(true)
    const [header, row] = csvRows(csv)
    expect(header.split(',')).toEqual(NOTE_FIELDS)
    const cells = row.split(',')
    expect(cells[NOTE_FIELDS.indexOf('tags')]).toBe('a; b')
    expect(cells[NOTE_FIELDS.indexOf('is_favorite')]).toBe('true')
    expect(cells[NOTE_FIELDS.indexOf('next_review_at')]).toBe('')
    expect(csvRows(toCSV([]))).toHaveLength(1)
  })

  it('E4 round-trips JSON', () => {
    const b = bundle({ settings: { theme: 'dark', session_size: 30, review_style: 'mixed', custom_speaking_topics: ['Pets'], custom_task1_topics: [], custom_task2_topics: [], custom_error_types: [] } })
    const json = toJSON(b)
    expect(json).toContain('\n  "app": "ielts-upgrade-notebook"')
    expect(parseImport(json)).toEqual(b)
    const noSettings = bundle()
    expect(parseImport(toJSON(noSettings))).toEqual(noSettings)
  })

  it('E5 rejects text that is not JSON', () => {
    expect(() => parseImport('not json')).toThrow(ImportError)
    expect(() => parseImport('not json')).toThrow('This file is not a JSON backup.')
  })

  it('E6 rejects JSON from another app', () => {
    expect(() => parseImport('{"app":"other"}')).toThrow(ImportError)
    expect(() => parseImport('{"app":"other"}')).toThrow(/IELTS Upgrade Notebook/)
    expect(() => parseImport('[1,2]')).toThrow(/IELTS Upgrade Notebook/)
    expect(() => parseImport('{"app":"ielts-upgrade-notebook","version":2}')).toThrow('This backup is from a newer version of the app.')
  })

  it('E7 fills missing fields in old backups', () => {
    const old = {
      app: 'ielts-upgrade-notebook',
      version: 1,
      exported_at: '2026-01-01T00:00:00.000Z',
      notes: [{ id: 'old', mode: 'writing', upgraded_text: 'The number of visitors to the City Zoo increased.', review_stage: 2, tags: ['Trend Language'], created_at: '2026-01-01T08:00:00.000Z' }],
      reviews: [{ id: 'r-old', note_id: 'old', rating: 'good' }],
    }
    const b = parseImport(JSON.stringify(old))
    const [note] = b.notes
    expect(note).toMatchObject({
      times_seen: 1,
      error_pattern: '',
      is_archived: false,
      archived_at: null,
      fix_pattern: '',
      mastery_status: 'learning',
      note_type: 'useful_expression',
      task_type: '',
      tags: ['trend-language'],
      updated_at: '2026-01-01T08:00:00.000Z',
      source_paragraph_id: null,
      times_reviewed: 0,
    })
    expect(note.date_created).toMatch(/^2026-01-0[12]$/)
    expect(Object.keys(note).sort()).toEqual([...NOTE_FIELDS].sort())
    expect(b.reviews[0]).toMatchObject({ id: 'r-old', note_id: 'old', rating: 'good', review_type: 'upgrade', new_interval: 0 })
    expect(b.paragraphs).toEqual([])
    expect(b.settings).toBeUndefined()
  })

  it('E8 drops notes without an upgrade and rows without an id', () => {
    const raw = {
      app: 'ielts-upgrade-notebook',
      version: 1,
      notes: [{ id: 'empty', upgraded_text: '  ' }, { upgraded_text: 'No id' }, { id: 'ok', upgraded_text: 'Fine.' }, 'junk'],
      reviews: [{ note_id: 'ok' }, { id: 'r', note_id: 'ok', rating: 'good' }, { id: 'orphan' }],
      paragraphs: [{ title: 'No id' }, { id: 'p', body: 'Text' }],
    }
    const b = parseImport(JSON.stringify(raw))
    expect(b.notes.map((n) => n.id)).toEqual(['ok'])
    expect(b.reviews.map((r) => r.id)).toEqual(['r'])
    expect(b.paragraphs.map((p) => p.id)).toEqual(['p'])
    expect(b.paragraphs[0].title).toBe('Untitled paragraph')
  })

  it('E9 writes readable Markdown grouped by mode and topic', () => {
    const notes = [
      makeNote({ ...TRAVEL_NOTE, id: 'a' }),
      makeNote({ id: 'b', mode: 'writing', task_type: 'task1', topic: 'Increase', original_text: 'visitors of the zoo', upgraded_text: 'visitors to the zoo', reusable_pattern: 'visitors to ___' }),
      makeNote({ id: 'c', mode: 'speaking', topic: 'Food', upgraded_text: "I'm pretty flexible about the rest." }),
    ]
    const md = toMarkdown(notes, [makeParagraph({ title: 'Task 1 — Opposite Trends', body: 'From 2012 to 2022, the three attractions showed markedly different trends.' })])
    expect(md).toContain('## Speaking')
    expect(md).toContain('**What I Said** — We enjoyed the scenario.')
    expect(md).toContain('**Native Upgrade** — The scenery was beautiful.')
    expect(md).toContain('**My Sentence** — visitors of the zoo')
    expect(md).toContain('**Band 7+ Upgrade** — visitors to the zoo')
    expect(md).toContain('### Academic Task 1 · Increase')
    expect(md.indexOf('## Speaking')).toBeLessThan(md.indexOf('## Writing'))
    expect(md.indexOf('### Food')).toBeLessThan(md.indexOf('### Travel'))
    expect(md.indexOf('## Writing')).toBeLessThan(md.indexOf('## Model paragraphs'))
    expect(md).toContain('### Task 1 — Opposite Trends')
    expect(md).not.toContain('undefined')
  })

  it('E7b stores imported times as canonical UTC so they sort in real time order', () => {
    const bundle = {
      app: 'ielts-upgrade-notebook',
      version: 1,
      notes: [{ id: 'n', upgraded_text: 'x', created_at: '2026-10-05', updated_at: '2026-10-05T10:00:00+07:00' }],
      paragraphs: [
        { id: 'early', title: 'a', updated_at: '2026-10-05T10:00:00+07:00' },
        { id: 'late', title: 'b', updated_at: '2026-10-05T05:00:00.000Z' },
      ],
    }
    const b = parseImport(JSON.stringify(bundle))
    expect(b.notes[0].updated_at).toBe('2026-10-05T03:00:00.000Z')
    expect(b.notes[0].created_at).toBe(new Date(2026, 9, 5).toISOString())
    expect(b.notes[0].date_created).toBe('2026-10-05')
    const newestFirst = [...b.paragraphs].sort((x, y) => y.updated_at.localeCompare(x.updated_at)).map((p) => p.id)
    expect(newestFirst).toEqual(['late', 'early'])
  })

  it('E10 names export files by local date', () => {
    expect(exportFileName('json', new Date(2026, 9, 7, 23, 30))).toBe('ielts-notebook-2026-10-07.json')
    expect(exportFileName('csv', new Date(2026, 0, 2))).toBe('ielts-notebook-2026-01-02.csv')
  })
})
