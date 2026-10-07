import type React from 'react'
import { cn } from './cn'

/** True on macOS and iOS, where "mod" means Cmd. */
export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
  const p = nav.userAgentData?.platform ?? navigator.platform ?? ''
  return /mac|iphone|ipad|ipod/i.test(p)
}

/** "⌘" on Apple devices, "Ctrl" elsewhere. */
export function modLabel(): string {
  return isApplePlatform() ? '⌘' : 'Ctrl'
}

type KbdTone = 'default' | 'on-accent'

const TONE: Record<KbdTone, string> = {
  default: 'border-line-strong text-graphite',
  'on-accent': 'border-on-accent/35 text-on-accent/85',
}

/** A key cap. Quiet: hairline border, small sans text. Use tone "on-accent" inside indigo buttons. */
export function Kbd(props: { children: React.ReactNode; className?: string; tone?: KbdTone }): React.JSX.Element {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-xs border px-1.5',
        'font-sans text-meta leading-none not-italic',
        TONE[props.tone ?? 'default'],
        props.className,
      )}
    >
      {props.children}
    </kbd>
  )
}

/** A row of key caps from a hint like "Ctrl Enter" or "G T". */
export function KeyHint(props: { keys: string; className?: string; tone?: KbdTone }): React.JSX.Element {
  const parts = props.keys.split(/\s+/).filter(Boolean)
  return (
    <span className={cn('inline-flex items-center gap-1', props.className)} aria-hidden="true">
      {parts.map((k, i) => (
        <Kbd key={i} tone={props.tone}>
          {k}
        </Kbd>
      ))}
    </span>
  )
}
