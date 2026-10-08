import { CircleAlert, Download, FileText, ShieldCheck, Table2, Upload } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/Confirm'
import { ICON_STROKE } from '@/components/ui/icons'
import { Section } from '@/components/ui/Section'
import { useToast } from '@/components/ui/Toast'
import { downloadText, exportFileName, ImportError, parseImport, toCSV, toJSON, toMarkdown } from '@/lib/exporters'
import { useLastExportAt } from '@/lib/hooks'
import { exportBundle, importBundle, markExported, requestPersistentStorage } from '@/lib/repo'
import type { ExportBundle } from '@/lib/types'
import { SettingRow, SettingRows } from './SettingRow'
import { BACKUP_MAX_AGE_DAYS } from '@/features/today/todayCopy'
import { backupContents, count, importSummaryText, lastBackupText } from './settingsCopy'

/** How importBundle merges (by id, the newer edit wins), in plain words. */
const MERGE_RULE = 'Notes only in this browser stay. If a note is in both, the copy edited last is kept.'

/** The interval Today's backup reminder uses: "2 weeks". */
const BACKUP_EVERY = BACKUP_MAX_AGE_DAYS % 7 === 0 ? count(BACKUP_MAX_AGE_DAYS / 7, 'week') : count(BACKUP_MAX_AGE_DAYS, 'day')

type StorageState = 'checking' | 'protected' | 'unprotected' | 'unsupported'
type ExportKind = 'json' | 'csv' | 'md'

function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

function useStorageState(): [StorageState, (s: StorageState) => void] {
  const [state, setState] = useState<StorageState>('checking')
  useEffect(() => {
    let cancelled = false
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined
    if (!storage?.persisted || !storage.persist) {
      setState('unsupported')
      return
    }
    storage
      .persisted()
      .then((v) => !cancelled && setState(v ? 'protected' : 'unprotected'))
      .catch(() => !cancelled && setState('unsupported'))
    return () => {
      cancelled = true
    }
  }, [])
  return [state, setState]
}

/** Export (JSON backup, CSV, Markdown), import a JSON backup, and browser storage protection (design §11). */
export function DataSection(props: { className?: string }): React.JSX.Element {
  const toast = useToast()
  const confirm = useConfirm()
  const lastExportAt = useLastExportAt()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'import' | 'protect' | null>(null)
  // Each export runs on its own, so a quick second click is never lost.
  const [exporting, setExporting] = useState<ReadonlySet<ExportKind>>(() => new Set())
  const [importError, setImportError] = useState<string | null>(null)
  const [storage, setStorage] = useStorageState()
  const [protectRefused, setProtectRefused] = useState(false)

  const runExport = async (kind: ExportKind) => {
    setExporting((s) => new Set(s).add(kind))
    try {
      const now = new Date()
      const bundle = await exportBundle(now)
      if (kind === 'json') {
        downloadText(exportFileName('json', now), toJSON(bundle), 'application/json')
        // Only the JSON file can be imported again, so only it counts as a backup.
        await markExported(now)
        toast.show('Backup exported.')
      } else if (kind === 'csv') {
        downloadText(exportFileName('csv', now), toCSV(bundle.notes), 'text/csv;charset=utf-8')
        toast.show('CSV exported.')
      } else {
        downloadText(exportFileName('md', now), toMarkdown(bundle.notes, bundle.paragraphs), 'text/markdown;charset=utf-8')
        toast.show('Markdown exported.')
      }
    } catch {
      toast.show('The export did not finish. Try again.')
    } finally {
      setExporting((s) => {
        const next = new Set(s)
        next.delete(kind)
        return next
      })
    }
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const file = input.files?.[0]
    // Clear the input so choosing the same file again still triggers a change.
    input.value = ''
    if (!file) return
    setImportError(null)
    let bundle: ExportBundle
    try {
      bundle = parseImport(await readFileText(file))
    } catch (err) {
      setImportError(err instanceof ImportError ? err.message : 'This file could not be read.')
      return
    }
    const contents = backupContents(bundle)
    if (!contents) {
      setImportError('This backup has no notes or paragraphs.')
      return
    }
    const ok = await confirm({
      title: 'Import backup',
      body: `Import ${contents}? ${MERGE_RULE}`,
      confirmLabel: 'Import',
    })
    if (!ok) return
    setBusy('import')
    try {
      toast.show(importSummaryText(await importBundle(bundle)))
    } catch {
      setImportError('The import did not finish. Your notebook was not changed.')
    } finally {
      setBusy(null)
    }
  }

  const protect = async () => {
    setBusy('protect')
    const granted = await requestPersistentStorage()
    setBusy(null)
    if (granted) {
      setStorage('protected')
      toast.show('Browser storage is protected.')
    } else {
      setProtectRefused(true)
    }
  }

  return (
    <Section id="data" title="Your data" className={props.className}>
      <p className="mt-4 text-body text-graphite">Your notes stay in this browser. Export a copy to keep them safe.</p>
      <SettingRows>
        <SettingRow
          title="Export"
          layout="stacked"
          description={
            <>
              <span>{lastExportAt === undefined ? ' ' : lastBackupText(lastExportAt)}</span>{' '}
              <span>Only the JSON backup can be imported again.</span>
            </>
          }
        >
          <div className="flex flex-wrap gap-2">
            <Button icon={Download} loading={exporting.has('json')} disabled={exporting.has('json')} onClick={() => void runExport('json')}>
              Export JSON backup
            </Button>
            <Button icon={Table2} loading={exporting.has('csv')} disabled={exporting.has('csv')} onClick={() => void runExport('csv')}>
              Export CSV
            </Button>
            <Button icon={FileText} loading={exporting.has('md')} disabled={exporting.has('md')} onClick={() => void runExport('md')}>
              Export Markdown
            </Button>
          </div>
        </SettingRow>

        <SettingRow
          title="Import a backup"
          layout="stacked"
          description={`Choose a JSON backup from this app. ${MERGE_RULE}`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            aria-label="Backup file"
            className="hidden"
            onChange={(e) => void onFile(e)}
          />
          <Button
            icon={Upload}
            loading={busy === 'import'}
            disabled={busy !== null}
            aria-describedby={importError ? 'import-error' : undefined}
            onClick={() => fileRef.current?.click()}
          >
            Import JSON backup
          </Button>
          <div role="alert">
            {importError ? (
              <p id="import-error" className="mt-3 flex items-start gap-1.5 text-small text-crimson">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" strokeWidth={ICON_STROKE} aria-hidden="true" />
                {importError}
              </p>
            ) : null}
          </div>
        </SettingRow>

        <SettingRow
          title="Storage"
          description={
            storage === 'checking'
              ? ' '
              : storage === 'protected'
                ? 'Browser storage is protected.'
                : protectRefused
                  ? `The browser did not allow it. Export a JSON backup every ${BACKUP_EVERY}.`
                  : 'The browser may clear this data when space is low.'
          }
        >
          {storage === 'unprotected' ? (
            <Button icon={ShieldCheck} loading={busy === 'protect'} disabled={busy !== null} onClick={() => void protect()}>
              Protect storage
            </Button>
          ) : null}
        </SettingRow>
      </SettingRows>
    </Section>
  )
}
