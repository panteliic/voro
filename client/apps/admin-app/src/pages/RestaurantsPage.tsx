import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input, Switch } from '@voro/ui'
import { Plus } from 'lucide-react'
import { DataTable } from '../components/common/DataTable'
import { LoadingState } from '../components/common/LoadingState'
import { StatusBadge } from '../components/common/StatusBadge'
import { useI18n } from '../i18n/i18n'
import {
  listRestaurants,
  resetRestaurantOwnerPassword,
  updateRestaurantStatus,
} from '../services/restaurantsApi'
import type { SetupResult } from '../types/admin'
import type { Restaurant } from '../types/restaurant'

export function RestaurantsPage() {
  const { t } = useI18n()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [search, setSearch] = useState('')
  const [resetSetup, setResetSetup] = useState<SetupResult | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [pendingResetId, setPendingResetId] = useState<number | null>(null)

  async function loadRestaurants() {
    const result = await listRestaurants()
    setRestaurants(result.restaurants)
  }

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const result = await listRestaurants()

        if (isMounted) {
          setRestaurants(result.restaurants)
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : t('restaurants.error'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [t])

  const filteredRestaurants = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) {
      return restaurants
    }

    return restaurants.filter((restaurant) =>
      [
        restaurant.name,
        restaurant.email,
        restaurant.categoryName,
        restaurant.phone,
        ...restaurant.categories.map((category) => category.name),
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [restaurants, search])

  async function handleStatus(restaurant: Restaurant, isActive: boolean) {
    setPendingId(restaurant.id)
    setError('')

    try {
      await updateRestaurantStatus(restaurant.id, isActive)
      await loadRestaurants()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('restaurants.updateError'))
    } finally {
      setPendingId(null)
    }
  }

  async function handleResetPassword(restaurant: Restaurant) {
    if (!window.confirm(t('restaurants.confirmReset', { name: restaurant.name }))) {
      return
    }

    setPendingResetId(restaurant.id)
    setResetSetup(null)
    setError('')

    try {
      const result = await resetRestaurantOwnerPassword(restaurant.id)
      setResetSetup({
        restaurantName: result.restaurant.name,
        ownerEmail: result.owner.email,
        setupCode: result.setupCode,
      })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('restaurants.resetError'))
    } finally {
      setPendingResetId(null)
    }
  }

  if (isLoading) {
    return <LoadingState label={t('restaurants.loading')} />
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('restaurants.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('restaurants.desc')}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            className="sm:w-80"
            placeholder={t('restaurants.search')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button asChild>
            <Link to="/restaurants/new">
              <Plus className="size-4" />
              {t('restaurants.create')}
            </Link>
          </Button>
        </div>
      </div>
      {resetSetup ? (
        <section className="rounded-voro-lg border border-action bg-accent p-4">
          <p className="font-bold">{t('restaurants.newCode')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('common.sendSetup', {
              name: resetSetup.restaurantName || '',
              email: resetSetup.ownerEmail || '',
              code: resetSetup.setupCode || '',
            })}
          </p>
        </section>
      ) : null}
      {error ? <p className="rounded-voro-lg border border-line bg-card p-3 text-sm font-bold text-red-700">{error}</p> : null}
      <DataTable
        columns={[
          {
            key: 'name',
            header: t('dashboard.restaurant'),
            render: (restaurant) => (
              <div>
                <Link className="font-bold text-content hover:text-action" to={`/restaurants/${restaurant.id}`}>{restaurant.name}</Link>
                <p className="text-xs text-muted-foreground">{restaurant.email || t('common.noEmail')}</p>
              </div>
            ),
          },
          {
            key: 'category',
            header: t('restaurants.category'),
            render: (restaurant) => (
              <div className="flex flex-wrap gap-1">
                {(restaurant.categories.length > 0
                  ? restaurant.categories
                  : [{ id: 0, name: restaurant.categoryName || t('common.general') }]
                ).map((category) => (
                  <span
                    className="rounded-voro-md bg-muted px-2 py-1 text-xs font-bold"
                    key={category.id}
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            ),
          },
          { key: 'phone', header: t('common.phone'), render: (restaurant) => restaurant.phone || t('common.notSet') },
          {
            key: 'status',
            header: t('common.status'),
            render: (restaurant) => (
              <StatusBadge tone={restaurant.isActive ? 'success' : 'warning'}>
                {restaurant.isActive ? t('common.active') : t('common.inactive')}
              </StatusBadge>
            ),
          },
          {
            key: 'toggle',
            header: t('common.active'),
            render: (restaurant) => (
              <Switch
                checked={restaurant.isActive}
                disabled={pendingId === restaurant.id}
                onCheckedChange={(checked) => void handleStatus(restaurant, checked)}
              />
            ),
          },
          {
            key: 'password',
            header: t('common.password'),
            render: (restaurant) => (
              <Button
                disabled={pendingResetId === restaurant.id}
                onClick={() => void handleResetPassword(restaurant)}
                size="sm"
                type="button"
                variant="outline"
              >
                {t('common.reset')}
              </Button>
            ),
          },
        ]}
        emptyTitle={t('restaurants.noRestaurants')}
        getRowKey={(restaurant) => restaurant.id}
        rows={filteredRestaurants}
      />
    </div>
  )
}
