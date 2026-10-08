import { Plus } from 'lucide-react'
import type React from 'react'
import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { useQuickAdd } from '@/app/overlays'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Section } from '@/components/ui/Section'
import { UnderlineTabs } from '@/components/ui/Tabs'
import { useErrorTypes, useNotes } from '@/lib/hooks'
import { buildLedger } from '@/lib/mistakes'
import { MODE_LABELS } from '@/lib/taxonomy'
import type { Mode } from '@/lib/types'
import type { IndexItem } from './LedgerIndex'
import { LedgerIndex, LedgerIndexInline } from './LedgerIndex'
import { splitLedger, plural } from './ledgerView'
import type { RepeatedGroup } from './ledgerView'
import { MoreOnce, OnceList } from './OnceRows'
import { PatternEntry } from './PatternEntry'
import { NoteRow } from '@/components/notes/NoteRow'

const NOT_YET_REPEATED_ID = 'not-yet-repeated'

function modeFrom(value: string | null): Mode | undefined {
  return value === 'speaking' || value === 'writing' ? value : undefined
}

function groupCount(g: RepeatedGroup): string {
  return `Seen ${plural(g.seen, 'time')} · ${plural(g.patternCount, 'pattern')}`
}

function LedgerGroupSection(props: { group: RepeatedGroup; now: Date; linkFrom: string }): React.JSX.Element {
  const { group, now, linkFrom } = props
  const looseIds = group.loose.map((n) => n.id)
  return (
    <Section
      id={group.slug}
      title={group.error_type}
      action={<span className="text-graphite tabular-nums">{groupCount(group)}</span>}
    >
      {group.repeated.map((p) => (
        <PatternEntry key={p.key} pattern={p} now={now} linkFrom={linkFrom} />
      ))}
      {group.once.length > 0 ? <MoreOnce rows={group.once} linkFrom={linkFrom} /> : null}
      {group.loose.length > 0 ? (
        <div className="pt-5">
          <p className="text-small text-graphite">Notes without a pattern</p>
          {group.loose.map((n) => (
            <NoteRow key={n.id} note={n} view="compact" to={`/notes/${n.id}`} linkState={{ ids: looseIds, from: linkFrom }} />
          ))}
        </div>
      ) : null}
    </Section>
  )
}

/**
 * My Mistakes, the Error Ledger (brief §28). Repeated habits grouped by error type, most frequent first,
 * then habits seen only once. Mockup 15.
 */
export function MistakesScreen(): React.JSX.Element {
  const [params] = useSearchParams()
  const location = useLocation()
  const quickAdd = useQuickAdd()
  const mode = modeFrom(params.get('mode'))
  const notes = useNotes(mode ? { mode } : undefined)
  const errorTypes = useErrorTypes()
  const now = useMemo(() => new Date(), [notes])
  const view = useMemo(() => (notes ? splitLedger(buildLedger(notes, errorTypes)) : undefined), [notes, errorTypes])
  const linkFrom = location.pathname + location.search

  // Links like /mistakes#prepositions (from Today) arrive before the ledger has loaded. Scroll once it has.
  const scrolledFor = useRef('')
  useEffect(() => {
    const hash = decodeURIComponent(location.hash.replace(/^#/, ''))
    if (!view || !hash || scrolledFor.current === location.key + hash) return
    const el = document.getElementById(hash)
    if (!el) return
    scrolledFor.current = location.key + hash
    el.scrollIntoView?.({ block: 'start' })
  }, [view, location.hash, location.key])

  const tabs = (
    <UnderlineTabs
      aria-label="Mode"
      value={mode ?? 'all'}
      items={[
        { value: 'all', label: 'All', to: '/mistakes' },
        { value: 'speaking', label: MODE_LABELS.speaking, to: '/mistakes?mode=speaking' },
        { value: 'writing', label: MODE_LABELS.writing, to: '/mistakes?mode=writing' },
      ]}
    />
  )

  const repeatedIndex: IndexItem[] = view?.repeated.map((g) => ({ slug: g.slug, label: g.error_type, count: g.seen })) ?? []
  const onceIndex: IndexItem[] = view?.once.map((g) => ({ slug: g.slug, label: g.error_type, count: g.rows.length })) ?? []
  const empty = view !== undefined && view.repeated.length === 0 && view.once.length === 0

  return (
    <div className="mx-auto max-w-[1040px]">
      <PageHeader
        eyebrow="Error Ledger"
        mark
        title="My Mistakes"
        description="Your repeated habits, grouped. Fix the most frequent first."
      >
        {tabs}
      </PageHeader>

      {empty ? (
        <EmptyState
          decoration="constellation"
          title={mode ? `No ${MODE_LABELS[mode]} mistakes logged yet` : 'No mistakes logged yet'}
          body="In Quick Add, open More details and choose an Error type. Repeated habits appear here."
          action={
            <Button variant="secondary" icon={Plus} onClick={() => quickAdd.open(mode ? { mode } : undefined)}>
              Add a note
            </Button>
          }
        />
      ) : view ? (
        <div className="lg:grid lg:grid-cols-[184px_minmax(0,1fr)] lg:items-start lg:gap-14">
          <div className="hidden lg:block lg:sticky lg:top-8">
            <LedgerIndex repeated={repeatedIndex} once={onceIndex} />
          </div>
          <div className="lg:hidden">
            <LedgerIndexInline repeated={repeatedIndex} once={onceIndex} />
          </div>

          <div className="min-w-0 max-w-[760px] lg:max-w-none">
            {view.repeated.map((g, i) => (
              <div key={g.slug} className={i > 0 ? 'mt-14' : undefined}>
                <LedgerGroupSection group={g} now={now} linkFrom={linkFrom} />
              </div>
            ))}
            {view.once.length > 0 ? (
              <div className={view.repeated.length > 0 ? 'mt-14' : undefined}>
                <Section
                  id={NOT_YET_REPEATED_ID}
                  title="Not yet repeated"
                  action={<span className="hidden text-graphite sm:inline">Seen once. Review them before they become habits.</span>}
                >
                  <p className="pt-2 text-small text-graphite sm:hidden">Seen once. Review them before they become habits.</p>
                  <OnceList groups={view.once} linkFrom={linkFrom} />
                </Section>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
