import React, { forwardRef } from 'react'
import { cn } from './cn'
import { ICON_STROKE, type IconType } from './icons'
import { Tooltip } from './Tooltip'

export type IconButtonProps = {
  icon: IconType
  /** Accessible name. Also the tooltip text. */
  label: string
  size?: 'sm' | 'md'
  /** Toggled-on look (ink color, stone background). */
  active?: boolean
  tooltip?: boolean
  tooltipSide?: 'right' | 'top' | 'bottom'
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(props, ref) {
  const {
    icon: Icon,
    label,
    size = 'md',
    active = false,
    tooltip = false,
    tooltipSide = 'top',
    className,
    type = 'button',
    ...rest
  } = props
  const button = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-sm transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-45',
        size === 'sm' ? 'size-8' : 'size-10',
        'max-sm:min-h-11 max-sm:min-w-11',
        active ? 'bg-stone text-ink' : 'text-graphite hover:bg-stone hover:text-ink',
        className,
      )}
      {...rest}
    >
      <Icon className={size === 'sm' ? 'size-4' : 'size-[1.125rem]'} strokeWidth={ICON_STROKE} aria-hidden="true" />
    </button>
  )
  return tooltip ? (
    <Tooltip label={label} side={tooltipSide}>
      {button}
    </Tooltip>
  ) : (
    button
  )
})
