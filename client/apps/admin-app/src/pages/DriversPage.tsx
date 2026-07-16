import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input, Switch } from '@voro/ui'
import { Plus } from 'lucide-react'
import { DataTable } from '../components/common/DataTable'
import { LoadingState } from '../components/common/LoadingState'
import { StatusBadge } from '../components/common/StatusBadge'
import { useI18n } from '../i18n/i18n'
import { listDrivers, resetDriverPassword, updateDriverStatus } from '../services/driversApi'
import type { SetupResult } from '../types/admin'
import type { Driver } from '../types/driver'

export function DriversPage() {
  const { t } = useI18n()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [search, setSearch] = useState('')
  const [resetSetup, setResetSetup] = useState<SetupResult | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [pendingResetId, setPendingResetId] = useState<number | null>(null)

  async function loadDrivers() {
    const result = await listDrivers()
    setDrivers(result.couriers)
  }

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const result = await listDrivers()

        if (isMounted) {
          setDrivers(result.couriers)
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : t('drivers.error'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [t])

  const filteredDrivers = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) {
      return drivers
    }

    return drivers.filter((driver) =>
      [driver.name, driver.email, driver.phone, driver.vehicleType]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [drivers, search])

  async function handleStatus(driver: Driver, isAvailable: boolean) {
    setPendingId(driver.id)
    setError('')

    try {
      await updateDriverStatus(driver.id, isAvailable)
      await loadDrivers()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('drivers.updateError'))
    } finally {
      setPendingId(null)
    }
  }

  async function handleResetPassword(driver: Driver) {
    if (!window.confirm(t('drivers.confirmReset', { name: driver.name }))) {
      return
    }

    setPendingResetId(driver.id)
    setResetSetup(null)
    setError('')

    try {
      const result = await resetDriverPassword(driver.id)
      setResetSetup({
        driverName: result.courier.name,
        driverEmail: result.courier.email,
        setupCode: result.setupCode,
      })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('drivers.resetError'))
    } finally {
      setPendingResetId(null)
    }
  }

  if (isLoading) {
    return <LoadingState label={t('drivers.loading')} />
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('drivers.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('drivers.desc')}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            className="sm:w-80"
            placeholder={t('drivers.search')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button asChild>
            <Link to="/drivers/new">
              <Plus className="size-4" />
              {t('drivers.create')}
            </Link>
          </Button>
        </div>
      </div>
      {resetSetup ? (
        <section className="rounded-voro-lg border border-action bg-accent p-4">
          <p className="font-bold">{t('drivers.newCode')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('common.sendSetup', {
              name: resetSetup.driverName || '',
              email: resetSetup.driverEmail || '',
              code: resetSetup.setupCode || '',
            })}
          </p>
        </section>
      ) : null}
      {error ? <p className="rounded-voro-lg border border-line bg-card p-3 text-sm font-bold text-red-700">{error}</p> : null}
      <DataTable
        columns={[
          {
            key: 'driver',
            header: t('drivers.driver'),
            render: (driver) => (
              <div>
                <Link className="font-bold text-content hover:text-action" to={`/drivers/${driver.id}`}>{driver.name}</Link>
                <p className="text-xs text-muted-foreground">{driver.email}</p>
              </div>
            ),
          },
          { key: 'phone', header: t('common.phone'), render: (driver) => driver.phone || t('common.notSet') },
          { key: 'vehicle', header: t('drivers.vehicle'), render: (driver) => driver.vehicleType || t('common.notSet') },
          {
            key: 'status',
            header: t('common.status'),
            render: (driver) => (
              <StatusBadge tone={driver.isAvailable ? 'success' : 'warning'}>
                {driver.isAvailable ? t('common.available') : t('common.inactive')}
              </StatusBadge>
            ),
          },
          {
            key: 'toggle',
            header: t('common.available'),
            render: (driver) => (
              <Switch
                checked={driver.isAvailable}
                disabled={pendingId === driver.id}
                onCheckedChange={(checked) => void handleStatus(driver, checked)}
              />
            ),
          },
          {
            key: 'password',
            header: t('common.password'),
            render: (driver) => (
              <Button
                disabled={pendingResetId === driver.id}
                onClick={() => void handleResetPassword(driver)}
                size="sm"
                type="button"
                variant="outline"
              >
                {t('common.reset')}
              </Button>
            ),
          },
        ]}
        emptyTitle={t('drivers.noDrivers')}
        getRowKey={(driver) => driver.id}
        rows={filteredDrivers}
      />
    </div>
  )
}
