import type React from 'react'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

export function NotFound(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-[760px]">
      <EmptyState
        decoration="moon"
        title="This page does not exist."
        body="Check the address, or go back to Today."
        action={
          <ButtonLink to="/" variant="secondary">
            Back to Today
          </ButtonLink>
        }
      />
    </div>
  )
}
