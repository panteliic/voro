import { useEffect, useMemo, useState } from 'react'
import { Store } from 'lucide-react'
import { Button, Input } from '@voro/ui'
import { customerApi } from '../../services/customerApi'
import type { DiscoverableRestaurant, RestaurantCategory } from '../../types/customer'
import { useI18n } from '../../i18n/i18n'

type RestaurantDiscoveryPanelProps = {
  showSearch?: boolean
}

export function RestaurantDiscoveryPanel({ showSearch = false }: RestaurantDiscoveryPanelProps) {
  const { t } = useI18n()
  const [categories, setCategories] = useState<RestaurantCategory[]>([])
  const [restaurants, setRestaurants] = useState<DiscoverableRestaurant[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setError('')
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

  return (
    <section className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold text-content">
          {showSearch ? t('search.title') : t('restaurants.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {showSearch ? t('search.desc') : t('restaurants.desc')}
        </p>
      </div>

      {showSearch ? (
        <Input
          className="max-w-xl"
          placeholder={t('search.placeholder')}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button
          onClick={() => setSelectedCategory('')}
          size="sm"
          type="button"
          variant={selectedCategory ? 'outline' : 'default'}
        >
          {t('restaurants.all')}
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            onClick={() => setSelectedCategory(category.slug)}
            size="sm"
            type="button"
            variant={selectedCategory === category.slug ? 'default' : 'outline'}
          >
            {category.name}
          </Button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-content">{selectedLabel}</h2>
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
          {filteredRestaurants.map((restaurant) => (
            <article className="rounded-voro-lg border border-line bg-card p-4" key={restaurant.id}>
              <div className="flex items-start gap-3">
                {restaurant.imageUrl ? (
                  <img
                    alt={restaurant.name}
                    className="size-14 rounded-voro-md object-cover"
                    src={restaurant.imageUrl}
                  />
                ) : (
                  <span className="grid size-14 shrink-0 place-items-center rounded-voro-md bg-accent text-action">
                    <Store className="size-5" />
                  </span>
                )}
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-content">{restaurant.name}</h3>
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
            </article>
          ))}
        </div>
      )}

      {!isLoading && filteredRestaurants.length === 0 ? (
        <div className="rounded-voro-lg border border-dashed border-line bg-card p-8 text-center">
          <p className="font-bold text-content">{t('restaurants.empty')}</p>
        </div>
      ) : null}
    </section>
  )
}
