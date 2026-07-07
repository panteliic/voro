import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input } from '@voro/ui'
import { ArrowLeft } from 'lucide-react'
import { useI18n } from '../i18n/i18n'
import { createDriver } from '../services/driversApi'
import type { SetupResult } from '../types/admin'
import type { CreateDriverPayload } from '../types/driver'

const emptyDriver: CreateDriverPayload = {
  name: '',
  email: '',
  phone: '',
  vehicleType: '',
}

export function CreateDriverPage() {
  const { t } = useI18n()
  const [form, setForm] = useState(emptyDriver)
  const [setup, setSetup] = useState<SetupResult | null>(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSetup(null)
    setIsSubmitting(true)

    try {
      const result = await createDriver(form)
      setForm(emptyDriver)
      setSetup({
        driverName: result.courier.name,
        driverEmail: result.courier.email,
        setupCode: result.setupCode,
      })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('createDriver.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid max-w-3xl gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('createDriver.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('createDriver.desc')}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/drivers">
            <ArrowLeft className="size-4" />
            {t('createDriver.back')}
          </Link>
        </Button>
      </div>

      {setup ? (
        <section className="rounded-voro-lg border border-action bg-accent p-4">
          <p className="font-bold">{t('createDriver.inviteReady')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('common.sendSetup', {
              name: setup.driverName || '',
              email: setup.driverEmail || '',
              code: setup.setupCode || '',
            })}
          </p>
        </section>
      ) : null}
      {error ? <p className="rounded-voro-lg border border-line bg-card p-3 text-sm font-bold text-red-700">{error}</p> : null}

      <section className="rounded-voro-lg border border-line bg-card p-5">
        <form className="grid gap-4" onSubmit={handleCreate}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder={t('common.name')} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <Input placeholder={t('common.email')} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            <Input placeholder={t('common.phone')} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            <Input placeholder={t('createDriver.vehicleType')} value={form.vehicleType} onChange={(event) => setForm((current) => ({ ...current, vehicleType: event.target.value }))} />
          </div>
          <Button className="sm:w-fit" disabled={isSubmitting} type="submit">
            {isSubmitting ? t('createRestaurant.creating') : t('createDriver.submit')}
          </Button>
        </form>
      </section>
    </div>
  )
}
