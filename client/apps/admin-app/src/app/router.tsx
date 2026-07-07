import { createBrowserRouter } from 'react-router-dom'
import { AdminLayout } from '../components/layout/AdminLayout'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { CreateDriverPage } from '../pages/CreateDriverPage'
import { CreateRestaurantPage } from '../pages/CreateRestaurantPage'
import { DashboardPage } from '../pages/DashboardPage'
import { DriversPage } from '../pages/DriversPage'
import { LoginPage } from '../pages/LoginPage'
import { OrderDetailsPage } from '../pages/OrderDetailsPage'
import { OrdersPage } from '../pages/OrdersPage'
import { RegisterPage } from '../pages/RegisterPage'
import { RestaurantsPage } from '../pages/RestaurantsPage'
import { SettingsPage } from '../pages/SettingsPage'
import { UsersPage } from '../pages/UsersPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
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
          { path: '/drivers', element: <DriversPage /> },
          { path: '/drivers/new', element: <CreateDriverPage /> },
          { path: '/orders', element: <OrdersPage /> },
          { path: '/orders/:orderId', element: <OrderDetailsPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
])
