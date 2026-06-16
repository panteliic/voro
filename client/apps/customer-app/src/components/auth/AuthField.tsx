import { Input } from '@voro/ui'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import type { ComponentType, InputHTMLAttributes } from 'react'
import { useI18n } from '../../i18n/i18n'

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  icon: ComponentType<{ className?: string }>
  label: string
}

export function AuthField({ className = '', icon: Icon, label, type, ...props }: AuthFieldProps) {
  const { t } = useI18n()
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && isPasswordVisible ? 'text' : type
  const ToggleIcon = isPasswordVisible ? EyeOff : Eye

  return (
    <label className="grid gap-2 text-sm font-medium text-content">
      {label}
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className={`w-full pl-9 ${isPassword ? 'pr-10' : ''} ${className}`}
          type={inputType}
          {...props}
        />
        {isPassword ? (
          <button
            aria-label={t(isPasswordVisible ? 'common.hidePassword' : 'common.showPassword')}
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-voro-md text-muted-foreground transition hover:bg-accent hover:text-content"
            onClick={(event) => {
              event.preventDefault()
              setIsPasswordVisible((value) => !value)
            }}
            type="button"
          >
            <ToggleIcon className="size-4" />
          </button>
        ) : null}
      </div>
    </label>
  )
}
