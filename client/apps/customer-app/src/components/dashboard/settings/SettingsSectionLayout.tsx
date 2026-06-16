import { Separator } from '@voro/ui'
import type { ComponentType, ReactNode } from 'react'

type SettingsSectionLayoutProps = {
  children: ReactNode
  description: string
  icon: ComponentType<{ className?: string }>
  title: string
}

export function SettingsSectionLayout({
  children,
  description,
  icon: Icon,
  title,
}: SettingsSectionLayoutProps) {
  return (
    <div>
      <div className="hidden items-start gap-3 lg:flex">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-voro-lg bg-accent text-action">
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-content">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <Separator className="my-5 hidden lg:block" />
      <div className="grid gap-4">{children}</div>
    </div>
  )
}
