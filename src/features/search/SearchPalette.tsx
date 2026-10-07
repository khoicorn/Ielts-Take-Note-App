import { Dialog } from '@/components/ui/Dialog'

export interface SearchPaletteProps {
  open: boolean
  initialQuery: string
  onClose: () => void
}

/** Stub. The Search task replaces this file. */
export function SearchPalette(props: SearchPaletteProps) {
  if (!props.open) return null
  return (
    <Dialog open={props.open} onClose={props.onClose} title="Search notes" size="lg" placement="top">
      <p className="text-body text-graphite">Search arrives in the next build step.</p>
    </Dialog>
  )
}
