import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Button, Input, Textarea } from '@voro/ui'
import {
  Bell,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Flame,
  LogOut,
  PackagePlus,
  RefreshCw,
  Settings2,
  Store,
  Utensils,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const TOKEN_KEY = 'voro_restaurant_access_token'
const USER_KEY = 'voro_restaurant_user'

type AuthUser = {
  id: number
  name: string
  email: string
  role: string
}

type Restaurant = {
  id: number
  name: string
  description: string
  categoryName: string
  phone: string
  email: string
  imageUrl: string
  isActive: boolean
}

type ProductCategory = {
  id: number
  name: string
  description: string
}

type Product = {
  id: number
  categoryId: number | null
  categoryName: string
  name: string
  description: string
  price: number
  imageUrl: string
  isAvailable: boolean
}

type DashboardResponse = {
  restaurant: Restaurant
  categories: ProductCategory[]
  products: Product[]
}

type ActiveView = 'orders' | 'menu'

const demoOrders = [
  {
    id: 'A-104',
    customer: 'Milica P.',
    status: 'New',
    eta: '12 min',
    total: '2,180 RSD',
    items: ['Capricciosa x1', 'Coca-Cola x2'],
  },
  {
    id: 'A-103',
    customer: 'Nikola R.',
    status: 'Preparing',
    eta: '7 min',
    total: '1,450 RSD',
    items: ['Burger classic x1', 'Fries x1'],
  },
  {
    id: 'A-102',
    customer: 'Ana S.',
    status: 'Ready',
    eta: 'Pickup now',
    total: '3,020 RSD',
    items: ['Pasta carbonara x2', 'Tiramisu x1'],
  },
]

const emptyCategory = {
  name: '',
  description: '',
}

const emptyProduct = {
  categoryId: '',
  name: '',
  description: '',
  price: '',
  imageUrl: '',
  isAvailable: true,
}

const emptySetup = {
  email: '',
  setupCode: '',
  password: '',
}

async function request<TResponse>(
  path: string,
  token: string,
  options: RequestInit = {},
) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  const data = (await response.json()) as TResponse & { message?: string }

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.')
  }

  return data
}

async function publicRequest<TResponse>(path: string, body: unknown) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await response.json()) as TResponse & { message?: string }

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.')
  }

  return data
}

function storedUser() {
  try {
    const value = localStorage.getItem(USER_KEY)
    return value ? (JSON.parse(value) as AuthUser) : null
  } catch {
    return null
  }
}

function productToForm(product: Product) {
  return {
    categoryId: product.categoryId ? String(product.categoryId) : '',
    name: product.name,
    description: product.description,
    price: String(product.price),
    imageUrl: product.imageUrl,
    isAvailable: product.isAvailable,
  }
}

