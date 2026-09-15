import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { useI18n } from './i18n/i18n'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import {
  loginRestaurant,
  requestRestaurantPasswordReset,
  setupRestaurantPassword,
} from './services/authApi'
import { revokeSession, SessionExpiredError } from './services/apiClient'
import {
  createCategory,
  getRestaurantDashboard,
  saveProduct,
  updateRestaurantOperations,
  updateOrderStatus,
} from './services/restaurantApi'
import type { AuthUser, LoginPayload, SetupPasswordPayload } from './types/auth'
import type {
  CategoryForm,
  DashboardResponse,
  OrderStatus,
  ProductForm,
  RestaurantOperations,
} from './types/restaurant'
import { clearSession, storedToken, storedUser, storeSession } from './utils/storage'

function App() {
  const { t } = useI18n()
  const [token, setToken] = useState(storedToken)
  const [user, setUser] = useState<AuthUser | null>(storedUser)
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingCategory, setIsSavingCategory] = useState(false)
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [isUpdatingOrderId, setIsUpdatingOrderId] = useState<number | null>(null)
  const [isSettingPassword, setIsSettingPassword] = useState(false)
  const [isSavingOperations, setIsSavingOperations] = useState(false)

  function endSession(message?: string) {
    clearSession()
    setToken('')
    setUser(null)
    setDashboard(null)
    setStatus(message || '')
  }

  function handleRequestError(error: unknown, fallbackMessage: string) {
    if (error instanceof SessionExpiredError) {
      endSession(t('status.sessionExpired'))
      return
    }

    setStatus(error instanceof Error ? error.message : fallbackMessage)
  }

  async function loadDashboard(nextToken = token, silently = false) {
    if (!nextToken) {
      return
    }

    if (!silently) {
      setIsLoading(true)
      setStatus('')
    }

    try {
      setDashboard(await getRestaurantDashboard(nextToken))
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        handleRequestError(error, t('error.loadRestaurant'))
      } else if (!silently) {
        handleRequestError(error, t('error.loadRestaurant'))
      }
    } finally {
      if (!silently) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!token) {
      return
    }

    void loadDashboard(token)
    const refreshInterval = window.setInterval(() => void loadDashboard(token, true), 3_000)

    return () => window.clearInterval(refreshInterval)
    // loadDashboard intentionally stays local so request errors use the latest session handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleLogin(payload: LoginPayload) {
    setIsLoading(true)
    setStatus('')

    try {
      const data = await loginRestaurant(payload)

      storeSession(data.accessToken, data.refreshToken, data.user)
      setToken(data.accessToken)
      setUser(data.user)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t('error.signIn'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSetupPassword(payload: SetupPasswordPayload) {
    setIsSettingPassword(true)
    setStatus('')

    try {
      await setupRestaurantPassword(payload)
      setStatus(t('status.passwordCreated'))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t('error.setPassword'))
    } finally {
      setIsSettingPassword(false)
    }
  }

  async function handleRequestPasswordReset(email: string) {
    setStatus('')
    try {
      return await requestRestaurantPasswordReset(email)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t('error.setPassword'))
      throw error
    }
  }

  async function handleCreateCategory(payload: CategoryForm) {
    setIsSavingCategory(true)
    setStatus('')

    try {
      const result = await createCategory(token, payload)

      setDashboard((current) => (current ? { ...current, categories: result.categories } : current))
      setStatus(t('status.categoryAdded'))
    } catch (error) {
      handleRequestError(error, t('error.addCategory'))
    } finally {
      setIsSavingCategory(false)
    }
  }

  async function handleSaveProduct(payload: ProductForm, editingProductId: number | null) {
    setIsSavingProduct(true)
    setStatus('')

    try {
      const result = await saveProduct(token, payload, editingProductId)

      setDashboard((current) => (current ? { ...current, products: result.products } : current))
      setStatus(editingProductId ? t('status.productUpdated') : t('status.productAdded'))
    } catch (error) {
      handleRequestError(error, t('error.saveProduct'))
    } finally {
      setIsSavingProduct(false)
    }
  }

  async function handleUpdateOrderStatus(orderId: number, nextStatus: OrderStatus) {
    setIsUpdatingOrderId(orderId)
    setStatus('')

    try {
      const result = await updateOrderStatus(token, orderId, nextStatus)

      setDashboard((current) =>
        current
          ? {
              ...current,
              orders: current.orders.map((order) =>
                order.id === result.order.id
                  ? { ...order, status: result.order.status, updatedAt: new Date().toISOString() }
                  : order,
              ),
            }
          : current,
      )
      setStatus(t('status.orderUpdated'))
    } catch (error) {
      handleRequestError(error, t('error.updateOrder'))
    } finally {
      setIsUpdatingOrderId(null)
    }
  }

  async function handleSaveOperations(payload: RestaurantOperations) {
    setIsSavingOperations(true)
    setStatus('')
    try {
      const result = await updateRestaurantOperations(token, payload)
      setDashboard((current) =>
        current
          ? { ...current, restaurant: { ...current.restaurant, ...result.operations } }
          : current,
      )
      setStatus('Delivery settings saved.')
    } catch (error) {
      handleRequestError(error, 'Delivery settings could not be saved.')
    } finally {
      setIsSavingOperations(false)
    }
  }

  async function handleLogout() {
    await revokeSession()
    endSession()
  }

  if (!token || !user) {
    return (
      <AuthPage
        isLoading={isLoading}
        isSettingPassword={isSettingPassword}
        onClearStatus={() => setStatus('')}
        onLogin={handleLogin}
        onRequestPasswordReset={handleRequestPasswordReset}
        onSetupPassword={handleSetupPassword}
        status={status}
      />
    )
  }

  return (
    <BrowserRouter>
      <DashboardPage
        dashboard={dashboard}
        isLoading={isLoading}
        isSavingCategory={isSavingCategory}
        isSavingProduct={isSavingProduct}
        isSavingOperations={isSavingOperations}
        isUpdatingOrderId={isUpdatingOrderId}
        onCreateCategory={handleCreateCategory}
        onLogout={() => void handleLogout()}
        onRefresh={() => void loadDashboard()}
        onSaveProduct={handleSaveProduct}
        onSaveOperations={handleSaveOperations}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        status={status}
        token={token}
        user={user}
      />
    </BrowserRouter>
  )
}

export default App
