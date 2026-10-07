import type React from 'react'

/** Text for screen readers only. */
export function VisuallyHidden(props: { children: React.ReactNode }): React.JSX.Element {
  return <span className="sr-only">{props.children}</span>
}
