import { LoaderCircle } from 'lucide-react'
import React, { forwardRef } from 'react'
import { Link } from 'react-router'
import { cn } from './cn'
import { ICON_STROKE, type IconType } from './icons'
import { KeyHint } from './Kbd'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** A lucide icon or a custom symbol from icons.tsx. */
  icon?: IconType
  iconRight?: IconType
  loading?: boolean
  /** Shortcut hint shown at the end on screens 640px and wider, e.g. "N" or "Ctrl Enter". */
  kbd?: string
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-indigo text-on-accent hover:bg-indigo/90 active:bg-indigo/85',
  secondary: 'border border-line-strong bg-paper text-ink hover:bg-stone/60',
  ghost: 'text-graphite hover:bg-stone hover:text-ink',
  danger: 'border border-crimson/40 bg-paper text-crimson hover:border-crimson/70 hover:bg-crimson/[0.06]',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-small max-sm:min-h-11',
  md: 'h-10 gap-2 px-4 text-body max-sm:min-h-11',
  lg: 'h-12 gap-2.5 px-6 text-body-lg',
}

const ICON_SIZE: Record<ButtonSize, string> = {
  sm: 'size-4',
  md: 'size-[1.125rem]',
  lg: 'size-[1.125rem]',
}

/** Class names for anything that should look like a button (links, file labels). */
export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', extra?: string): string {
  return cn(
    'inline-flex shrink-0 cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-sm',
    variant === 'primary' ? 'font-medium' : 'font-[450]',
    'transition-[background-color,border-color,color,opacity] duration-150',
    'disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45',
    VARIANT[variant],
    SIZE[size],
    extra,
  )
}

function Inner(props: {
  size: ButtonSize
  variant: ButtonVariant
  icon?: IconType
  iconRight?: IconType
  loading?: boolean
  kbd?: string
  children?: React.ReactNode
}): React.JSX.Element {
  const { size, variant, icon: Icon, iconRight: IconRight, loading, kbd, children } = props
  const iconClass = cn('shrink-0', ICON_SIZE[size])
  return (
    <>
      {loading ? (
        <LoaderCircle className={cn(iconClass, 'animate-spin')} strokeWidth={ICON_STROKE} aria-hidden="true" />
      ) : Icon ? (
        <Icon className={iconClass} strokeWidth={ICON_STROKE} aria-hidden="true" />
      ) : null}
      {children}
      {IconRight ? <IconRight className={iconClass} strokeWidth={ICON_STROKE} aria-hidden="true" /> : null}
      {kbd ? (
        <span className="ml-1 hidden sm:inline-flex">
          <KeyHint keys={kbd} tone={variant === 'primary' ? 'on-accent' : 'default'} />
        </span>
      ) : null}
    </>
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  const {
    variant = 'secondary',
    size = 'md',
    icon,
    iconRight,
    loading = false,
    kbd,
    className,
    children,
    type = 'button',
    disabled,
    ...rest
  } = props
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
      {...rest}
    >
      <Inner size={size} variant={variant} icon={icon} iconRight={iconRight} loading={loading} kbd={kbd}>
        {children}
      </Inner>
    </button>
  )
})

/** A router link that looks like a Button. */
export function ButtonLink(props: Omit<ButtonProps, 'type'> & { to: string; state?: unknown }): React.JSX.Element {
  const {
    variant = 'secondary',
    size = 'md',
    icon,
    iconRight,
    loading,
    kbd,
    className,
    children,
    to,
    state,
    onClick,
    disabled,
    ...rest
  } = props
  return (
    <Link
      to={to}
      state={state}
      aria-disabled={disabled || undefined}
      className={buttonClass(variant, size, className)}
      onClick={onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}
      {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
    >
      <Inner size={size} variant={variant} icon={icon} iconRight={iconRight} loading={loading} kbd={kbd}>
        {children}
      </Inner>
    </Link>
  )
}
