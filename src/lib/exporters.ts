/**
 * Export (JSON backup, CSV, Markdown) and JSON import parsing (brief §41, design §11).
 */
import { formatShortDate, timeOf, todayKey } from './dates'
import { isRecord, normalizeNote, normalizeParagraph, normalizeReview, normalizeSettings, NOTE_FIELDS } from './records'
import { FIELD_LABELS, MASTERY, MODE_LABELS, noteTypeLabel, taskTypeLabel } from './taxonomy'
import type { ExportBundle, Mode, Note, Paragraph } from './types'

export const APP_ID = 'ielts-upgrade-notebook'
export const BACKUP_VERSION = 1

export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}

export function toJSON(bundle: ExportBundle): string {
  return JSON.stringify(bundle, null, 2)
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

const BOM = '﻿'
const CRLF = '\r\n'

function csvCell(value: Note[keyof Note]): string {
  let s = value === null ? '' : Array.isArray(value) ? value.join('; ') : String(value)
  // Spreadsheet formula safety: a leading = + - @ (or tab / CR) would run as a formula.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCSV(notes: Note[]): string {
  const rows = [NOTE_FIELDS.join(','), ...notes.map((n) => NOTE_FIELDS.map((f) => csvCell(n[f])).join(','))]
  return BOM + rows.join(CRLF)
}

/* ------------------------------------------------------------------ */
/* Markdown                                                            */
/* ------------------------------------------------------------------ */

function mdField(label: string, value: string): string | null {
  const v = value.trim()
  if (!v) return null
  return v.includes('\n') ? `**${label}**\n\n${v}` : `**${label}** — ${v}`
}

function noteHeading(n: Note): string {
  const topic = n.topic.trim()
  if (n.mode === 'writing') {
    const task = taskTypeLabel(n.task_type)
    return [task, topic].filter(Boolean).join(' · ') || 'Writing note'
  }
  return topic || 'No topic'
}

function noteMeta(n: Note): string {
  const parts = [
    MODE_LABELS[n.mode],
    n.mode === 'writing' ? n.task_genre.trim() : n.subtopic.trim(),
    noteTypeLabel(n.note_type),
    n.error_type.trim(),
    `${MASTERY[n.mastery_status].symbol} ${MASTERY[n.mastery_status].label}`,
    n.is_favorite ? '✦ Must remember' : '',
    n.is_archived ? 'Archived' : '',
    formatShortDate(n.date_created),
    n.tags.length ? `Tags: ${n.tags.join(', ')}` : '',
  ]
  return `*${parts.filter(Boolean).join(' · ')}*`
}

function noteToMarkdown(n: Note): string {
  const labels = FIELD_LABELS[n.mode]
  const lines = [
    `### ${noteHeading(n)}`,
    mdField(labels.original, n.original_text),
    mdField(labels.upgraded, n.upgraded_text),
    mdField(labels.explanation, n.explanation),
    mdField(labels.example, n.example_sentence),
    mdField(labels.pattern, n.reusable_pattern),
    n.error_pattern.trim() ? mdField('Mistake pattern', [n.error_pattern.trim(), n.fix_pattern.trim()].filter(Boolean).join(' → ')) : null,
    mdField('Model paragraph', n.model_paragraph),
    noteMeta(n),
  ]
  return lines.filter((l): l is string => l !== null).join('\n\n')
}

function byTopicThenDate(a: Note, b: Note): number {
  const ta = a.topic.trim()
  const tb = b.topic.trim()
  if (!ta !== !tb) return ta ? -1 : 1
  return (
    a.task_type.localeCompare(b.task_type) ||
    ta.localeCompare(tb, undefined, { sensitivity: 'base' }) ||
    a.date_created.localeCompare(b.date_created) ||
    timeOf(a.created_at) - timeOf(b.created_at)
  )
}

function paragraphToMarkdown(p: Paragraph): string {
  const meta = [taskTypeLabel(p.task_type), p.task_genre.trim(), p.topic.trim(), p.is_archived ? 'Archived' : ''].filter(Boolean).join(' · ')
  return [`### ${p.title.trim() || 'Untitled paragraph'}`, meta ? `*${meta}*` : null, p.body.trim() || null]
    .filter((l): l is string => l !== null)
    .join('\n\n')
}

export function toMarkdown(notes: Note[], paragraphs: Paragraph[]): string {
  const sections: string[] = ['# IELTS Upgrade Notebook']
  for (const mode of ['speaking', 'writing'] as Mode[]) {
    const list = notes.filter((n) => n.mode === mode).sort(byTopicThenDate)
    if (list.length === 0) continue
    sections.push(`## ${MODE_LABELS[mode]}`, ...list.map(noteToMarkdown))
  }
  if (paragraphs.length > 0) sections.push('## Model paragraphs', ...paragraphs.map(paragraphToMarkdown))
  return `${sections.join('\n\n')}\n`
}

/* ------------------------------------------------------------------ */
/* Import                                                              */
/* ------------------------------------------------------------------ */

/** Keeps one row per id: the one with the newest updated_at (or the first, when equal). */
function dedupe<T extends { id: string; updated_at?: string }>(rows: T[]): T[] {
  const byId = new Map<string, T>()
  for (const row of rows) {
    const existing = byId.get(row.id)
    if (!existing || timeOf(row.updated_at) > timeOf(existing.updated_at)) byId.set(row.id, row)
  }
  return [...byId.values()]
}

function rows(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

export function parseImport(text: string): ExportBundle {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new ImportError('This file is not a JSON backup.')
  }
  if (!isRecord(data) || data.app !== APP_ID) {
    throw new ImportError('This file was not exported from IELTS Upgrade Notebook.')
  }
  const version = typeof data.version === 'number' ? data.version : BACKUP_VERSION
  if (version > BACKUP_VERSION) throw new ImportError('This backup is from a newer version of the app.')
  const exportedAt =
    typeof data.exported_at === 'string' && !Number.isNaN(Date.parse(data.exported_at)) ? data.exported_at : new Date().toISOString()
  const notes = dedupe(rows(data.notes).flatMap((r) => normalizeNote(r, exportedAt) ?? []))
  const reviews = dedupe(rows(data.reviews).flatMap((r) => normalizeReview(r, exportedAt) ?? []))
  const paragraphs = dedupe(rows(data.paragraphs).flatMap((r) => normalizeParagraph(r, exportedAt) ?? []))
  const bundle: ExportBundle = { app: APP_ID, version: BACKUP_VERSION, exported_at: exportedAt, notes, reviews, paragraphs }
  if (isRecord(data.settings)) bundle.settings = normalizeSettings(data.settings)
  return bundle
}

/* ------------------------------------------------------------------ */
/* Files                                                               */
/* ------------------------------------------------------------------ */

export function exportFileName(ext: 'json' | 'csv' | 'md', now: Date = new Date()): string {
  return `ielts-notebook-${todayKey(now)}.${ext}`
}

export function downloadText(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser time to start the download before the URL is released.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
