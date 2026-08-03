import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Heart, MapPin, Search, Sparkles, Star, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Button, Input } from '@voro/ui'
import { useI18n } from '../../i18n/i18n'
import { customerApi } from '../../services/customerApi'
import type { DiscoverableRestaurant, RestaurantCategory } from '../../types/customer'

type RestaurantDiscoveryPanelProps = {
  deliveryAddress?: string
  favoritesOnly?: boolean
  showSearch?: boolean
  userName?: string
}

const initialRestaurantCount = 9
const initialCategoryCount = 8

const categoryPresentation: Record<string, { emoji: string; surface: string }> = {
  pizza: { emoji: '🍕', surface: 'from-orange-100 to-amber-50 dark:from-orange-500/25 dark:to-amber-500/10' },
  burgers: { emoji: '🍔', surface: 'from-rose-100 to-orange-50 dark:from-rose-500/25 dark:to-orange-500/10' },
  serbian: { emoji: '🥘', surface: 'from-red-100 to-amber-50 dark:from-red-500/25 dark:to-amber-500/10' },
  italian: { emoji: '🍝', surface: 'from-amber-100 to-orange-50 dark:from-amber-500/25 dark:to-orange-500/10' },
  asian: { emoji: '🥡', surface: 'from-sky-100 to-cyan-50 dark:from-sky-500/25 dark:to-cyan-500/10' },
  sushi: { emoji: '🍣', surface: 'from-cyan-100 to-sky-50 dark:from-cyan-500/25 dark:to-sky-500/10' },
  chinese: { emoji: '🥢', surface: 'from-red-100 to-rose-50 dark:from-red-500/25 dark:to-rose-500/10' },
  mexican: { emoji: '🌮', surface: 'from-yellow-100 to-orange-50 dark:from-yellow-500/25 dark:to-orange-500/10' },
  healthy: { emoji: '🥗', surface: 'from-emerald-100 to-lime-50 dark:from-emerald-500/25 dark:to-lime-500/10' },
  vegan: { emoji: '🌱', surface: 'from-green-100 to-emerald-50 dark:from-green-500/25 dark:to-emerald-500/10' },
  desserts: { emoji: '🍰', surface: 'from-pink-100 to-rose-50 dark:from-pink-500/25 dark:to-rose-500/10' },
  breakfast: { emoji: '🥞', surface: 'from-yellow-100 to-amber-50 dark:from-yellow-500/25 dark:to-amber-500/10' },
  'fast-food': { emoji: '🍟', surface: 'from-orange-100 to-yellow-50 dark:from-orange-500/25 dark:to-yellow-500/10' },
}

const defaultCategoryPresentation = {
  emoji: '🍽️',
  surface: 'from-primary/15 to-accent',
}

function getCategoryPresentation(slug: string) {
  return categoryPresentation[slug] || defaultCategoryPresentation
}

function restaurantPresentation(restaurant: DiscoverableRestaurant) {
  return getCategoryPresentation(restaurant.categories[0]?.slug || restaurant.categoryName.toLowerCase())
}

