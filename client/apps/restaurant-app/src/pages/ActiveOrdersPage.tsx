import { OrdersBoard } from '../components/orders/OrdersBoard'
import type { DashboardResponse, OrderStatus } from '../types/restaurant'

export function ActiveOrdersPage({
  dashboard,
  isUpdatingOrderId,
  onUpdateOrderStatus,
}: {
  dashboard: DashboardResponse | null
  isUpdatingOrderId: number | null
  onUpdateOrderStatus: (orderId: number, status: OrderStatus) => Promise<void>
}) {
  return (
    <OrdersBoard
      isUpdatingOrderId={isUpdatingOrderId}
      onUpdateOrderStatus={onUpdateOrderStatus}
      orders={dashboard?.orders || []}
    />
  )
}
