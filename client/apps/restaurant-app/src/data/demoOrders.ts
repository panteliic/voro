type DemoRestaurantOrder = {
  id: string
  customer: string
  status: 'New' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled'
  eta: string
  total: string
  items: string[]
  createdAt: string
  completedAt?: string
  pickupCode: string
  driver?: string
  address: string
}

export const demoOrders: DemoRestaurantOrder[] = [
  {
    id: 'A-104',
    customer: 'Milica P.',
    status: 'New',
    eta: '12 min',
    total: '2,180 RSD',
    items: ['Capricciosa x1', 'Coca-Cola x2'],
    createdAt: '2026-07-05T12:10:00',
    pickupCode: '104',
    address: 'Bulevar kralja Aleksandra 84',
  },
  {
    id: 'A-103',
    customer: 'Nikola R.',
    status: 'Preparing',
    eta: '7 min',
    total: '1,450 RSD',
    items: ['Burger classic x1', 'Fries x1'],
    createdAt: '2026-07-05T11:55:00',
    pickupCode: '103',
    driver: 'Marko D.',
    address: 'Jurija Gagarina 22',
  },
  {
    id: 'A-102',
    customer: 'Ana S.',
    status: 'Ready',
    eta: 'Pickup now',
    total: '3,020 RSD',
    items: ['Pasta carbonara x2', 'Tiramisu x1'],
    createdAt: '2026-07-05T11:42:00',
    pickupCode: '102',
    driver: 'Ivan K.',
    address: 'Knez Mihailova 12',
  },
  {
    id: 'A-101',
    customer: 'Stefan M.',
    status: 'Delivered',
    eta: 'Done',
    total: '1,870 RSD',
    items: ['Chicken wrap x2', 'Ayran x1'],
    createdAt: '2026-07-05T10:18:00',
    completedAt: '2026-07-05T10:52:00',
    pickupCode: '101',
    driver: 'Jovan P.',
    address: 'Cara Dusana 19',
  },
  {
    id: 'A-100',
    customer: 'Jelena T.',
    status: 'Delivered',
    eta: 'Done',
    total: '2,640 RSD',
    items: ['Sushi set x1', 'Miso soup x2'],
    createdAt: '2026-07-04T19:35:00',
    completedAt: '2026-07-04T20:04:00',
    pickupCode: '100',
    driver: 'Milan S.',
    address: 'Njegoseva 31',
  },
  {
    id: 'A-099',
    customer: 'Luka B.',
    status: 'Cancelled',
    eta: 'Cancelled',
    total: '920 RSD',
    items: ['Greek salad x1'],
    createdAt: '2026-07-04T18:12:00',
    completedAt: '2026-07-04T18:20:00',
    pickupCode: '099',
    address: 'Vojvode Stepe 118',
  },
  {
    id: 'A-098',
    customer: 'Tamara V.',
    status: 'Delivered',
    eta: 'Done',
    total: '3,420 RSD',
    items: ['Mixed grill x1', 'Shopska salad x2'],
    createdAt: '2026-07-03T14:05:00',
    completedAt: '2026-07-03T14:39:00',
    pickupCode: '098',
    driver: 'Petar N.',
    address: 'Gospodar Jevremova 7',
  },
]
