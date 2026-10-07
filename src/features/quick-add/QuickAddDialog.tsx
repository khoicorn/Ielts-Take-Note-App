import type { QuickAddOptions } from '@/app/overlays'
import { Dialog } from '@/components/ui/Dialog'

export interface QuickAddDialogProps {
  open: boolean
  options: QuickAddOptions
  onClose: () => void
}

/** Stub. The Quick Add task replaces this file. */
export function QuickAddDialog(props: QuickAddDialogProps) {
  if (!props.open) return null
  return (
    <Dialog open={props.open} onClose={props.onClose} title={props.options.title ?? 'New note'} placement="top">
      <p className="text-body text-graphite">Quick Add arrives in the next build step.</p>
    </Dialog>
  )
}
