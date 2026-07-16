import type { ComponentType } from 'react'

export type DashboardView = 'overview' | 'search' | 'orders' | 'settings' | 'restaurant'
export type ActiveSettingsSection = SettingsSection | null
export type SettingsSection =
  | 'account'
  | 'theme'
  | 'delivery'
  | 'payments'
  | 'notifications'
  | 'security'

export type DashboardNavItem = {
  id: DashboardView
  label: string
  path: string
  icon: ComponentType<{ className?: string }>
}

export type SettingsNavItem = {
  id: SettingsSection
  label: string
  description: string
  path: string
  icon: ComponentType<{ className?: string }>
}
