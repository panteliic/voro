import { useState } from 'react'
import { ArrowLeft, Minus, Plus, ReceiptText, ShoppingBasket, Trash2 } from 'lucide-react'
import { Button } from '@voro/ui'
import { NavLink, useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n/i18n'
import {
  clearCheckoutDraft,
  loadCheckoutDraft,
  saveCheckoutDraft,
  type CheckoutDraft,
} from '../../types/checkout'

const deliveryFee = 250

export function CartPanel() {
  const navigate = useNavigate()
  const { language, t } = useI18n()
  const [draft, setDraft] = useState<CheckoutDraft | null>(() => loadCheckoutDraft())
  const money = new Intl.NumberFormat(language === 'sr' ? 'sr-RS' : 'en-US', {
    maximumFractionDigits: 0,
  })
  const itemCount = draft?.items.reduce((sum, item) => sum + item.quantity, 0) || 0
  const subtotal = draft?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0
  const total = subtotal + deliveryFee
  const hasItems = Boolean(draft && draft.items.length > 0)

  function updateQuantity(productId: number, change: number) {
    if (!draft) return

    const items = draft.items
      .map((item) => item.productId === productId
        ? { ...item, quantity: Math.min(20, item.quantity + change) }
        : item)
      .filter((item) => item.quantity > 0)
    const nextDraft = items.length > 0 ? { ...draft, items } : null

    setDraft(nextDraft)
    if (nextDraft) {
      saveCheckoutDraft(nextDraft)
    } else {
      clearCheckoutDraft()
    }
  }

  function clearCart() {
    clearCheckoutDraft()
    setDraft(null)
  }

  if (!hasItems || !draft) {
    return (
      <section className="mx-auto grid max-w-xl gap-5 rounded-voro-xl border border-line bg-card p-6 text-center sm:p-8">
        <span className="mx-auto grid size-12 place-items-center rounded-voro-xl bg-accent text-action">
          <ShoppingBasket className="size-6" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-action">{t('cart.pending')}</p>
          <h1 className="mt-2 text-2xl font-bold text-content">{t('cart.emptyTitle')}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('cart.emptyDescription')}</p>
        </div>
        <Button className="mx-auto" onClick={() => navigate('/')} type="button">
          {t('cart.browseRestaurants')}
        </Button>
      </section>
    )
  }

  return (
    <section className="mx-auto grid max-w-3xl gap-5">
      <NavLink
        className="inline-flex w-fit items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-content"
        to={`/restaurants/${draft.restaurantId}`}
      >
        <ArrowLeft className="size-4" />
        {t('cart.backToMenu')}
      </NavLink>

      <header className="flex flex-col gap-4 rounded-voro-xl border border-action/30 bg-accent p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-voro-lg bg-action text-action-text">
            <ShoppingBasket className="size-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-action">{t('cart.pending')}</p>
            <h1 className="mt-1 text-2xl font-bold text-content">{t('cart.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('cart.fromRestaurant', { name: draft.restaurantName })}</p>
          </div>
        </div>
        <Button className="self-start sm:self-auto" onClick={clearCart} type="button" variant="outline">
          <Trash2 className="size-4" />
          {t('cart.clear')}
        </Button>
      </header>

      <section className="rounded-voro-xl border border-line bg-card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <ReceiptText className="size-5 text-action" />
            <h2 className="font-bold text-content">{t('cart.items')}</h2>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
            {t('cart.itemCount', { count: itemCount })}
          </span>
        </div>

        <div className="divide-y divide-line">
          {draft.items.map((item) => (
            <div className="flex items-center gap-3 py-4" key={item.productId}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-content">{item.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{money.format(item.price)} RSD</p>
              </div>
              <div className="flex items-center rounded-voro-md border border-line bg-background p-0.5">
                <button
                  aria-label={t('menu.decrease', { name: item.name })}
                  className="grid size-8 place-items-center rounded-voro-sm text-muted-foreground transition hover:bg-accent hover:text-content"
                  onClick={() => updateQuantity(item.productId, -1)}
                  type="button"
                >
                  <Minus className="size-4" />
                </button>
                <span className="min-w-8 text-center text-sm font-bold text-content">{item.quantity}</span>
                <button
                  aria-label={t('menu.increase', { name: item.name })}
                  className="grid size-8 place-items-center rounded-voro-sm text-muted-foreground transition hover:bg-accent hover:text-content"
                  onClick={() => updateQuantity(item.productId, 1)}
                  type="button"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <p className="w-20 text-right text-sm font-bold text-content">{money.format(item.price * item.quantity)} RSD</p>
            </div>
          ))}
        </div>

        <div className="mt-2 grid gap-2 border-t border-line pt-4 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{t('menu.subtotal')}</span>
            <span>{money.format(subtotal)} RSD</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{t('menu.deliveryFee')}</span>
            <span>{money.format(deliveryFee)} RSD</span>
          </div>
          <div className="flex items-center justify-between pt-1 text-base font-bold text-content">
            <span>{t('menu.total')}</span>
            <span>{money.format(total)} RSD</span>
          </div>
        </div>

        <Button className="mt-5 w-full" onClick={() => navigate('/checkout', { state: { checkoutDraft: draft } })} type="button">
          {t('cart.checkout')}
        </Button>
      </section>
    </section>
  )
}
