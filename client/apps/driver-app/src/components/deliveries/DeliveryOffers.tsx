import { useEffect, useState } from 'react'
import { Banknote, BellRing, Clock3, CreditCard, MapPin, Navigation, Store } from 'lucide-react'
import { translate, type DriverLanguage } from '../../i18n'
import { getDeliveryOfferRouteEstimate } from '../../services/driverApi'
import type { DeliveryOffer, DriverOfferRouteEstimate } from '../../types/driver'

function remainingSeconds(expiresAt: string, now: number) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1_000))
}

export function DeliveryOffers({
  offers,
  isAccepting,
  language,
  token,
  onAccept,
  onDecline,
}: {
  offers: DeliveryOffer[]
  isAccepting: boolean
  language: DriverLanguage
  token: string
  onAccept: (offerId: number) => void
  onDecline: (offerId: number) => void
}) {
  const t = (key: string, values?: Record<string, string | number>) => translate(language, key, values)
  const [now, setNow] = useState(() => Date.now())
  const [routeEstimates, setRouteEstimates] = useState<Record<number, DriverOfferRouteEstimate>>({})

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(interval)
  }, [])

  const activeOffers = offers.filter((offer) => remainingSeconds(offer.expiresAt, now) > 0)
  const activeOfferKey = activeOffers.map((offer) => `${offer.id}:${offer.expiresAt}`).join('|')

  useEffect(() => {
    let active = true
    const activeOfferIds = new Set(activeOffers.map((offer) => offer.id))

    setRouteEstimates((current) => Object.fromEntries(
      Object.entries(current).filter(([offerId]) => activeOfferIds.has(Number(offerId))),
    ))

    void Promise.all(activeOffers.map(async (offer) => {
      try {
        return await getDeliveryOfferRouteEstimate(token, offer.id)
      } catch {
        return null
      }
    })).then((estimates) => {
      if (!active) return
      const next = estimates.filter((estimate): estimate is DriverOfferRouteEstimate => estimate !== null)
      if (next.length === 0) return
      setRouteEstimates((current) => ({
        ...current,
        ...Object.fromEntries(next.map((estimate) => [estimate.offerId, estimate])),
      }))
    })

    return () => {
      active = false
    }
  // Only a new/expired offer should recalculate its initial route estimate.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOfferKey, token])

  if (activeOffers.length === 0) {
    return null
  }

  return (
    <section className="rounded-voro-lg border border-action/40 bg-accent p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BellRing className="size-5 text-action" />
          <div>
            <h2 className="font-bold">{t('offers.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('offers.desc')}</p>
          </div>
        </div>
        <span className="rounded-voro-md bg-card px-3 py-2 text-xs font-bold text-action">
          {t('offers.active', { count: activeOffers.length })}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {activeOffers.map((offer) => {
          const seconds = remainingSeconds(offer.expiresAt, now)
          const routeEstimate = routeEstimates[offer.id]
          return (
            <article className="rounded-voro-md border border-line bg-card p-4" key={offer.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-muted-foreground">{t('offers.order', { id: offer.orderId })}</p>
                  <h3 className="mt-1 text-lg font-bold">{offer.restaurantName}</h3>
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-voro-md bg-muted px-2 py-1 text-xs font-bold text-action">
                  <Clock3 className="size-3" /> {seconds}s
                </span>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                <p className="flex items-start gap-2"><Store className="mt-0.5 size-4 shrink-0 text-action" />{offer.restaurantAddress || offer.restaurantName}</p>
                <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-emerald-600" />{offer.customerAddress || offer.customerName}</p>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-voro-md bg-muted px-3 py-2 text-sm">
                  <p className="flex items-center gap-1.5 font-bold text-content"><Navigation className="size-4 text-action" />{routeEstimate ? t('offers.toRestaurant', { minutes: routeEstimate.toRestaurant.etaMinutes }) : t('offers.calculatingRoute')}</p>
                  {routeEstimate ? <p className="mt-1 text-xs text-muted-foreground">{(routeEstimate.toRestaurant.distanceMeters / 1000).toFixed(1)} km</p> : null}
                </div>
                <div className="rounded-voro-md bg-accent px-3 py-2 text-sm">
                  <p className="flex items-center gap-1.5 font-bold text-action"><Clock3 className="size-4" />{routeEstimate ? t('offers.totalToCustomer', { minutes: routeEstimate.total.etaMinutes }) : t('offers.calculatingRoute')}</p>
                  {routeEstimate ? <p className="mt-1 text-xs text-muted-foreground">{(routeEstimate.total.distanceMeters / 1000).toFixed(1)} km</p> : null}
                </div>
              </div>
              <div className={`mt-4 flex items-start gap-2 rounded-voro-md px-3 py-2 text-sm ${offer.paymentMethod === 'cash' ? 'bg-action/10 text-content' : 'bg-muted text-muted-foreground'}`}>
                {offer.paymentMethod === 'cash' ? <Banknote className="mt-0.5 size-4 shrink-0 text-action" /> : <CreditCard className="mt-0.5 size-4 shrink-0" />}
                <span>
                  <strong className="block">{offer.paymentMethod === 'cash' ? t('payment.cash') : t('payment.card')}</strong>
                  {offer.paymentMethod === 'cash' ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {t('payment.collectCash', { amount: offer.total.toFixed(0) })}
                      {offer.changeDue > 0 ? ` · ${t('payment.changeDue', { amount: offer.changeDue.toFixed(0) })}` : ''}
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="font-bold">{offer.total.toFixed(0)} RSD</p>
                <div className="flex gap-2">
                  <button
                    className="rounded-voro-md border border-line px-3 py-2 text-sm font-bold text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isAccepting}
                    onClick={() => onDecline(offer.id)}
                    type="button"
                  >
                    {t('offers.decline')}
                  </button>
                  <button
                    className="rounded-voro-md bg-action px-4 py-2 text-sm font-bold text-action-text transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isAccepting}
                    onClick={() => onAccept(offer.id)}
                    type="button"
                  >
                    {isAccepting ? t('offers.sending') : t('offers.accept')}
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
