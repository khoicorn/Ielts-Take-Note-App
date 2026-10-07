/// <reference types="vite-plugin-pwa/react" />
import { X } from 'lucide-react'
import type React from 'react'
import { createPortal } from 'react-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'

/** When a new service worker is waiting: "A new version is ready." [Reload]. */
export function UpdatePrompt(): React.JSX.Element | null {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null
  return createPortal(
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] z-[70] flex justify-center px-4 sm:top-4"
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-md border border-line bg-paper py-1.5 pr-1.5 pl-4 text-small text-ink shadow-float">
        <span>A new version is ready.</span>
        <Button size="sm" variant="primary" onClick={() => void updateServiceWorker(true)}>
          Reload
        </Button>
        <IconButton icon={X} label="Not now" size="sm" onClick={() => setNeedRefresh(false)} />
      </div>
    </div>,
    document.body,
  )
}
