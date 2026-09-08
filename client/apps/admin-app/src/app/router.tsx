import { createBrowserRouter, Outlet } from 'react-router-dom'
import { AdminLayout } from '../components/layout/AdminLayout'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { CreateDriverPage } from '../pages/CreateDriverPage'
import { CreateRestaurantPage } from '../pages/CreateRestaurantPage'
import { DashboardPage } from '../pages/DashboardPage'
import { DriverAnalyticsPage } from '../pages/DriverAnalyticsPage'
import { DriversPage } from '../pages/DriversPage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { OrderDetailsPage } from '../pages/OrderDetailsPage'
import { OrdersPage } from '../pages/OrdersPage'
import { OperationsPage } from '../pages/OperationsPage'
import { RestaurantsPage } from '../pages/RestaurantsPage'
import { RestaurantAnalyticsPage } from '../pages/RestaurantAnalyticsPage'
import { RouteErrorPage } from '../pages/RouteErrorPage'
import { SettingsPage } from '../pages/SettingsPage'
import { UsersPage } from '../pages/UsersPage'

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { path: '/', element: <DashboardPage /> },
              { path: '/users', element: <UsersPage /> },
              { path: '/restaurants', element: <RestaurantsPage /> },
              { path: '/restaurants/new', element: <CreateRestaurantPage /> },
              { path: '/restaurants/:restaurantId', element: <RestaurantAnalyticsPage /> },
              { path: '/drivers', element: <DriversPage /> },
              { path: '/drivers/new', element: <CreateDriverPage /> },
              { path: '/drivers/:driverId', element: <DriverAnalyticsPage /> },
              { path: '/orders', element: <OrdersPage /> },
              { path: '/orders/:orderId', element: <OrderDetailsPage /> },
              { path: '/operations', element: <OperationsPage /> },
              { path: '/settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
