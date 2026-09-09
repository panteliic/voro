import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input, Textarea } from '@voro/ui'
import { ArrowLeft, CheckCircle2, KeyRound, Mail, MapPin, Store, Tags, UserRound } from 'lucide-react'
import { SetupInviteCard } from '../components/common/SetupInviteCard'
import { useI18n } from '../i18n/i18n'
import { createRestaurant, listRestaurantCategories, resolveRestaurantLocation } from '../services/restaurantsApi'
import { searchLocations, type LocationSuggestion } from '../services/locationSearchApi'
import type { SetupResult } from '../types/admin'
import type { CreateRestaurantPayload, RestaurantCategory } from '../types/restaurant'

type ResolvedLocation = { latitude: number; longitude: number; displayName: string }

const emptyRestaurant: CreateRestaurantPayload = {
  contactName: '',
  contactEmail: '',
  restaurantName: '',
  categoryName: '',
  categoryIds: [],
  description: '',
  phone: '',
  email: '',
  imageUrl: '',
  address: '',
}

export function CreateRestaurantPage() {
  const { t } = useI18n()
  const [form, setForm] = useState(emptyRestaurant)
  const [categories, setCategories] = useState<RestaurantCategory[]>([])
  const [setup, setSetup] = useState<SetupResult | null>(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [location, setLocation] = useState<ResolvedLocation | null>(null)
  const [locationError, setLocationError] = useState('')
  const [isResolvingLocation, setIsResolvingLocation] = useState(false)
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const selectedAddressRef = useRef('')

  useEffect(() => {
    let isMounted = true

    listRestaurantCategories()
      .then((result) => {
        if (isMounted) {
          setCategories(result.categories)
        }
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : t('restaurants.error'))
        }
      })

    return () => {
      isMounted = false
    }
  }, [t])

  useEffect(() => {
    const query = form.address.trim()

    if (query.length < 3 || selectedAddressRef.current === query) {
      if (selectedAddressRef.current === query) selectedAddressRef.current = ''
      setSuggestions([])
      setSearchError('')
      setIsSearching(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      setIsSearching(true)
      searchLocations(query, controller.signal)
        .then((results) => {
          setSuggestions(results)
          setSearchError('')
        })
        .catch((requestError: unknown) => {
          if (!controller.signal.aborted) {
            setSuggestions([])
            setSearchError(requestError instanceof Error ? requestError.message : t('createRestaurant.error'))
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false)
        })
    }, 350)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [form.address, t])

  function toggleCategory(categoryId: number) {
    setForm((current) => {
      const exists = current.categoryIds.includes(categoryId)

      return {
        ...current,
        categoryIds: exists
          ? current.categoryIds.filter((id) => id !== categoryId)
          : [...current.categoryIds, categoryId],
      }
    })
  }

  async function resolveAddress() {
    const address = form.address.trim()
    if (!address || suggestions.length > 0) return

    setLocationError('')
    setIsResolvingLocation(true)

    try {
      const result = await resolveRestaurantLocation(address)
      setLocation(result.location)
    } catch (requestError) {
      setLocation(null)
      setLocationError(requestError instanceof Error ? requestError.message : t('createRestaurant.error'))
    } finally {
      setIsResolvingLocation(false)
    }
  }

  function handleSelectSuggestion(suggestion: LocationSuggestion) {
    selectedAddressRef.current = suggestion.label
    setForm((current) => ({ ...current, address: suggestion.label }))
    setLocation({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      displayName: suggestion.label,
    })
    setSuggestions([])
    setSearchError('')
    setLocationError('')
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSetup(null)
    setIsSubmitting(true)

    try {
      const result = await createRestaurant(form)
      setForm(emptyRestaurant)
      setLocation(null)
      setSetup({
        restaurantName: result.restaurant.name,
        operatorEmail: result.operator.email,
        setupCode: result.setupCode,
        setupUrl: result.setupUrl,
        inviteEmailSent: result.inviteEmailSent,
      })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('createRestaurant.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid w-full max-w-none gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('createRestaurant.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('createRestaurant.desc')}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/restaurants">
            <ArrowLeft className="size-4" />
            {t('createRestaurant.back')}
          </Link>
        </Button>
      </div>

      {setup ? <SetupInviteCard invite={setup} /> : null}
      {error ? <p className="rounded-voro-lg border border-line bg-card p-3 text-sm font-bold text-red-700">{error}</p> : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <form className="grid gap-5" onSubmit={handleCreate}>
          <section className="overflow-hidden rounded-voro-lg border border-line bg-card">
            <div className="flex gap-3 border-b border-line px-5 py-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-voro-md bg-accent text-action"><Store className="size-4" /></span>
              <div>
                <h2 className="font-bold">{t('createRestaurant.businessTitle')}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{t('createRestaurant.businessDesc')}</p>
              </div>
            </div>

            <div className="grid gap-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-bold">{t('createRestaurant.restaurantName')} <span className="text-action">*</span></span>
                  <Input autoComplete="organization" id="restaurant-name" required value={form.restaurantName} onChange={(event) => setForm((current) => ({ ...current, restaurantName: event.target.value }))} />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-bold">{t('createRestaurant.phone')}</span>
                  <Input autoComplete="tel" id="restaurant-phone" inputMode="tel" placeholder="+381 11 123 456" type="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
                </label>
                <label className="grid gap-1.5 md:col-span-2">
                  <span className="text-sm font-bold">{t('createRestaurant.publicEmail')}</span>
                  <Input autoComplete="email" id="restaurant-email" placeholder="hello@restaurant.rs" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                  <span className="text-xs text-muted-foreground">{t('createRestaurant.emailHint')}</span>
                </label>
              </div>

              <div className="grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">{t('createRestaurant.category')}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t('createRestaurant.categoriesHint')}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">{t('createRestaurant.categoriesSelected', { count: form.categoryIds.length })}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const isSelected = form.categoryIds.includes(category.id)

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`rounded-voro-md border px-3 py-2 text-sm font-bold transition-colors ${
                          isSelected
                            ? 'border-action bg-accent text-content'
                            : 'border-line text-muted-foreground hover:border-action hover:bg-muted hover:text-content'
                        }`}
                        key={category.id}
                        onClick={() => toggleCategory(category.id)}
                        type="button"
                      >
                        {category.icon ? `${category.icon} ` : ''}{category.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-4">
                <label className="grid gap-1.5">
                  <span className="text-sm font-bold">{t('createRestaurant.description')}</span>
                  <Textarea id="restaurant-description" maxLength={280} placeholder={t('createRestaurant.descriptionHint')} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                  <span className="text-xs text-muted-foreground">{t('createRestaurant.descriptionCount', { count: form.description.length })}</span>
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-bold">{t('createRestaurant.imageUrl')}</span>
                  <Input id="restaurant-image" placeholder="https://..." type="url" value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} />
                  <span className="text-xs text-muted-foreground">{t('createRestaurant.imageHint')}</span>
                </label>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-voro-lg border border-line bg-card">
            <div className="flex gap-3 border-b border-line px-5 py-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-voro-md bg-accent text-action"><MapPin className="size-4" /></span>
              <div>
                <h2 className="font-bold">{t('createRestaurant.locationTitle')}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{t('createRestaurant.locationDesc')}</p>
              </div>
            </div>
            <div className="grid gap-4 p-5">
              <div className="grid gap-1.5">
                <label className="text-sm font-bold" htmlFor="restaurant-address">{t('createRestaurant.address')} <span className="text-action">*</span></label>
                <div className="relative">
                  <Input autoComplete="street-address" id="restaurant-address" placeholder="Knez Mihailova 10, Beograd" required value={form.address} onBlur={() => void resolveAddress()} onChange={(event) => {
                    setForm((current) => ({ ...current, address: event.target.value }))
                    setLocation(null)
                    setLocationError('')
                  }} />
                  {isSearching || suggestions.length > 0 || searchError ? (
                    <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-voro-lg border border-line bg-card py-1 shadow-lg">
                      {isSearching ? <p className="px-3 py-2 text-sm text-muted-foreground">{t('createRestaurant.suggestionsLoading')}</p> : null}
                      {searchError ? <p className="px-3 py-2 text-sm text-red-700">{searchError}</p> : null}
                      {suggestions.map((suggestion) => (
                        <button
                          className="block w-full cursor-pointer px-3 py-2 text-left text-sm font-medium text-content transition hover:bg-accent"
                          key={suggestion.id}
                          onClick={() => handleSelectSuggestion(suggestion)}
                          onMouseDown={(event) => event.preventDefault()}
                          type="button"
                        >
                          {suggestion.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">{t('createRestaurant.addressHint')}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-sm font-bold">{t('createRestaurant.latitude')}</span>
                <Input id="restaurant-latitude" placeholder="—" readOnly value={location ? location.latitude.toFixed(6) : ''} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-bold">{t('createRestaurant.longitude')}</span>
                <Input id="restaurant-longitude" placeholder="—" readOnly value={location ? location.longitude.toFixed(6) : ''} />
              </label>
              </div>
              <p className={`text-xs ${locationError ? 'font-medium text-red-700' : 'text-muted-foreground'}`}>
                {locationError || (isResolvingLocation
                  ? t('createRestaurant.locationResolving')
                  : location
                    ? t('createRestaurant.locationFound', { name: location.displayName })
                    : t('createRestaurant.locationPending'))}
              </p>
              <p className="text-xs text-muted-foreground">{t('createRestaurant.locationHint')}</p>
            </div>
          </section>

          <section className="overflow-hidden rounded-voro-lg border border-line bg-card">
            <div className="flex gap-3 border-b border-line px-5 py-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-voro-md bg-accent text-action"><UserRound className="size-4" /></span>
              <div>
                <h2 className="font-bold">{t('createRestaurant.operatorTitle')}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{t('createRestaurant.operatorDesc')}</p>
              </div>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-sm font-bold">{t('createRestaurant.contactName')} <span className="text-action">*</span></span>
                <Input autoComplete="name" id="restaurant-contact-name" required value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-bold">{t('createRestaurant.contactEmail')} <span className="text-action">*</span></span>
                <Input autoComplete="email" id="restaurant-contact-email" placeholder="manager@restaurant.rs" required type="email" value={form.contactEmail} onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} />
              </label>
            </div>
          </section>

          <div className="flex flex-col gap-3 rounded-voro-lg border border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">{t('createRestaurant.requiredInfo')}</p>
            <Button disabled={isSubmitting} type="submit">
              <CheckCircle2 className="size-4" />
              {isSubmitting ? t('createRestaurant.creating') : t('createRestaurant.submit')}
            </Button>
          </div>
        </form>

        <aside className="grid gap-4 rounded-voro-lg border border-line bg-card p-5 xl:sticky xl:top-5">
          <div className="flex items-center gap-2">
            <Tags className="size-4 text-action" />
            <h2 className="font-bold">{t('createRestaurant.nextTitle')}</h2>
          </div>
          <ol className="grid gap-4">
            {[
              { icon: KeyRound, text: t('createRestaurant.nextCode') },
              { icon: Mail, text: t('createRestaurant.nextInvite') },
              { icon: Store, text: t('createRestaurant.nextMenu') },
            ].map(({ icon: Icon, text }, index) => (
              <li className="flex gap-3 text-sm text-muted-foreground" key={text}>
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-action">{index + 1}</span>
                <span>{text}</span>
                <Icon className="ml-auto size-4 shrink-0 text-muted-foreground/70" />
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  )
}
