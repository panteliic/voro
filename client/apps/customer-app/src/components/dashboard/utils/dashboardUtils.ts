export function getInitials(name?: string | null) {
  if (!name) {
    return 'V'
  }

  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

import { settingsNavItems } from '../data/dashboardData'
import type { ActiveSettingsSection, DashboardView } from '../types'

export function getDashboardView(pathname: string): DashboardView {
  if (pathname.startsWith('/search')) {
    return 'search'
  }

  if (pathname.startsWith('/orders')) {
    return 'orders'
  }

  if (pathname.startsWith('/settings')) {
    return 'settings'
  }

  return 'overview'
}

export function getSettingsSection(pathname: string): ActiveSettingsSection {
  const section = pathname.split('/')[2]
  const matched = settingsNavItems.find((item) => item.id === section)

  return matched?.id ?? null
}

export function getDashboardTitle(view: DashboardView) {
  if (view === 'overview') {
    return 'Dashboard'
  }

  if (view === 'orders') {
    return 'Orders'
  }

  if (view === 'search') {
    return 'Search'
  }

  return 'Settings'
}
