import React from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Kbd, modLabel } from '@/components/ui/Kbd'

export interface ShortcutRow {
  action: string
  /** Each inner array is one way to press it; words inside are separate keys. "or" goes between ways. */
  keys: string[][]
}

export interface ShortcutGroup {
  title: string
  rows: ShortcutRow[]
}

/** The table from design §9. Settings shows the same list. */
export function shortcutGroups(): ShortcutGroup[] {
  const mod = modLabel()
  return [
    {
      title: 'Anywhere',
      rows: [
        { action: 'New note', keys: [['N']] },
        { action: 'Search', keys: [[mod, 'K'], ['/']] },
        { action: 'Keyboard shortcuts', keys: [['?']] },
        { action: 'Save in Quick Add or edit mode', keys: [[mod, 'Enter']] },
        { action: 'Close a window or leave Review', keys: [['Esc']] },
      ],
    },
    {
      title: 'Review',
      rows: [
        { action: 'Reveal', keys: [['Space'], ['Enter']] },
        { action: 'Again · Hard · Good · Easy', keys: [['1', '2', '3', '4']] },
      ],
    },
    {
      title: 'Lists',
      rows: [
        { action: 'Move through rows', keys: [['↑', '↓'], ['J', 'K']] },
        { action: 'Open the row', keys: [['Enter']] },
      ],
    },
    {
      title: 'Go to',
      rows: [
        { action: 'Today', keys: [['G', 'T']] },
        { action: 'Review', keys: [['G', 'R']] },
        { action: 'Speaking', keys: [['G', 'S']] },
        { action: 'Writing', keys: [['G', 'W']] },
        { action: 'Mistakes', keys: [['G', 'M']] },
        { action: 'Must Remember', keys: [['G', 'F']] },
        { action: 'All Notes', keys: [['G', 'A']] },
        { action: 'Calendar', keys: [['G', 'C']] },
      ],
    },
  ]
}

export function ShortcutKeys(props: { keys: string[][] }): React.JSX.Element {
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
      {props.keys.map((way, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <span className="px-0.5 text-meta text-graphite">or</span> : null}
          <span className="inline-flex items-center gap-1">
            {way.map((k) => (
              <Kbd key={k}>{k}</Kbd>
            ))}
          </span>
        </React.Fragment>
      ))}
    </span>
  )
}

/** The shortcut list as hairline-separated rows. */
export function ShortcutTable(props: { className?: string }): React.JSX.Element {
  return (
    <div className={props.className}>
      <div className="gap-x-10 sm:columns-2">
        {shortcutGroups().map((g) => (
          <section key={g.title} aria-label={g.title} className="mb-7 break-inside-avoid">
            <h3 className="mb-1 text-meta font-medium tracking-[0.08em] text-graphite uppercase">{g.title}</h3>
            <dl>
              {g.rows.map((r) => (
                <div key={r.action} className="flex items-center justify-between gap-4 border-b border-line py-2">
                  <dt className="text-small text-ink">{r.action}</dt>
                  <dd>
                    <ShortcutKeys keys={r.keys} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <p className="mt-1 text-meta text-graphite">
        Single-letter keys do nothing while you type in a field. {modLabel()} N also opens a new note in the installed app.
      </p>
    </div>
  )
}

export function ShortcutsDialog(props: { open: boolean; onClose: () => void }): React.JSX.Element | null {
  return (
    <Dialog open={props.open} onClose={props.onClose} title="Keyboard shortcuts" size="lg">
      <ShortcutTable />
    </Dialog>
  )
}
