import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input } from '@voro/ui'
import { ArrowLeft, Bike, Car, CheckCircle2, KeyRound, MapPinned, ShieldCheck, UserRound } from 'lucide-react'
import { SetupInviteCard } from '../components/common/SetupInviteCard'
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
  const vehicleOptions = [
    { label: t('createDriver.bicycle'), value: 'Bicycle', icon: Bike },
    { label: t('createDriver.scooter'), value: 'Scooter', icon: Bike },
    { label: t('createDriver.car'), value: 'Car', icon: Car },
  ]

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
        setupUrl: result.setupUrl,
        inviteEmailSent: result.inviteEmailSent,
      })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('createDriver.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid w-full max-w-none gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('createDriver.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('createDriver.desc')}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/drivers">
            <ArrowLeft className="size-4" />
            {t('createDriver.back')}
          </Link>
        </Button>
      </div>

      {setup ? <SetupInviteCard invite={setup} /> : null}
      {error ? <p className="rounded-voro-lg border border-line bg-card p-3 text-sm font-bold text-red-700">{error}</p> : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <form className="grid gap-5" onSubmit={handleCreate}>
          <section className="overflow-hidden rounded-voro-lg border border-line bg-card">
            <div className="flex gap-3 border-b border-line px-5 py-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-voro-md bg-accent text-action"><UserRound className="size-4" /></span>
              <div>
                <h2 className="font-bold">{t('createDriver.profileTitle')}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{t('createDriver.profileDesc')}</p>
              </div>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-sm font-bold">{t('common.name')} <span className="text-action">*</span></span>
                <Input autoComplete="name" id="driver-name" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-bold">{t('common.email')} <span className="text-action">*</span></span>
                <Input autoComplete="email" id="driver-email" placeholder="driver@example.com" required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label className="grid gap-1.5 md:col-span-2">
                <span className="text-sm font-bold">{t('common.phone')} <span className="text-action">*</span></span>
                <Input autoComplete="tel" id="driver-phone" inputMode="tel" placeholder="+381 64 123 4567" required type="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
                <span className="text-xs text-muted-foreground">{t('createDriver.phoneHint')}</span>
              </label>
            </div>
          </section>

          <section className="overflow-hidden rounded-voro-lg border border-line bg-card">
            <div className="flex gap-3 border-b border-line px-5 py-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-voro-md bg-accent text-action"><Bike className="size-4" /></span>
              <div>
                <h2 className="font-bold">{t('createDriver.vehicleTitle')}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{t('createDriver.vehicleDesc')}</p>
              </div>
            </div>
            <div className="grid gap-4 p-5">
              <div className="grid gap-2 sm:grid-cols-3">
                {vehicleOptions.map(({ icon: Icon, label, value }) => {
                  const isSelected = form.vehicleType === value
                  return (
                    <button
                      aria-pressed={isSelected}
                      className={`flex min-h-20 items-center justify-center gap-2 rounded-voro-lg border p-3 text-sm font-bold transition-colors ${isSelected ? 'border-action bg-accent text-content' : 'border-line text-muted-foreground hover:border-action hover:bg-muted hover:text-content'}`}
                      key={value}
                      onClick={() => setForm((current) => ({ ...current, vehicleType: value }))}
                      type="button"
                    >
                      <Icon className="size-4" />
                      {label}
                    </button>
                  )
                })}
              </div>
              <label className="grid gap-1.5">
                <span className="text-sm font-bold">{t('createDriver.vehicleType')} <span className="text-action">*</span></span>
                <Input id="driver-vehicle" placeholder={t('createDriver.vehicleHint')} required value={form.vehicleType} onChange={(event) => setForm((current) => ({ ...current, vehicleType: event.target.value }))} />
                <span className="text-xs text-muted-foreground">{t('createDriver.vehicleHint')}</span>
              </label>
            </div>
          </section>

          <div className="flex flex-col gap-3 rounded-voro-lg border border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">{t('createDriver.requiredInfo')}</p>
            <Button disabled={isSubmitting} type="submit">
              <CheckCircle2 className="size-4" />
              {isSubmitting ? t('createRestaurant.creating') : t('createDriver.submit')}
            </Button>
          </div>
        </form>

        <aside className="grid gap-4 rounded-voro-lg border border-line bg-card p-5 xl:sticky xl:top-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-action" />
            <h2 className="font-bold">{t('createDriver.nextTitle')}</h2>
          </div>
          <ol className="grid gap-4">
            {[
              { icon: KeyRound, text: t('createDriver.nextCode') },
              { icon: MapPinned, text: t('createDriver.nextLocation') },
              { icon: ShieldCheck, text: t('createDriver.nextAvailability') },
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
