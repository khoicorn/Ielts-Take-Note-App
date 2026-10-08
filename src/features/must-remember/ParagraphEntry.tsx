import { ArrowRight, PenLine } from 'lucide-react'
import React, { useMemo } from 'react'
import { Link } from 'react-router'
import { useNotesFromParagraph } from '@/lib/hooks'
import { taskTypeLabel } from '@/lib/taxonomy'
import { plainText } from '@/lib/text'
import type { Paragraph } from '@/lib/types'
import { cn, WRAP } from '@/components/ui/cn'
import { ICON_STROKE } from '@/components/ui/icons'
import { plural } from '@/features/all-notes/notebook'
import { ParagraphBody } from '@/features/paragraphs/ParagraphBody'
import { findSavedPhrases, layoutBody } from '@/features/paragraphs/paragraphText'
import { RIBBON_SLOT } from './EssentialNote'

function wordCount(md: string): number {
  return plainText(md).split(/\s+/).filter(Boolean).length
}

/** A Must Remember model paragraph (mockup 17): serif title, meta line, the paragraph in serif, and a link to open it. */
export function ParagraphEntry(props: { paragraph: Paragraph; ribbon: React.ReactNode }): React.JSX.Element {
  const { paragraph: p, ribbon } = props
  const linked = useNotesFromParagraph(p.id)
  const words = wordCount(p.body)
  const meta = [taskTypeLabel(p.task_type), p.task_genre.trim(), p.topic.trim(), words > 0 ? plural(words, 'word') : ''].filter(Boolean)
  const href = `/writing/paragraphs/${p.id}`
  // Phrases already saved as notes get the dotted brass underline, as on the paragraph page (mockup 17).
  const layout = useMemo(() => layoutBody(p.body), [p.body])
  const marks = useMemo(() => findSavedPhrases(layout.text, linked ?? []), [layout.text, linked])
  return (
    <article data-entry className="group relative border-b border-line pt-7 pb-8">
      <div className="flex items-start justify-between gap-4">
        <h3 className={cn('min-w-0 font-serif text-section font-normal text-ink', WRAP)}>
          <Link to={href} className="rounded-xs decoration-1 underline-offset-[5px] hover:underline max-sm:block max-sm:-my-2 max-sm:py-2">
            {p.title.trim() || 'Untitled paragraph'}
          </Link>
        </h3>
        <span className={cn(RIBBON_SLOT, 'lg:top-6')}>{ribbon}</span>
      </div>
      {meta.length ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-graphite">
          <PenLine className="size-3.5 shrink-0 text-sage" strokeWidth={ICON_STROKE} aria-hidden="true" />
          {meta.map((m, i) => (
            <React.Fragment key={`${i}-${m}`}>
              {i > 0 ? <span aria-hidden="true">·</span> : null}
              <span>{m}</span>
            </React.Fragment>
          ))}
        </p>
      ) : null}
      {p.body.trim() ? (
        // The model paragraph reading size (plan, Task C6), so the preview reads like the paragraph page.
        <ParagraphBody
          layout={layout}
          marks={marks}
          interactive={false}
          linkState={{ from: '/must-remember' }}
          proseClassName="font-serif text-[1.1875rem] leading-[1.7] text-ink"
          className="mt-5"
        />
      ) : null}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-small text-graphite">
        <span>{linked && linked.length > 0 ? `${plural(linked.length, 'note')} from this paragraph` : ''}</span>
        <Link
          to={href}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-xs text-indigo underline-offset-4 hover:underline max-sm:min-h-11"
        >
          Open paragraph
          <ArrowRight className="size-3.5" strokeWidth={ICON_STROKE} aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}
