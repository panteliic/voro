import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Heart, Minus, Plus, ShoppingBasket, Store } from 'lucide-react'
import { Button } from '@voro/ui'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../../i18n/i18n'
import { customerApi } from '../../services/customerApi'
import type { RestaurantMenu, RestaurantMenuProduct } from '../../types/customer'
import { clearCheckoutDraft, loadCheckoutDraft, saveCheckoutDraft } from '../../types/checkout'

function productGroups(menu: RestaurantMenu) {
  const categories = menu.categories.map((category) => ({
    id: String(category.id),
    name: category.name,
    description: category.description,
    products: menu.products.filter((product) => product.categoryId === category.id),
  }))
  const uncategorized = menu.products.filter((product) => product.categoryId === null)

  if (uncategorized.length > 0) {
    categories.push({
      id: 'uncategorized',
      name: menu.restaurant.categoryName || 'Menu',
      description: '',
      products: uncategorized,
    })
  }

  return categories.filter((category) => category.products.length > 0)
}

export function RestaurantMenuPanel() {
  const { restaurantId: restaurantIdParam } = useParams()
  const navigate = useNavigate()
  const { language, t } = useI18n()
  const restaurantId = Number(restaurantIdParam)
  const [menu, setMenu] = useState<RestaurantMenu | null>(null)
  const [cart, setCart] = useState<Record<number, number>>({})
  const cartRef = useRef<Record<number, number>>({})
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isSavingFavorite, setIsSavingFavorite] = useState(false)

  useEffect(() => {
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      return
    }

    let isMounted = true

    Promise.all([customerApi.getRestaurantMenu(restaurantId), customerApi.getFavorites()])
      .then(([result, favorites]) => {
        if (isMounted) {
          setMenu(result)
          const savedDraft = loadCheckoutDraft()
          const restoredCart = savedDraft?.restaurantId === result.restaurant.id
            ? Object.fromEntries(
                savedDraft.items
                  .filter((item) => Number.isInteger(item.productId) && item.quantity > 0)
                  .map((item) => [item.productId, Math.min(item.quantity, 20)]),
              )
            : {}
          cartRef.current = restoredCart
          setCart(restoredCart)
          setIsFavorite(favorites.restaurantIds.includes(restaurantId))
          setError('')
        }
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : t('menu.loadError'))
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
  }, [restaurantId, t])

  const cartItems = useMemo(() => {
    const productsById = new Map(menu?.products.map((product) => [product.id, product]) || [])

    return Object.entries(cart)
      .map(([productId, quantity]) => ({ product: productsById.get(Number(productId)), quantity }))
      .filter(
        (item): item is { product: RestaurantMenuProduct; quantity: number } => Boolean(item.product),
      )
  }, [cart, menu?.products])
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const money = new Intl.NumberFormat(language === 'sr' ? 'sr-RS' : 'en-US', {
    maximumFractionDigits: 0,
  })

  function updateQuantity(productId: number, change: number) {
    if (!menu) return

    const nextCart = { ...cartRef.current }
    const nextQuantity = (nextCart[productId] || 0) + change

    if (nextQuantity <= 0) {
      delete nextCart[productId]
    } else {
      nextCart[productId] = Math.min(nextQuantity, 20)
    }

    cartRef.current = nextCart
    setCart(nextCart)

    const items = Object.entries(nextCart)
      .map(([id, quantity]) => ({ product: menu.products.find((product) => product.id === Number(id)), quantity }))
      .filter(
        (item): item is { product: RestaurantMenuProduct; quantity: number } => Boolean(item.product),
      )

    if (items.length === 0) {
      if (loadCheckoutDraft()?.restaurantId === menu.restaurant.id) {
        clearCheckoutDraft()
      }
      return
    }

    saveCheckoutDraft({
      restaurantId: menu.restaurant.id,
      restaurantName: menu.restaurant.name,
      restaurantImageUrl: menu.restaurant.imageUrl,
      items: items.map(({ product, quantity }) => ({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
      })),
    })
  }

  function continueToCart() {
    if (!menu || cartItems.length === 0) return
    navigate('/cart')
  }

  async function toggleFavorite() {
    if (!menu || isSavingFavorite) return
    setIsSavingFavorite(true)
    try {
      const nextFavorite = !isFavorite
      await customerApi.setFavorite(menu.restaurant.id, nextFavorite)
      setIsFavorite(nextFavorite)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('menu.favoriteError'))
    } finally {
      setIsSavingFavorite(false)
    }
  }

  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    return (
      <section className="rounded-voro-xl border border-line bg-card p-6 text-center">
        <p className="font-bold text-content">{t('menu.notFound')}</p>
        <NavLink className="mt-4 inline-flex text-sm font-bold text-action hover:underline" to="/">
          {t('menu.backToRestaurants')}
        </NavLink>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="rounded-voro-xl border border-line bg-card p-6 text-sm text-muted-foreground">
        {t('menu.loading')}
      </section>
    )
  }

  if (!menu) {
    return (
      <section className="rounded-voro-xl border border-line bg-card p-6 text-center">
        <p className="font-bold text-content">{error || t('menu.notFound')}</p>
        <NavLink className="mt-4 inline-flex text-sm font-bold text-action hover:underline" to="/">
          {t('menu.backToRestaurants')}
        </NavLink>
      </section>
    )
  }

  return (
    <section className="grid gap-5">
      <NavLink
        className="inline-flex w-fit items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-content"
        to="/"
      >
        <ArrowLeft className="size-4" />
        {t('menu.backToRestaurants')}
      </NavLink>

      <header className="rounded-voro-xl border border-line bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {menu.restaurant.imageUrl ? (
            <img
              alt={menu.restaurant.name}
              className="size-16 rounded-voro-lg object-cover"
              src={menu.restaurant.imageUrl}
            />
          ) : (
            <span className="grid size-16 place-items-center rounded-voro-lg bg-accent text-action">
              <Store className="size-7" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-action">{t('menu.restaurantMenu')}</p>
            <h1 className="mt-2 text-2xl font-bold text-content sm:text-3xl">{menu.restaurant.name}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {menu.restaurant.description || t('restaurants.noDescription')}
            </p>
            <p className={`mt-3 text-xs font-bold ${menu.restaurant.isOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-300'}`}>
              {menu.restaurant.isOpen ? t('menu.openForOrders') : t('menu.currentlyClosed')}
            </p>
          </div>
          <Button aria-label={t('menu.toggleFavorite')} disabled={isSavingFavorite} onClick={toggleFavorite} size="icon" type="button" variant="outline">
            <Heart className={`size-4 ${isFavorite ? 'fill-action text-action' : ''}`} />
          </Button>
        </div>
      </header>

      {error ? (
        <p className="rounded-voro-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      {cartItems.length > 0 ? (
        <section className="flex flex-col gap-4 rounded-voro-xl border border-action/30 bg-accent p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-voro-lg bg-action text-action-text">
              <ShoppingBasket className="size-5" />
            </span>
            <div>
              <p className="font-bold text-content">{t('cart.savedTitle')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('cart.savedDescription', { count: itemCount, total: `${money.format(subtotal)} RSD` })}
              </p>
            </div>
          </div>
          <Button className="w-full sm:w-auto" onClick={continueToCart} type="button">
            {t('cart.continue')}
          </Button>
        </section>
      ) : null}
      <div className="grid gap-6">
          {productGroups(menu).map((category) => (
            <section key={category.id}>
              <div className="mb-3">
                <h2 className="text-lg font-bold text-content">{category.name}</h2>
                {category.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                ) : null}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {category.products.map((product) => {
                  const quantity = cart[product.id] || 0

                  return (
                    <article className="rounded-voro-xl border border-line bg-card p-4" key={product.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-bold text-content">{product.name}</h3>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {product.description || t('menu.noDescription')}
                          </p>
                        </div>
                        <p className="shrink-0 font-bold text-content">{money.format(product.price)} RSD</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        {quantity > 0 ? (
                          <div className="flex items-center rounded-voro-lg border border-line bg-background p-1">
                            <button
                              aria-label={t('menu.decrease', { name: product.name })}
                              className="grid size-8 place-items-center rounded-voro-md text-muted-foreground transition hover:bg-accent hover:text-content"
                              onClick={() => updateQuantity(product.id, -1)}
                              type="button"
                            >
                              <Minus className="size-4" />
                            </button>
                            <span className="min-w-8 text-center text-sm font-bold text-content">{quantity}</span>
                            <button
                              aria-label={t('menu.increase', { name: product.name })}
                              className="grid size-8 place-items-center rounded-voro-md text-muted-foreground transition hover:bg-accent hover:text-content"
                              onClick={() => updateQuantity(product.id, 1)}
                              type="button"
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground">{t('menu.available')}</span>
                        )}
                        <Button onClick={() => updateQuantity(product.id, 1)} size="sm" type="button">
                          {quantity ? t('menu.addAnother') : t('menu.addToCart')}
                        </Button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}

          {menu.products.length === 0 ? (
            <div className="rounded-voro-xl border border-dashed border-line bg-card p-8 text-center">
              <p className="font-bold text-content">{t('menu.empty')}</p>
            </div>
          ) : null}
      </div>
    </section>
  )
}
