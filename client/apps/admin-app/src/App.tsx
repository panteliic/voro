import { FormEvent, useEffect, useState } from 'react'
import { Button, Input, Textarea } from '@voro/ui'
import { Building2, KeyRound, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const TOKEN_KEY = 'voro_admin_access_token'
const USER_KEY = 'voro_admin_user'

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
  email: string
  phone: string
  isActive: boolean
}

const emptyLogin = {
  email: '',
  password: '',
}

const emptyBootstrap = {
  name: '',
  email: '',
  password: '',
}

const emptyRestaurant = {
  ownerName: '',
  ownerEmail: '',
  restaurantName: '',
  categoryName: '',
  description: '',
  phone: '',
  email: '',
  imageUrl: '',
}

function storedUser() {
  try {
    const value = localStorage.getItem(USER_KEY)
    return value ? (JSON.parse(value) as AuthUser) : null
  } catch {
    return null
  }
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

function App() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '')
  const [user, setUser] = useState<AuthUser | null>(storedUser)
  const [loginForm, setLoginForm] = useState(emptyLogin)
  const [bootstrapForm, setBootstrapForm] = useState(emptyBootstrap)
  const [restaurantForm, setRestaurantForm] = useState(emptyRestaurant)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [lastSetup, setLastSetup] = useState<{
    restaurantName: string
    ownerEmail: string
    setupCode: string
  } | null>(null)
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingRestaurant, setIsCreatingRestaurant] = useState(false)

  async function loadRestaurants(nextToken = token) {
    if (!nextToken) {
      return
    }

    setIsLoading(true)
    setStatus('')

    try {
      const result = await request<{ restaurants: Restaurant[] }>(
        '/admin/restaurants',
        nextToken,
      )
      setRestaurants(result.restaurants)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not load restaurants.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadRestaurants(token)
  }, [])

  async function handleBootstrap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setStatus('')

    try {
      const response = await fetch(`${API_URL}/admin/bootstrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bootstrapForm),
      })
      const data = (await response.json()) as { message?: string }

      if (!response.ok) {
        throw new Error(data.message || 'Could not create admin.')
      }

      setBootstrapForm(emptyBootstrap)
      setStatus('Admin created. Sign in with that account.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not create admin.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setStatus('')

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      const data = (await response.json()) as {
        accessToken: string
        user: AuthUser
        message?: string
      }

      if (!response.ok) {
        throw new Error(data.message || 'Could not sign in.')
      }

      if (data.user.role !== 'admin') {
        throw new Error('This app is only for admin accounts.')
      }

      localStorage.setItem(TOKEN_KEY, data.accessToken)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      setToken(data.accessToken)
      setUser(data.user)
      await loadRestaurants(data.accessToken)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not sign in.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateRestaurant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsCreatingRestaurant(true)
    setStatus('')

    try {
      const result = await request<{
        restaurant: Restaurant
        owner: { email: string }
        setupCode: string
      }>('/admin/restaurants', token, {
        method: 'POST',
        body: JSON.stringify(restaurantForm),
      })
      setRestaurantForm(emptyRestaurant)
      setLastSetup({
        restaurantName: result.restaurant.name,
        ownerEmail: result.owner.email,
        setupCode: result.setupCode,
      })
      setStatus('Restaurant account created. Share the setup code with the owner.')
      await loadRestaurants()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not create restaurant.')
    } finally {
      setIsCreatingRestaurant(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken('')
    setUser(null)
    setRestaurants([])
  }

  if (!token || !user) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 text-content">
        <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-2">
          <section className="rounded-voro-lg border border-line bg-card p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-voro-lg bg-accent text-action">
                <KeyRound className="size-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold">Admin sign in</h1>
                <p className="text-sm text-muted-foreground">
                  Manage restaurant accounts and onboarding.
                </p>
              </div>
            </div>
            <form className="mt-5 grid gap-3" onSubmit={handleLogin}>
              <label className="grid gap-2 text-sm font-bold">
                Email
                <Input
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Password
                <Input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </label>
              <Button disabled={isLoading} type="submit">
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </section>

          <section className="rounded-voro-lg border border-line bg-card p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-voro-lg bg-accent text-action">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold">First admin</h2>
                <p className="text-sm text-muted-foreground">
                  Works only while no admin account exists.
                </p>
              </div>
            </div>
            <form className="mt-5 grid gap-3" onSubmit={handleBootstrap}>
              <Input
                placeholder="Name"
                value={bootstrapForm.name}
                onChange={(event) =>
                  setBootstrapForm((current) => ({ ...current, name: event.target.value }))
                }
              />
              <Input
                placeholder="Email"
                value={bootstrapForm.email}
                onChange={(event) =>
                  setBootstrapForm((current) => ({ ...current, email: event.target.value }))
                }
              />
              <Input
                placeholder="Password"
                type="password"
                value={bootstrapForm.password}
                onChange={(event) =>
                  setBootstrapForm((current) => ({ ...current, password: event.target.value }))
                }
              />
              <Button disabled={isLoading} type="submit" variant="outline">
                Create first admin
              </Button>
            </form>
          </section>
        </div>
        {status ? (
          <p className="mx-auto mt-4 max-w-5xl rounded-voro-lg border border-line bg-card px-4 py-3 text-sm font-medium">
            {status}
          </p>
        ) : null}
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-content">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-voro-lg bg-accent text-action">
              <ShieldCheck className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">Voro Admin</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              disabled={isLoading}
              onClick={() => void loadRestaurants()}
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

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5 lg:grid-cols-[24rem_1fr]">
        <section className="self-start rounded-voro-lg border border-line bg-card p-5">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-action" />
            <h1 className="font-bold">Create restaurant</h1>
          </div>
          <form className="mt-4 grid gap-3" onSubmit={handleCreateRestaurant}>
            <Input
              placeholder="Restaurant name"
              value={restaurantForm.restaurantName}
              onChange={(event) =>
                setRestaurantForm((current) => ({
                  ...current,
                  restaurantName: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Food category"
              value={restaurantForm.categoryName}
              onChange={(event) =>
                setRestaurantForm((current) => ({
                  ...current,
                  categoryName: event.target.value,
                }))
              }
            />
            <Textarea
              placeholder="Description"
              value={restaurantForm.description}
              onChange={(event) =>
                setRestaurantForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Restaurant phone"
              value={restaurantForm.phone}
              onChange={(event) =>
                setRestaurantForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
            <Input
              placeholder="Restaurant public email"
              value={restaurantForm.email}
              onChange={(event) =>
                setRestaurantForm((current) => ({ ...current, email: event.target.value }))
              }
            />
            <Input
              placeholder="Image URL"
              value={restaurantForm.imageUrl}
              onChange={(event) =>
                setRestaurantForm((current) => ({ ...current, imageUrl: event.target.value }))
              }
            />
            <div className="my-1 h-px bg-line" />
            <Input
              placeholder="Owner name"
              value={restaurantForm.ownerName}
              onChange={(event) =>
                setRestaurantForm((current) => ({ ...current, ownerName: event.target.value }))
              }
            />
            <Input
              placeholder="Owner login email"
              value={restaurantForm.ownerEmail}
              onChange={(event) =>
                setRestaurantForm((current) => ({ ...current, ownerEmail: event.target.value }))
              }
            />
            <Button disabled={isCreatingRestaurant} type="submit">
              {isCreatingRestaurant ? 'Creating...' : 'Create restaurant invite'}
            </Button>
          </form>
        </section>

        <section className="grid gap-4">
          {lastSetup ? (
            <section className="rounded-voro-lg border border-action bg-accent px-4 py-3">
              <p className="text-sm font-bold text-content">Restaurant setup ready</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Send this to {lastSetup.restaurantName}: login email{' '}
                <span className="font-bold text-content">{lastSetup.ownerEmail}</span> and setup
                code <span className="font-bold text-action">{lastSetup.setupCode}</span>.
              </p>
            </section>
          ) : null}
          {status ? (
            <p className="rounded-voro-lg border border-line bg-card px-4 py-3 text-sm font-medium">
              {status}
            </p>
          ) : null}
          <div className="rounded-voro-lg border border-line bg-card p-5">
            <h2 className="text-xl font-bold">Restaurants</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Accounts created here can sign into the restaurant app.
            </p>
            <div className="mt-4 grid gap-3">
              {restaurants.map((restaurant) => (
                <article
                  className="grid gap-3 rounded-voro-md border border-line px-4 py-3 sm:grid-cols-[1fr_auto]"
                  key={restaurant.id}
                >
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{restaurant.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {restaurant.description || 'No description'}
                    </p>
                    <p className="mt-2 text-xs font-bold text-muted-foreground">
                      {restaurant.email || 'No public email'}
                    </p>
                  </div>
                  <div className="flex items-start gap-2 sm:justify-end">
                    <span className="rounded-voro-md bg-muted px-2 py-1 text-xs font-bold">
                      {restaurant.categoryName || 'General'}
                    </span>
                    <span className="rounded-voro-md bg-accent px-2 py-1 text-xs font-bold text-action">
                      {restaurant.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </article>
              ))}
              {restaurants.length === 0 ? (
                <p className="rounded-voro-md border border-dashed border-line px-4 py-4 text-sm text-muted-foreground">
                  No restaurants yet.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
