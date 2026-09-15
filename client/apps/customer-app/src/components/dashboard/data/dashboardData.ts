import {
  Bell,
  Heart,
  HomeIcon,
  Moon,
  CreditCard,
  MessageCircle,
  ReceiptText,
  Search,
  ShoppingBasket,
  ShieldCheck,
  CircleHelp,
  Truck,
  UserRound,
} from 'lucide-react'
import type { DashboardNavItem, SettingsNavItem } from '../types'

export const dashboardNavItems: DashboardNavItem[] = [
  { id: 'overview', label: 'Home', path: '/', icon: HomeIcon },
  { id: 'search', label: 'Search', path: '/search', icon: Search },
  { id: 'cart', label: 'Cart', path: '/cart', icon: ShoppingBasket },
  { id: 'favorites', label: 'Favorites', path: '/favorites', icon: Heart },
  { id: 'orders', label: 'Orders', path: '/orders', icon: ReceiptText },
  { id: 'messages', label: 'Messages', path: '/messages', icon: MessageCircle },
  { id: 'notifications', label: 'Notifications', path: '/notifications', icon: Bell },
]

export const settingsNavItems: SettingsNavItem[] = [
  {
    id: 'account',
    label: 'Account',
    description: 'Name, email, phone, and customer profile details.',
    path: '/settings/account',
    icon: UserRound,
  },
  {
    id: 'theme',
    label: 'Theme',
    description: 'System, light, and dark display preferences.',
    path: '/settings/theme',
    icon: Moon,
  },
  {
    id: 'delivery',
    label: 'Delivery',
    description: 'Address, handoff, substitutions, and delivery defaults.',
    path: '/settings/delivery',
    icon: Truck,
  },
  {
    id: 'payments',
    label: 'Payments',
    description: 'Cards, cash options, defaults, and billing labels.',
    path: '/settings/payments',
    icon: CreditCard,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Order updates, promos, receipts, and channel preferences.',
    path: '/settings/notifications',
    icon: Bell,
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Password, sessions, privacy, and account protection.',
    path: '/settings/security',
    icon: ShieldCheck,
  },
  {
    id: 'support',
    label: 'Support',
    description: 'Contact support about an order, payment, or your account.',
    path: '/settings/support',
    icon: CircleHelp,
  },
]

export const recentOrders = [
  { id: 'VR-1042', restaurant: 'Voro Grill', status: 'Arriving in 12 min', total: '$24.80' },
  { id: 'VR-1039', restaurant: 'Pasta Corner', status: 'Delivered yesterday', total: '$18.50' },
  { id: 'VR-1036', restaurant: 'Green Bowl', status: 'Delivered Jun 14', total: '$16.20' },
]
