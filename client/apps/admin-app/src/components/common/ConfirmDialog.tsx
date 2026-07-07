import type { ReactNode } from 'react'
import { Button } from '@voro/ui'

type ConfirmDialogProps = {
  children: ReactNode
  message: string
  onConfirm: () => void
  disabled?: boolean
}

export function ConfirmDialog({
  children,
  message,
  onConfirm,
  disabled = false,
}: ConfirmDialogProps) {
  return (
    <Button
      disabled={disabled}
      onClick={() => {
        if (window.confirm(message)) {
          onConfirm()
        }
      }}
      size="sm"
      type="button"
      variant="outline"
    >
      {children}
    </Button>
  )
}
