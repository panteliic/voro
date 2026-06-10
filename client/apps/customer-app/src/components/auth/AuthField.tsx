import { Input } from '@voro/ui'
import type { ComponentType, InputHTMLAttributes } from 'react'

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  icon: ComponentType<{ className?: string }>
  label: string
}

export function AuthField({ className = '', icon: Icon, label, ...props }: AuthFieldProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-content">
      {label}
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className={`w-full pl-9 ${className}`} {...props} />
      </div>
    </label>
  )
}