function App() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '')
  const [user, setUser] = useState<AuthUser | null>(storedUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [setupForm, setSetupForm] = useState(emptySetup)
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [activeView, setActiveView] = useState<ActiveView>('orders')
  const [categoryForm, setCategoryForm] = useState(emptyCategory)
  const [productForm, setProductForm] = useState(emptyProduct)
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingCategory, setIsSavingCategory] = useState(false)
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [isSettingPassword, setIsSettingPassword] = useState(false)

  const uncategorizedProducts = useMemo(
    () => (dashboard?.products || []).filter((product) => product.categoryId === null),
    [dashboard?.products],
  )

  const groupedProducts = useMemo(() => {
    const categories = dashboard?.categories || []

    return categories.map((category) => ({
      category,
      products: (dashboard?.products || []).filter((product) => product.categoryId === category.id),
    }))
  }, [dashboard])

  async function loadDashboard(nextToken = token) {
    if (!nextToken) {
      return
    }

    setIsLoading(true)
    setStatus('')

    try {
      setDashboard(await request<DashboardResponse>('/restaurant/me', nextToken))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not load restaurant.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboard(token)
  }, [])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setStatus('')

    try {
      const data = await publicRequest<{
        accessToken: string
        user: AuthUser
      }>('/auth/login', { email, password })

      if (data.user.role !== 'restaurant') {
        throw new Error('This console is only for restaurant operators.')
      }

      localStorage.setItem(TOKEN_KEY, data.accessToken)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      setToken(data.accessToken)
      setUser(data.user)
      await loadDashboard(data.accessToken)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not sign in.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSetupPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSettingPassword(true)
    setStatus('')

    try {
      const verified = await publicRequest<{ resetToken: string }>(
        '/auth/verify-password-reset-code',
        {
          email: setupForm.email,
          code: setupForm.setupCode,
        },
      )
      await publicRequest('/auth/reset-password', {
        resetToken: verified.resetToken,
        password: setupForm.password,
      })

      setEmail(setupForm.email)
      setPassword('')
      setSetupForm(emptySetup)
      setStatus('Password created. Sign in with the new password.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not set password.')
    } finally {
      setIsSettingPassword(false)
    }
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSavingCategory(true)
    setStatus('')

    try {
      const result = await request<{ categories: ProductCategory[] }>(
        '/restaurant/categories',
        token,
        {
          method: 'POST',
          body: JSON.stringify(categoryForm),
        },
      )

      setDashboard((current) =>
        current ? { ...current, categories: result.categories } : current,
      )
      setCategoryForm(emptyCategory)
      setStatus('Category added.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not add category.')
    } finally {
      setIsSavingCategory(false)
    }
  }

  async function handleSaveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSavingProduct(true)
    setStatus('')

    const payload = {
      ...productForm,
      categoryId: productForm.categoryId ? Number(productForm.categoryId) : null,
      price: Number(productForm.price),
    }
    const path = editingProductId
      ? `/restaurant/products/${editingProductId}`
      : '/restaurant/products'
    const method = editingProductId ? 'PATCH' : 'POST'

    try {
      const result = await request<{ products: Product[] }>(path, token, {
        method,
        body: JSON.stringify(payload),
      })

      setDashboard((current) =>
        current ? { ...current, products: result.products } : current,
      )
      setProductForm(emptyProduct)
      setEditingProductId(null)
      setStatus(editingProductId ? 'Product updated.' : 'Product added.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save product.')
    } finally {
      setIsSavingProduct(false)
    }
  }

  function handleEditProduct(product: Product) {
    setProductForm(productToForm(product))
    setEditingProductId(product.id)
    setActiveView('menu')
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken('')
    setUser(null)
    setDashboard(null)
  }

  if (!token || !user) {
    return (
      <main className="min-h-screen bg-background text-content">
        <header className="border-b border-line bg-card">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-voro-md bg-content text-background">
                <Store className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">Voro Restaurant Operations</p>
                <p className="truncate text-xs text-muted-foreground">Private console access</p>
              </div>
            </div>
            <span className="rounded-voro-md border border-line px-3 py-2 text-xs font-bold text-muted-foreground">
              Admin-issued accounts only
            </span>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[18rem_1fr]">
          <aside className="grid content-start gap-3 rounded-voro-lg border border-line bg-card p-3">
            {[
              ['01', 'Setup code', 'Use the invite from admin'],
              ['02', 'Create password', 'Owner sets credentials once'],
              ['03', 'Run service', 'Orders and menu live here'],
            ].map(([step, label, value]) => (
              <div className="rounded-voro-md border border-line bg-muted p-3" key={step}>
                <p className="text-xs font-bold text-action">{step}</p>
                <p className="mt-2 text-sm font-bold">{label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{value}</p>
              </div>
            ))}
          </aside>

          <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-voro-lg border border-line bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold">First restaurant access</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Email, setup code, and password creation.
                  </p>
                </div>
                <Settings2 className="size-5 text-action" />
              </div>
              <form className="mt-5 grid gap-3" onSubmit={handleSetupPassword}>
                <Input
                  placeholder="Restaurant owner email"
                  value={setupForm.email}
                  onChange={(event) =>
                    setSetupForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
                <Input
                  placeholder="Setup code from admin"
                  value={setupForm.setupCode}
                  onChange={(event) =>
                    setSetupForm((current) => ({ ...current, setupCode: event.target.value }))
                  }
                />
                <Input
                  placeholder="Create restaurant password"
                  type="password"
                  value={setupForm.password}
                  onChange={(event) =>
                    setSetupForm((current) => ({ ...current, password: event.target.value }))
                  }
                />
                <Button disabled={isSettingPassword} type="submit">
                  {isSettingPassword ? 'Creating password...' : 'Create password'}
                </Button>
              </form>
            </div>

            <div className="rounded-voro-lg border border-line bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Operator sign in</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No public registration or social login.
                  </p>
                </div>
                <ClipboardList className="size-5 text-action" />
              </div>
              <form className="mt-5 grid gap-3" onSubmit={handleLogin}>
                <Input
                  placeholder="Restaurant email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <Input
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                {status ? <p className="text-sm font-medium text-destructive">{status}</p> : null}
                <Button disabled={isLoading} type="submit" variant="outline">
                  {isLoading ? 'Opening console...' : 'Open operations console'}
                </Button>
              </form>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-content">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-voro-lg bg-action text-white">
              <Store className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {dashboard?.restaurant.name || 'Restaurant Console'}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              disabled={isLoading}
              onClick={() => void loadDashboard()}
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            <Button onClick={handleLogout} size="sm" type="button" variant="outline">
              <LogOut className="size-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[16rem_1fr]">
        <aside className="grid self-start rounded-voro-lg border border-line bg-card p-2">
          {[
            { id: 'orders' as const, label: 'Orders', icon: ClipboardList },
            { id: 'menu' as const, label: 'Menu', icon: Utensils },
          ].map(({ id, icon: Icon, label }) => (
            <button
              className={`flex cursor-pointer items-center gap-3 rounded-voro-md px-3 py-3 text-left text-sm font-bold ${
                activeView === id ? 'bg-accent text-content' : 'text-muted-foreground'
              }`}
              key={id}
              onClick={() => setActiveView(id)}
              type="button"
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </aside>

        <section className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: 'New orders', value: '1', icon: Bell },
              { label: 'Preparing', value: '1', icon: Flame },
              { label: 'Ready', value: '1', icon: CheckCircle2 },
              { label: 'Active items', value: String(dashboard?.products.length || 0), icon: Utensils },
            ].map(({ icon: Icon, label, value }) => (
              <div className="rounded-voro-lg border border-line bg-card p-4" key={label}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-muted-foreground">{label}</p>
                  <Icon className="size-4 text-action" />
                </div>
                <p className="mt-3 text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>

          {status ? (
            <p className="rounded-voro-lg border border-line bg-card px-4 py-3 text-sm font-medium">
              {status}
            </p>
          ) : null}

          {activeView === 'orders' ? (
            <section className="grid gap-4">
              <div className="rounded-voro-lg border border-line bg-card p-5">
                <h1 className="text-xl font-bold">Live order board</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Order API comes next; this board is ready for incoming tickets.
                </p>
              </div>
              <div className="grid gap-3 xl:grid-cols-3">
                {demoOrders.map((order) => (
                  <article className="rounded-voro-lg border border-line bg-card p-4" key={order.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-muted-foreground">ORDER {order.id}</p>
                        <h2 className="mt-1 text-lg font-bold">{order.customer}</h2>
                      </div>
                      <span className="rounded-voro-md bg-accent px-2 py-1 text-xs font-bold text-action">
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock3 className="size-4" />
                      {order.eta}
                    </div>
                    <div className="mt-4 grid gap-2">
                      {order.items.map((item) => (
                        <p className="rounded-voro-md bg-muted px-3 py-2 text-sm" key={item}>
                          {item}
                        </p>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="font-bold">{order.total}</p>
                      <div className="flex gap-2">
                        <Button size="sm" type="button" variant="outline">
                          Accept
                        </Button>
                        <Button size="sm" type="button">
                          Ready
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeView === 'menu' ? (
            <section className="grid gap-4 xl:grid-cols-[24rem_1fr]">
              <div className="grid gap-4 self-start">
                <section className="rounded-voro-lg border border-line bg-card p-4">
                  <div className="flex items-center gap-2">
                    <PackagePlus className="size-4 text-action" />
                    <h2 className="font-bold">Product editor</h2>
                  </div>
                  <form className="mt-4 grid gap-3" onSubmit={handleSaveProduct}>
                    <Input
                      placeholder="Product name"
                      value={productForm.name}
                      onChange={(event) =>
                        setProductForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                    <select
                      className="h-10 w-full rounded-voro-lg border border-line bg-card px-3 text-sm"
                      value={productForm.categoryId}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          categoryId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Uncategorized</option>
                      {(dashboard?.categories || []).map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      inputMode="decimal"
                      placeholder="Price"
                      value={productForm.price}
                      onChange={(event) =>
                        setProductForm((current) => ({ ...current, price: event.target.value }))
                      }
                    />
                    <Input
                      placeholder="Image URL"
                      value={productForm.imageUrl}
                      onChange={(event) =>
                        setProductForm((current) => ({ ...current, imageUrl: event.target.value }))
                      }
                    />
                    <Textarea
                      placeholder="Description"
                      value={productForm.description}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                    <label className="flex items-center gap-2 text-sm font-bold">
                      <input
                        checked={productForm.isAvailable}
                        className="size-4 accent-[var(--btn-primary-bg)]"
                        type="checkbox"
                        onChange={(event) =>
                          setProductForm((current) => ({
                            ...current,
                            isAvailable: event.target.checked,
                          }))
                        }
                      />
                      Available
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button disabled={isSavingProduct} type="submit">
                        {isSavingProduct
                          ? 'Saving...'
                          : editingProductId
                            ? 'Update product'
                            : 'Create product'}
                      </Button>
                      {editingProductId ? (
                        <Button
                          onClick={() => {
                            setEditingProductId(null)
                            setProductForm(emptyProduct)
                          }}
                          type="button"
                          variant="outline"
                        >
                          Cancel edit
                        </Button>
                      ) : null}
                    </div>
                  </form>
                </section>

                <section className="rounded-voro-lg border border-line bg-card p-4">
                  <h2 className="font-bold">New category</h2>
                  <form className="mt-4 grid gap-3" onSubmit={handleCreateCategory}>
                    <Input
                      placeholder="Pizza, grills, desserts..."
                      value={categoryForm.name}
                      onChange={(event) =>
                        setCategoryForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                    <Textarea
                      placeholder="Short description"
                      value={categoryForm.description}
                      onChange={(event) =>
                        setCategoryForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                    <Button disabled={isSavingCategory} type="submit" variant="outline">
                      {isSavingCategory ? 'Saving...' : 'Create category'}
                    </Button>
                  </form>
                </section>
              </div>

              <section className="grid gap-3">
                {[...groupedProducts, {
                  category: { id: 0, name: 'Uncategorized', description: '' },
                  products: uncategorizedProducts,
                }].map(({ category, products }) => (
                  <div className="rounded-voro-lg border border-line bg-card p-4" key={category.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-bold">{category.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {category.description || 'Menu section'}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-voro-md bg-muted px-2 py-1 text-xs font-bold">
                        {products.length} items
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {products.map((product) => (
                        <div
                          className="grid gap-3 rounded-voro-md border border-line px-3 py-3 md:grid-cols-[1fr_auto]"
                          key={product.id}
                        >
                          <div className="min-w-0">
                            <p className="font-bold">{product.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {product.description || 'No description'}
                            </p>
                            <p className="mt-2 text-xs font-bold text-muted-foreground">
                              {product.isAvailable ? 'Available' : 'Hidden from menu'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 md:justify-end">
                            <p className="font-bold">{product.price.toFixed(2)} RSD</p>
                            <Button
                              onClick={() => handleEditProduct(product)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))}
                      {products.length === 0 ? (
                        <p className="rounded-voro-md border border-dashed border-line px-3 py-3 text-sm text-muted-foreground">
                          No products here yet.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </section>
            </section>
          ) : null}
        </section>
      </div>
    </main>
  )
}

export default App
