import type { ComponentType } from 'react'

export type DashboardView =
  | 'overview'
  | 'search'
  | 'cart'
  | 'favorites'
  | 'orders'
  | 'messages'
  | 'notifications'
  | 'settings'
  | 'restaurant'
  | 'checkout'
export type ActiveSettingsSection = SettingsSection | null
export type SettingsSection =
  | 'account'
  | 'theme'
  | 'delivery'
  | 'payments'
  | 'notifications'
  | 'security'
  | 'support'

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