export function RestaurantDiscoveryPanel({
  deliveryAddress,
  favoritesOnly = false,
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

    const candidates = favoritesOnly ? restaurants.filter((restaurant) => restaurant.isFavorite) : restaurants

    if (!term) return candidates

    return candidates.filter((restaurant) =>
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
  }, [favoritesOnly, restaurants, searchTerm])
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
    <section className="grid min-w-0 gap-6">
      {favoritesOnly ? (
        <header>
          <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-action">
            <Heart className="size-4 fill-action" />
            {t('favorites.kicker')}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-content sm:text-3xl">{t('favorites.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('favorites.description')}</p>
        </header>
      ) : showSearch ? (
        <header>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-action">Voro</p>
          <h1 className="mt-2 text-2xl font-bold text-content sm:text-3xl">{t('search.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('search.desc')}</p>
        </header>
      ) : (
        <section className="relative min-w-0 overflow-hidden rounded-voro-xl bg-action p-5 text-action-text shadow-voro-lg sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/15" />
          <div className="pointer-events-none absolute -bottom-28 right-1/3 size-56 rounded-full border-[1.25rem] border-white/10" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                <Sparkles className="size-3.5" />
                {t('discovery.kicker')}
              </span>
              <h1 className="mt-4 break-words text-3xl font-bold leading-tight sm:text-4xl">
                {t('discovery.title', { name: userName || t('discovery.friend') })}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">{t('discovery.desc')}</p>
            </div>
            <NavLink
              className="flex w-full min-w-0 items-center gap-3 rounded-voro-lg border border-white/25 bg-black/10 px-3 py-2.5 transition hover:bg-black/20 md:w-auto md:max-w-[22rem]"
              to="/settings/delivery"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-voro-md bg-white/15">
                <MapPin className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-white/70">{t('discovery.deliveringTo')}</span>
                <span className="block truncate text-sm font-bold">
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

      <section aria-label={t('restaurants.categories')} className="min-w-0">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-action">{t('discovery.picks')}</p>
            <h2 className="mt-1 text-xl font-bold text-content">{t('restaurants.categories')}</h2>
          </div>
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
        <div className="-mx-4 flex min-w-0 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 lg:grid lg:grid-cols-4 xl:grid-cols-6">
          <button
            aria-pressed={!selectedCategory}
            className={`group flex w-28 shrink-0 flex-col overflow-hidden rounded-voro-lg border text-left transition sm:w-32 lg:w-auto ${
              !selectedCategory ? 'border-action ring-2 ring-action/20' : 'border-line hover:-translate-y-0.5 hover:border-action/50'
            }`}
            onClick={() => selectCategory('')}
            type="button"
          >
            <span className="grid h-20 place-items-center bg-gradient-to-br from-action/25 to-accent text-4xl transition group-hover:scale-105">🍽️</span>
            <span className="truncate px-3 py-2.5 text-sm font-bold text-content">{t('restaurants.all')}</span>
          </button>
          {visibleCategories.map((category) => (
            <button
              aria-pressed={selectedCategory === category.slug}
              className={`group flex w-28 shrink-0 flex-col overflow-hidden rounded-voro-lg border text-left transition sm:w-32 lg:w-auto ${
                selectedCategory === category.slug ? 'border-action ring-2 ring-action/20' : 'border-line hover:-translate-y-0.5 hover:border-action/50'
              }`}
              key={category.id}
              onClick={() => selectCategory(category.slug)}
              type="button"
            >
              <span className={`grid h-20 place-items-center bg-gradient-to-br text-4xl transition group-hover:scale-105 ${getCategoryPresentation(category.slug).surface}`}>
                {getCategoryPresentation(category.slug).emoji}
              </span>
              <span className="truncate px-3 py-2.5 text-sm font-bold text-content">{category.name}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-content">{favoritesOnly ? t('favorites.restaurants') : selectedLabel}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{favoritesOnly ? t('favorites.resultsHelp') : t('restaurants.resultsHelp')}</p>
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
          {visibleRestaurants.map((restaurant) => {
            const presentation = restaurantPresentation(restaurant)

            return (
              <NavLink
                aria-label={t('restaurants.openMenu', { name: restaurant.name })}
                className="group overflow-hidden rounded-voro-xl border border-line bg-card transition duration-150 hover:-translate-y-0.5 hover:border-action/50 hover:shadow-voro-md"
                key={restaurant.id}
                to={`/restaurants/${restaurant.id}`}
              >
                <div className={`relative grid h-36 place-items-center overflow-hidden bg-gradient-to-br ${presentation.surface}`}>
                  {restaurant.imageUrl ? (
                    <img alt={restaurant.name} className="size-full object-cover transition duration-300 group-hover:scale-105" src={restaurant.imageUrl} />
                  ) : (
                    <span className="text-6xl drop-shadow-sm transition duration-300 group-hover:scale-110">{presentation.emoji}</span>
                  )}
                  <span className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/90 px-2 py-1 text-[0.65rem] font-bold shadow-voro-sm ${restaurant.isOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-300'}`}>
                    <span className={`size-1.5 rounded-full ${restaurant.isOpen ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {restaurant.isOpen ? t('restaurants.available') : 'Closed'}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="truncate text-base font-bold text-content">{restaurant.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                    {restaurant.description || t('restaurants.noDescription')}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 gap-1 overflow-hidden">
                      {(restaurant.categories.length > 0
                        ? restaurant.categories
                        : [{ id: 0, name: restaurant.categoryName || t('restaurants.general') }]
                      ).slice(0, 2).map((category) => (
                        <span className="truncate rounded-voro-md bg-muted px-2 py-1 text-xs font-bold" key={category.id}>
                          {category.name}
                        </span>
                      ))}
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-action transition-transform group-hover:translate-x-1" />
                  </div>
                  {restaurant.reviewCount ? <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground"><Star className="size-3.5 fill-amber-400 text-amber-400" />{restaurant.rating?.toFixed(1)} · {restaurant.reviewCount} review{restaurant.reviewCount === 1 ? '' : 's'}</p> : null}
                  {restaurant.isFavorite ? <p className="mt-3 text-xs font-bold text-action">{t('restaurants.favoriteSaved')}</p> : null}
                </div>
              </NavLink>
            )
          })}
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
          <p className="font-bold text-content">{favoritesOnly ? t('favorites.emptyTitle') : t('restaurants.empty')}</p>
          <p className="mt-2 text-sm text-muted-foreground">{favoritesOnly ? t('favorites.emptyDescription') : t('restaurants.emptyHelp')}</p>
        </div>
      ) : null}
    </section>
  )
}
