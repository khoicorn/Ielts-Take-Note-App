import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'
import { TextInput } from './Field'

export interface ConfirmOptions {
  title: string
  body?: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  /** The user must type this word (e.g. DELETE) before the confirm button works. */
  requireText?: string
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider(props: { children: React.ReactNode }): React.JSX.Element {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const resolver = useRef<((v: boolean) => void) | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const confirm = useCallback<ConfirmFn>((o) => {
    resolver.current?.(false)
    setOpts(o)
    setTyped('')
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const finish = (v: boolean) => {
    resolver.current?.(v)
    resolver.current = null
    setOpen(false)
  }

  const danger = opts?.tone === 'danger'
  const needs = opts?.requireText
  const ready = !needs || typed.trim() === needs
  const initialFocus = needs ? inputRef : danger ? cancelRef : confirmRef

  return (
    <ConfirmContext.Provider value={confirm}>
      {props.children}
      {opts ? (
        <Dialog
          open={open}
          onClose={() => finish(false)}
          title={opts.title}
          size="sm"
          initialFocusRef={initialFocus}
          footer={
            <>
              <Button ref={cancelRef} variant="ghost" onClick={() => finish(false)}>
                {opts.cancelLabel ?? 'Cancel'}
              </Button>
              <Button
                ref={confirmRef}
                variant={danger ? 'danger' : 'primary'}
                disabled={!ready}
                onClick={() => finish(true)}
              >
                {opts.confirmLabel}
              </Button>
            </>
          }
        >
          {opts.body ? <p className="text-body text-graphite">{opts.body}</p> : null}
          {needs ? (
            <div className={opts.body ? 'mt-4' : undefined}>
              <label htmlFor="confirm-require-text" className="mb-1.5 block text-small text-graphite">
                Type {needs} to confirm.
              </label>
              <TextInput
                ref={inputRef}
                id="confirm-require-text"
                value={typed}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && ready) {
                    e.preventDefault()
                    finish(true)
                  }
                }}
              />
            </div>
          ) : null}
        </Dialog>
      ) : null}
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>.')
  return ctx
}
