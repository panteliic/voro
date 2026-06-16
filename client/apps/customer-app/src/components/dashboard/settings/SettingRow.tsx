import { Switch } from '@voro/ui'
import type { ReactNode } from 'react'

type SettingRowProps = {
  action?: ReactNode
  label: string
  toggle?: boolean
  value: string
}

export function SettingRow({ action, label, toggle = false, value }: SettingRowProps) {
  return (
    <div className="grid gap-3 rounded-voro-lg border border-line bg-background px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <p className="text-sm font-bold text-content">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{value}</p>
      </div>
      {toggle ? <Switch defaultChecked /> : action}
    </div>
  )
}
