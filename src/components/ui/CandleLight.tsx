import type React from 'react'
import { cn } from './cn'

/** Far corners darken a little (6% warm brown by day, 30% black by night). The center stays clear. */
const VIGNETTE = 'radial-gradient(ellipse 130% 110% at 55% 35%, transparent 62%, var(--vignette) 100%)'

/** One very large, very soft warm light. It fades to nothing, so it only lightens (day) or warms (night). */
const GLOW = 'radial-gradient(closest-side, var(--glow), color-mix(in srgb, var(--glow) 45%, transparent) 55%, transparent)'

/**
 * Candle glow and vignette (design v1.2 rule 1): one fixed, pointer-events-none layer behind all content.
 * Static: it never moves, breathes or flickers.
 *
 * It sits at z-index -10, so the parent must be a stacking context (`isolate`) with the page color as its own
 * background. Then the layer paints above that background and below everything else, and dialogs, menus and
 * toasts (portaled to <body>) always cover it.
 *
 * `glowClassName` places the glow: by default it is centered on the viewport, its center about 310px from the
 * top. Pass `left-*` / `top-*` classes to center it on a reading column (AppShell) or the review answer.
 */
export function CandleLight(props: { glowClassName?: string; className?: string }): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      data-candle-light=""
      className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', props.className)}
      style={{ backgroundImage: VIGNETTE }}
    >
      <div
        className={cn('absolute h-[900px] w-[1180px] -translate-x-1/2', props.glowClassName ?? 'top-[-140px] left-1/2')}
        style={{ backgroundImage: GLOW }}
      />
    </div>
  )
}
