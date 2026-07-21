import { Navigate, Route, Routes } from 'react-router-dom'
import { AppHeader } from '../components/layout/AppHeader'
import { RestaurantSidebar } from '../components/layout/RestaurantSidebar'
import { ActiveOrdersPage } from './ActiveOrdersPage'
import { DashboardOverviewPage } from './DashboardOverviewPage'
import { MenuPage } from './MenuPage'
import { OrderCalendarPage } from './OrderCalendarPage'
import { OrderDayPage } from './OrderDayPage'
import { OperationsPage } from './OperationsPage'
import type { AuthUser } from '../types/auth'
import type {
  CategoryForm,
  DashboardResponse,
  OrderStatus,
  ProductForm,
  RestaurantOperations,
} from '../types/restaurant'

type DashboardPageProps = {
  dashboard: DashboardResponse | null
  user: AuthUser
  status: string
  isLoading: boolean
  isSavingCategory: boolean
  isSavingProduct: boolean
  isSavingOperations: boolean
  isUpdatingOrderId: number | null
  onRefresh: () => void
  onLogout: () => void
  onCreateCategory: (payload: CategoryForm) => Promise<void>
  onSaveProduct: (payload: ProductForm, editingProductId: number | null) => Promise<void>
  onSaveOperations: (payload: RestaurantOperations) => Promise<void>
  onUpdateOrderStatus: (orderId: number, status: OrderStatus) => Promise<void>
}

export function DashboardPage({
  dashboard,
  isLoading,
  isSavingCategory,
  isSavingProduct,
  isSavingOperations,
  isUpdatingOrderId,
  onCreateCategory,
  onLogout,
  onRefresh,
  onSaveProduct,
  onSaveOperations,
  onUpdateOrderStatus,
  status,
  user,
}: DashboardPageProps) {
  return (
    <main className="min-h-screen bg-background text-content">
      <AppHeader
        dashboard={dashboard}
        isLoading={isLoading}
        onLogout={onLogout}
        onRefresh={onRefresh}
        user={user}
      />

      <div className="mx-auto grid max-w-none gap-5 px-4 pb-[calc(4rem+max(env(safe-area-inset-bottom),0.5rem))] pt-5 lg:grid-cols-[16rem_1fr] lg:py-5">
        <RestaurantSidebar />

        <section className="grid gap-5">
          {status ? (
            <p className="rounded-voro-lg border border-line bg-card px-4 py-3 text-sm font-medium">
              {status}
            </p>
          ) : null}

          <Routes>
            <Route
              element={
                <ActiveOrdersPage
                  dashboard={dashboard}
                  isUpdatingOrderId={isUpdatingOrderId}
                  onUpdateOrderStatus={onUpdateOrderStatus}
                />
              }
              path="/"
            />
            <Route
              element={<DashboardOverviewPage dashboard={dashboard} />}
              path="/dashboard"
            />
            <Route element={<OrderCalendarPage />} path="/calendar" />
            <Route element={<OrderDayPage />} path="/calendar/:day" />
            <Route element={<OperationsPage dashboard={dashboard} isSaving={isSavingOperations} onSave={onSaveOperations} />} path="/operations" />
            <Route
              element={
                <MenuPage
                  dashboard={dashboard}
                  isSavingCategory={isSavingCategory}
                  isSavingProduct={isSavingProduct}
                  onCreateCategory={onCreateCategory}
                  onSaveProduct={onSaveProduct}
                />
              }
              path="/menu"
            />
            <Route element={<Navigate replace to="/" />} path="*" />
          </Routes>
        </section>
      </div>
    </main>
  )
}
