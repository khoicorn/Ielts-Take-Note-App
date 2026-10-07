import { useLayoutEffect, useState } from 'react'

export interface FloatingPos {
  top: number
  left: number
  width: number
  /** True when there was no room below, so the layer opens above the anchor. */
  above: boolean
  maxHeight: number
}

const MARGIN = 8

/**
 * Fixed-position coordinates for a layer attached to an anchor element.
 * Floating layers render in a portal so scroll containers (dialog bodies) never clip them.
 */
export function useFloatingPosition(
  anchor: React.RefObject<HTMLElement | null>,
  open: boolean,
  opts?: { align?: 'start' | 'end'; gap?: number; preferredHeight?: number; layer?: React.RefObject<HTMLElement | null> },
): FloatingPos | null {
  const [pos, setPos] = useState<FloatingPos | null>(null)
  const align = opts?.align ?? 'start'
  const gap = opts?.gap ?? 4
  const preferred = opts?.preferredHeight ?? 280
  const layer = opts?.layer

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const update = () => {
      const el = anchor.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const vw = window.innerWidth
      const below = vh - r.bottom - gap - MARGIN
      const aboveSpace = r.top - gap - MARGIN
      const layerH = layer?.current?.offsetHeight ?? preferred
      const above = below < Math.min(layerH, preferred) && aboveSpace > below
      const maxHeight = Math.max(120, Math.min(preferred, above ? aboveSpace : below))
      const layerW = layer?.current?.offsetWidth ?? r.width
      let left = align === 'end' ? r.right - layerW : r.left
      left = Math.max(MARGIN, Math.min(left, vw - layerW - MARGIN))
      const top = above ? r.top - gap - Math.min(layerH, maxHeight) : r.bottom + gap
      setPos({ top, left, width: r.width, above, maxHeight })
    }
    update()
    // Measure again once the layer has rendered at its real size.
    const raf = requestAnimationFrame(update)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, anchor, align, gap, preferred, layer])

  return pos
}
