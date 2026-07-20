import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Banknote, CreditCard, MapPin, Minus, Plus, ReceiptText, ShieldCheck } from 'lucide-react'
import { Button, Input, Textarea } from '@voro/ui'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n/i18n'
import { customerApi } from '../../services/customerApi'
import type { CustomerOrderPaymentMethod, CustomerProfile } from '../../types/customer'
import {
  clearCheckoutDraft,
  loadCheckoutDraft,
  saveCheckoutDraft,
  type CheckoutDraft,
} from '../../types/checkout'

type CheckoutPanelProps = {
  profile: CustomerProfile | null
}

type CheckoutLocationState = {
  checkoutDraft?: CheckoutDraft
}

const deliveryFee = 250

function cashValue(value: string) {
  const amount = Number(value.replace(',', '.'))
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null
}

export function CheckoutPanel({ profile }: CheckoutPanelProps) {
  const { language, t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const locationDraft = (location.state as CheckoutLocationState | null)?.checkoutDraft
  const [draft, setDraft] = useState<CheckoutDraft | null>(() => locationDraft || loadCheckoutDraft())
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<CustomerOrderPaymentMethod>('card')
  const [cashTenderedInput, setCashTenderedInput] = useState('')
  const [error, setError] = useState('')
  const [isOrdering, setIsOrdering] = useState(false)
  const money = useMemo(
    () => new Intl.NumberFormat(language === 'sr' ? 'sr-RS' : 'en-US', { maximumFractionDigits: 0 }),
    [language],
  )

  useEffect(() => {
    if (locationDraft) {
      setDraft(locationDraft)
      saveCheckoutDraft(locationDraft)
    }
  }, [locationDraft])

  useEffect(() => {
    if (selectedAddressId || !profile) return

    const defaultAddress = profile.addresses.find((address) => address.isDefault) || profile.addresses[0]
    setSelectedAddressId(defaultAddress?.id || null)
  }, [profile, selectedAddressId])

  const subtotal = draft?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0
  const total = subtotal + deliveryFee
  const cashTendered = cashValue(cashTenderedInput)
  const changeDue = paymentMethod === 'cash' && cashTendered !== null ? Math.max(0, cashTendered - total) : 0
  const cashIsEnough = paymentMethod !== 'cash' || (cashTendered !== null && cashTendered >= total)
  const defaultCard = profile?.paymentMethods.find((method) => method.isDefault) || profile?.paymentMethods[0]

  function updateQuantity(productId: number, change: number) {
    setDraft((current) => {
      if (!current) return null

      const items = current.items
        .map((item) => item.productId === productId ? { ...item, quantity: item.quantity + change } : item)
        .filter((item) => item.quantity > 0)

      const nextDraft = items.length > 0 ? { ...current, items } : null

      if (nextDraft) saveCheckoutDraft(nextDraft)
      else clearCheckoutDraft()

      return nextDraft
    })
    setError('')
  }

  async function placeOrder() {
    if (!draft || !selectedAddressId || !cashIsEnough) return

    setIsOrdering(true)
    setError('')

    try {
      await customerApi.createOrder({
        restaurantId: draft.restaurantId,
        addressId: selectedAddressId,
        note,
        paymentMethod,
        cashTendered: paymentMethod === 'cash' ? cashTendered : null,
        items: draft.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      })
      clearCheckoutDraft()
      navigate('/orders')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('menu.orderError'))
    } finally {
      setIsOrdering(false)
    }
  }

  if (!draft || draft.items.length === 0) {
    return (
      <section className="mx-auto grid max-w-xl gap-4 rounded-voro-xl border border-line bg-card p-6 text-center sm:p-8">
        <ReceiptText className="mx-auto size-8 text-action" />
        <div>
          <h1 className="text-xl font-bold text-content">{t('checkout.empty')}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('menu.cartEmptyDesc')}</p>
        </div>
        <Button asChild className="mx-auto" type="button">
          <NavLink to="/">{t('menu.backToRestaurants')}</NavLink>
        </Button>
      </section>
    )
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-5 pb-6">
      <NavLink
        className="inline-flex w-fit items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-content"
        to={`/restaurants/${draft.restaurantId}`}
      >
        <ArrowLeft className="size-4" />
        {t('checkout.backToMenu')}
      </NavLink>

      <header className="flex flex-col gap-3 rounded-voro-xl border border-line bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-action">{t('menu.cart')}</p>
          <h1 className="mt-2 text-2xl font-bold text-content sm:text-3xl">{t('checkout.title')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{draft.restaurantName}</p>
        </div>
        <span className="w-fit rounded-full bg-action px-3 py-1.5 text-sm font-bold text-action-text">
          {draft.items.reduce((sum, item) => sum + item.quantity, 0)} {t('checkout.items')}
        </span>
      </header>

      {error ? (
        <p className="rounded-voro-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-5">
          <section className="rounded-voro-xl border border-line bg-card p-4 sm:p-5">
            <h2 className="font-bold text-content">{t('checkout.items')}</h2>
            <div className="mt-4 grid divide-y divide-line">
              {draft.items.map((item) => (
                <article className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" key={item.productId}>
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
                  <p className="w-20 text-right text-sm font-bold text-content">
                    {money.format(item.price * item.quantity)} RSD
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-voro-xl border border-line bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <MapPin className="size-5 text-action" />
              <h2 className="font-bold text-content">{t('menu.deliveryAddress')}</h2>
            </div>
            {profile?.addresses.length ? (
              <select
                className="mt-4 h-11 w-full rounded-voro-lg border border-line bg-background px-3 text-sm font-medium text-content"
                onChange={(event) => setSelectedAddressId(Number(event.target.value) || null)}
                value={selectedAddressId || ''}
              >
                {profile.addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {[address.label, address.street, address.city].filter(Boolean).join(' · ')}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-4 rounded-voro-lg border border-dashed border-line p-4 text-sm text-muted-foreground">
                {t('checkout.addressRequired')}{' '}
                <NavLink className="font-bold text-action hover:underline" to="/settings/delivery">
                  {t('menu.addAddress')}
                </NavLink>
              </div>
            )}
          </section>

          <section className="rounded-voro-xl border border-line bg-card p-4 sm:p-5">
            <h2 className="font-bold text-content">{t('checkout.paymentMethod')}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                aria-pressed={paymentMethod === 'card'}
                className={`grid gap-2 rounded-voro-lg border p-4 text-left transition ${
                  paymentMethod === 'card'
                    ? 'border-action bg-accent text-content'
                    : 'border-line bg-background text-muted-foreground hover:border-action/60'
                }`}
                onClick={() => { setPaymentMethod('card'); setError('') }}
                type="button"
              >
                <CreditCard className="size-5 text-action" />
                <span className="font-bold">{t('checkout.card')}</span>
                <span className="text-xs leading-5 text-muted-foreground">
                  {defaultCard
                    ? `${defaultCard.brand} · •••• ${defaultCard.last4}`
                    : t('checkout.cardDemoHint')}
                </span>
              </button>
              <button
                aria-pressed={paymentMethod === 'cash'}
                className={`grid gap-2 rounded-voro-lg border p-4 text-left transition ${
                  paymentMethod === 'cash'
                    ? 'border-action bg-accent text-content'
                    : 'border-line bg-background text-muted-foreground hover:border-action/60'
                }`}
                onClick={() => { setPaymentMethod('cash'); setError('') }}
                type="button"
              >
                <Banknote className="size-5 text-action" />
                <span className="font-bold">{t('checkout.cash')}</span>
                <span className="text-xs leading-5 text-muted-foreground">{t('checkout.cashHint')}</span>
              </button>
            </div>

            {paymentMethod === 'cash' ? (
              <div className="mt-4 rounded-voro-lg border border-action/30 bg-accent/60 p-4">
                <label className="grid gap-2 text-sm font-bold text-content">
                  {t('checkout.cashTendered')}
                  <div className="relative">
                    <Input
                      className="pr-12 text-base font-bold"
                      inputMode="decimal"
                      min={total}
                      onChange={(event) => { setCashTenderedInput(event.target.value); setError('') }}
                      placeholder={String(Math.ceil(total / 100) * 100)}
                      type="number"
                      value={cashTenderedInput}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">RSD</span>
                  </div>
                </label>
                {cashTendered !== null && cashTendered < total ? (
                  <p className="mt-3 text-sm font-bold text-destructive">{t('checkout.cashInsufficient')}</p>
                ) : null}
                {cashTendered !== null && cashTendered >= total ? (
                  <div className="mt-3 flex items-center justify-between rounded-voro-md bg-card px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{t('checkout.changeDue')}</span>
                    <strong className="text-content">{money.format(changeDue)} RSD</strong>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 flex items-start gap-2 rounded-voro-lg border border-line bg-background px-3 py-3 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-action" />
                <span>{t('checkout.cardDemoHint')}</span>
              </div>
            )}
          </section>

          <label className="grid gap-2 rounded-voro-xl border border-line bg-card p-4 text-sm font-bold text-content sm:p-5">
            {t('menu.orderNote')}
            <Textarea
              className="min-h-24 resize-y"
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('menu.orderNotePlaceholder')}
              value={note}
            />
          </label>
        </div>

        <aside className="lg:sticky lg:top-5">
          <section className="rounded-voro-xl border border-line bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <ReceiptText className="size-5 text-action" />
              <h2 className="font-bold text-content">{t('checkout.summary')}</h2>
            </div>
            <div className="mt-5 grid gap-3 border-b border-line pb-4 text-sm">
              <div className="flex justify-between gap-3 text-muted-foreground">
                <span>{t('menu.subtotal')}</span>
                <span>{money.format(subtotal)} RSD</span>
              </div>
              <div className="flex justify-between gap-3 text-muted-foreground">
                <span>{t('menu.deliveryFee')}</span>
                <span>{money.format(deliveryFee)} RSD</span>
              </div>
              {paymentMethod === 'cash' && cashTendered !== null && cashTendered >= total ? (
                <div className="flex justify-between gap-3 text-muted-foreground">
                  <span>{t('checkout.changeDue')}</span>
                  <span>{money.format(changeDue)} RSD</span>
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-lg font-bold text-content">
              <span>{t('menu.total')}</span>
              <span>{money.format(total)} RSD</span>
            </div>
            <Button
              className="mt-5 w-full"
              disabled={isOrdering || !selectedAddressId || !cashIsEnough}
              onClick={() => void placeOrder()}
              size="lg"
              type="button"
            >
              {isOrdering ? t('menu.placingOrder') : t('checkout.confirmOrder')}
            </Button>
          </section>
        </aside>
      </div>
    </section>
  )
}
