import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input, Textarea } from '@voro/ui'
import { ArrowLeft } from 'lucide-react'
import { useI18n } from '../i18n/i18n'
import { createRestaurant, listRestaurantCategories } from '../services/restaurantsApi'
import type { SetupResult } from '../types/admin'
import type { CreateRestaurantPayload, RestaurantCategory } from '../types/restaurant'

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
}

export function CreateRestaurantPage() {
  const { t } = useI18n()
  const [form, setForm] = useState(emptyRestaurant)
  const [categories, setCategories] = useState<RestaurantCategory[]>([])
  const [setup, setSetup] = useState<SetupResult | null>(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSetup(null)
    setIsSubmitting(true)

    try {
      const result = await createRestaurant(form)
      setForm(emptyRestaurant)
      setSetup({
        restaurantName: result.restaurant.name,
        operatorEmail: result.operator.email,
        setupCode: result.setupCode,
      })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('createRestaurant.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid max-w-4xl gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('createRestaurant.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('createRestaurant.desc')}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/restaurants">
            <ArrowLeft className="size-4" />
            {t('createRestaurant.back')}
          </Link>
        </Button>
      </div>

      {setup ? (
        <section className="rounded-voro-lg border border-action bg-accent p-4">
          <p className="font-bold">{t('createRestaurant.inviteReady')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('common.sendSetup', {
              name: setup.restaurantName || '',
              email: setup.operatorEmail || '',
              code: setup.setupCode || '',
            })}
          </p>
        </section>
      ) : null}
      {error ? <p className="rounded-voro-lg border border-line bg-card p-3 text-sm font-bold text-red-700">{error}</p> : null}

      <section className="rounded-voro-lg border border-line bg-card p-5">
        <form className="grid gap-4" onSubmit={handleCreate}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder={t('createRestaurant.restaurantName')} value={form.restaurantName} onChange={(event) => setForm((current) => ({ ...current, restaurantName: event.target.value }))} />
            <Input placeholder={t('createRestaurant.phone')} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            <Input placeholder={t('createRestaurant.publicEmail')} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            <Input className="md:col-span-2" placeholder={t('createRestaurant.imageUrl')} value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} />
            <Textarea className="md:col-span-2" placeholder={t('createRestaurant.description')} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-bold text-muted-foreground">{t('createRestaurant.category')}</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const isSelected = form.categoryIds.includes(category.id)

                return (
                  <button
                    className={`rounded-voro-md border px-3 py-2 text-sm font-bold ${
                      isSelected
                        ? 'border-action bg-accent text-content'
                        : 'border-line text-muted-foreground hover:bg-muted hover:text-content'
                    }`}
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    type="button"
                  >
                    {category.name}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="h-px bg-line" />
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder={t('createRestaurant.contactName')} value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} />
            <Input placeholder={t('createRestaurant.contactEmail')} value={form.contactEmail} onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} />
          </div>
          <Button className="sm:w-fit" disabled={isSubmitting} type="submit">
            {isSubmitting ? t('createRestaurant.creating') : t('createRestaurant.submit')}
          </Button>
        </form>
      </section>
    </div>
  )
}
