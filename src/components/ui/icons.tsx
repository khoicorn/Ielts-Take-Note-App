import type { LucideIcon } from 'lucide-react'
import type React from 'react'

/**
 * Thin-line custom symbols (brief §15). Same 24px grid and stroke style as lucide,
 * so they sit next to lucide icons without looking different.
 */
export type SvgIcon = (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element

/** Any icon a control accepts: a lucide icon or one of the custom symbols below. */
export type IconType = LucideIcon | SvgIcon

/** Stroke width for every icon in the app. */
export const ICON_STROKE = 1.5

function base(props: React.SVGProps<SVGSVGElement>): React.SVGProps<SVGSVGElement> {
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: ICON_STROKE,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: false,
    ...props,
  }
}

/** Four-point star with curved sides. Pass fill="currentColor" for the filled form. */
export function SparkIcon(props: React.SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <svg {...base(props)}>
      <path d="M12 2.75C12.45 8.1 15.9 11.55 21.25 12C15.9 12.45 12.45 15.9 12 21.25C11.55 15.9 8.1 12.45 2.75 12C8.1 11.55 11.55 8.1 12 2.75Z" />
    </svg>
  )
}

/**
 * A slim book ribbon: the Must Remember mark (owner refinement 2026-10-08, replaces the ✦ of brief §29
 * so it never reads as the ✦ Mastered mark). Pass fill="currentColor" for the filled form.
 */
export function RibbonIcon(props: React.SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <svg {...base(props)}>
      <path d="M8 2.75H16V21.25L12 17.9L8 21.25Z" />
    </svg>
  )
}

export function CrescentIcon(props: React.SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <svg {...base(props)}>
      <path d="M14.5 3.2A9 9 0 1 0 20.8 15.6A7.2 7.2 0 0 1 14.5 3.2Z" />
    </svg>
  )
}

export function QuillIcon(props: React.SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <svg {...base(props)}>
      <path d="M20.5 3.5C14 4.2 9.2 8.6 7.6 15.4C13.6 14.4 18.6 10 20.5 3.5Z" />
      <path d="M3.5 20.5L14.5 9.5" />
      <path d="M11 13H14.3" />
      <path d="M13.4 10.6H16.6" />
    </svg>
  )
}

export function ConstellationIcon(props: React.SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <svg {...base(props)}>
      <path d="M5.6 16.1L7.9 12.4M10.8 11.4L12.6 12.3M15.3 11.4L17.7 7.7M15.6 14.6L17.8 16.9" strokeWidth="1.2" />
      <circle cx="4.5" cy="18" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="9" cy="10.6" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="14" cy="13.2" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="5.6" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19.2" cy="18.4" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

/**
 * The app mark: a thin crescent with a small gold spark. Used by the wordmark.
 * The crescent takes the current text color; the spark is always gold.
 */
export function BrandMark(props: React.SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <svg {...base(props)}>
      <path d="M13.2 4.1A8.4 8.4 0 1 0 19.9 15.4A6.8 6.8 0 0 1 13.2 4.1Z" />
      <path
        className="text-gold"
        fill="currentColor"
        stroke="none"
        d="M18.6 1.4C18.86 4.3 20.3 5.74 23.2 6C20.3 6.26 18.86 7.7 18.6 10.6C18.34 7.7 16.9 6.26 14 6C16.9 5.74 18.34 4.3 18.6 1.4Z"
      />
    </svg>
  )
}
