import { useEffect, useMemo, useState } from 'react'
import { MapPin, Search, Sparkles, Store, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Button, Input } from '@voro/ui'
import { useI18n } from '../../i18n/i18n'
import { customerApi } from '../../services/customerApi'
import type { DiscoverableRestaurant, RestaurantCategory } from '../../types/customer'

type RestaurantDiscoveryPanelProps = {
  deliveryAddress?: string
  showSearch?: boolean
  userName?: string
}

const initialRestaurantCount = 9
const initialCategoryCount = 8

function restaurantTone(restaurant: DiscoverableRestaurant) {
  const category = restaurant.categories[0]?.slug || restaurant.categoryName.toLowerCase()

  if (['pizza', 'italian', 'pasta'].includes(category)) return 'bg-orange-500/15 text-orange-500'
  if (['sushi', 'asian', 'chinese', 'indian'].includes(category)) return 'bg-sky-500/15 text-sky-500'
  if (['healthy', 'vegan'].includes(category)) return 'bg-emerald-500/15 text-emerald-500'

  return 'bg-accent text-action'
}

export function RestaurantDiscoveryPanel({
  deliveryAddress,
  showSearch = false,
  userName,
}: RestaurantDiscoveryPanelProps) {
  const { t } = useI18n()
  const [categories, setCategories] = useState<RestaurantCategory[]>([])
  const [restaurants, setRestaurants] = useState<DiscoverableRestaurant[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [visibleRestaurantCount, setVisibleRestaurantCount] = useState(initialRestaurantCount)
  const [areCategoriesExpanded, setAreCategoriesExpanded] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    customerApi
      .getRestaurantDiscovery(selectedCategory)
      .then((result) => {
        if (isMounted) {
          setCategories(result.categories)
          setRestaurants(result.restaurants)
        }
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : t('restaurants.error'))
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [selectedCategory, t])

  const selectedLabel = useMemo(
    () =>
      selectedCategory
        ? categories.find((category) => category.slug === selectedCategory)?.name || selectedCategory
        : t('restaurants.all'),
    [categories, selectedCategory, t],
  )
  const filteredRestaurants = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    if (!term) {
      return restaurants
    }

    return restaurants.filter((restaurant) =>
      [
        restaurant.name,
        restaurant.description,
        restaurant.categoryName,
        ...restaurant.categories.map((category) => category.name),
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [restaurants, searchTerm])
  const visibleCategories = areCategoriesExpanded
    ? categories
    : categories.slice(0, initialCategoryCount)
  const visibleRestaurants = filteredRestaurants.slice(0, visibleRestaurantCount)
  const canShowMoreRestaurants = visibleRestaurantCount < filteredRestaurants.length

  function selectCategory(categorySlug: string) {
    setIsLoading(true)
    setError('')
    setSelectedCategory(categorySlug)
    setVisibleRestaurantCount(initialRestaurantCount)
  }

  function updateSearchTerm(value: string) {
    setSearchTerm(value)
    setVisibleRestaurantCount(initialRestaurantCount)
  }

  return (
    <section className="grid gap-6">
      {showSearch ? (
        <header>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-action">Voro</p>
          <h1 className="mt-2 text-2xl font-bold text-content sm:text-3xl">{t('search.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('search.desc')}</p>
        </header>
      ) : (
        <section className="relative overflow-hidden rounded-voro-xl border border-line bg-card p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-action/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-action/15 px-3 py-1.5 text-xs font-bold text-action">
                <Sparkles className="size-3.5" />
                {t('discovery.kicker')}
              </span>
              <h1 className="mt-4 text-2xl font-bold leading-tight text-content sm:text-3xl">
                {t('discovery.title', { name: userName || t('discovery.friend') })}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{t('discovery.desc')}</p>
            </div>
            <NavLink
              className="flex min-w-0 items-center gap-3 rounded-voro-lg border border-line bg-background/80 px-3 py-2.5 transition hover:border-action/50 hover:bg-accent"
              to="/settings/delivery"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-voro-md bg-accent text-action">
                <MapPin className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-muted-foreground">{t('discovery.deliveringTo')}</span>
                <span className="block truncate text-sm font-bold text-content">
                  {deliveryAddress || t('discovery.addAddress')}
                </span>
              </span>
            </NavLink>
          </div>
        </section>
      )}

      <div className="relative max-w-2xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label={t('search.title')}
          className="h-12 rounded-voro-lg border-line bg-card pl-11 pr-11 shadow-voro-sm"
          onChange={(event) => updateSearchTerm(event.target.value)}
          placeholder={t('search.placeholder')}
          value={searchTerm}
        />
        {searchTerm ? (
          <button
            aria-label={t('search.clear')}
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-voro-md text-muted-foreground transition hover:bg-accent hover:text-content"
            onClick={() => updateSearchTerm('')}
            type="button"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <section aria-label={t('restaurants.categories')}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-content">{t('restaurants.categories')}</h2>
          {categories.length > initialCategoryCount ? (
            <button
              className="text-xs font-bold text-action transition hover:text-action-hover"
              onClick={() => setAreCategoriesExpanded((value) => !value)}
              type="button"
            >
              {areCategoriesExpanded
                ? t('restaurants.showLess')
                : t('restaurants.moreCategories', { count: categories.length - initialCategoryCount })}
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => selectCategory('')}
            size="sm"
            type="button"
            variant={selectedCategory ? 'outline' : 'default'}
          >
            {t('restaurants.all')}
          </Button>
          {visibleCategories.map((category) => (
            <Button
              key={category.id}
              onClick={() => selectCategory(category.slug)}
              size="sm"
              type="button"
              variant={selectedCategory === category.slug ? 'default' : 'outline'}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-content">{selectedLabel}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('restaurants.resultsHelp')}</p>
        </div>
        <span className="rounded-voro-md bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">
          {t('restaurants.count', { count: filteredRestaurants.length })}
        </span>
      </div>

      {error ? (
        <p className="rounded-voro-lg border border-line bg-card p-3 text-sm font-bold text-destructive">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <div className="rounded-voro-lg border border-line bg-card p-6 text-sm text-muted-foreground">
          {t('restaurants.loading')}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleRestaurants.map((restaurant) => (
            <NavLink
              aria-label={t('restaurants.openMenu', { name: restaurant.name })}
              className="rounded-voro-lg border border-line bg-card p-4 transition duration-150 hover:-translate-y-0.5 hover:border-action/50 hover:shadow-voro-sm"
              key={restaurant.id}
              to={`/restaurants/${restaurant.id}`}
            >
              <div className="flex items-start gap-3">
                {restaurant.imageUrl ? (
                  <img
                    alt={restaurant.name}
                    className="size-14 rounded-voro-md object-cover"
                    src={restaurant.imageUrl}
                  />
                ) : (
                  <span className={`grid size-14 shrink-0 place-items-center rounded-voro-md ${restaurantTone(restaurant)}`}>
                    <Store className="size-5" />
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate font-bold text-content">{restaurant.name}</h3>
                    <span className="shrink-0 rounded-full bg-emerald-500/12 px-2 py-1 text-[0.65rem] font-bold text-emerald-500">
                      {t('restaurants.available')}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {restaurant.description || t('restaurants.noDescription')}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1">
                {(restaurant.categories.length > 0
                  ? restaurant.categories
                  : [{ id: 0, name: restaurant.categoryName || t('restaurants.general') }]
                ).map((category) => (
                  <span className="rounded-voro-md bg-muted px-2 py-1 text-xs font-bold" key={category.id}>
                    {category.name}
                  </span>
                ))}
              </div>
            </NavLink>
          ))}
        </div>
      )}

      {!isLoading && canShowMoreRestaurants ? (
        <div className="flex justify-center">
          <Button
            onClick={() => setVisibleRestaurantCount((count) => count + initialRestaurantCount)}
            type="button"
            variant="outline"
          >
            {t('restaurants.showMore', { count: filteredRestaurants.length - visibleRestaurants.length })}
          </Button>
        </div>
      ) : null}

      {!isLoading && filteredRestaurants.length === 0 ? (
        <div className="rounded-voro-lg border border-dashed border-line bg-card p-8 text-center">
          <p className="font-bold text-content">{t('restaurants.empty')}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t('restaurants.emptyHelp')}</p>
        </div>
      ) : null}
    </section>
  )
}
