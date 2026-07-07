import { useEffect, useMemo, useState } from 'react'
import { Input } from '@voro/ui'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { DataTable } from '../components/common/DataTable'
import { LoadingState } from '../components/common/LoadingState'
import { StatusBadge } from '../components/common/StatusBadge'
import { useI18n } from '../i18n/i18n'
import { listUsers, updateUserStatus } from '../services/usersApi'
import type { AdminUser } from '../types/user'

export function UsersPage() {
  const { t } = useI18n()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [pendingId, setPendingId] = useState<number | null>(null)

  async function loadUsers() {
    setError('')
    const result = await listUsers()
    setUsers(result.users)
    setSelectedUser((current) => {
      if (!current) {
        return result.users[0] || null
      }

      return result.users.find((user) => user.id === current.id) || result.users[0] || null
    })
  }

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const result = await listUsers()

        if (isMounted) {
          setUsers(result.users)
          setSelectedUser(result.users[0] || null)
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : t('users.error'))
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

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) {
      return users
    }

    return users.filter((user) =>
      [user.name, user.email, user.role, user.restaurantName, user.vehicleType]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [search, users])

  async function handleStatus(user: AdminUser) {
    setPendingId(user.id)
    setError('')

    try {
      await updateUserStatus(user.id, !user.isActive)
      await loadUsers()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('users.updateError'))
    } finally {
      setPendingId(null)
    }
  }

  if (isLoading) {
    return <LoadingState label={t('users.loading')} />
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
      <section className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('users.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('users.desc')}</p>
          </div>
          <Input
            className="sm:max-w-xs"
            placeholder={t('users.search')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {error ? <p className="rounded-voro-lg border border-line bg-card p-3 text-sm font-bold text-red-700">{error}</p> : null}
        <DataTable
          columns={[
            {
              key: 'user',
              header: t('dashboard.user'),
              render: (user) => (
                <button
                  className="text-left font-bold text-content hover:text-action"
                  onClick={() => setSelectedUser(user)}
                  type="button"
                >
                  {user.name}
                  <span className="block text-xs font-medium text-muted-foreground">{user.email}</span>
                </button>
              ),
            },
            { key: 'role', header: t('common.role'), render: (user) => <StatusBadge>{user.role}</StatusBadge> },
            {
              key: 'status',
              header: t('common.status'),
              render: (user) => (
                <StatusBadge tone={user.isActive ? 'success' : 'danger'}>
                  {user.isActive ? t('common.active') : t('common.blocked')}
                </StatusBadge>
              ),
            },
            {
              key: 'action',
              header: t('common.action'),
              render: (user) => (
                <ConfirmDialog
                  disabled={pendingId === user.id}
                  message={t('users.confirmStatus', {
                    action: user.isActive ? t('users.block').toLowerCase() : t('users.unblock').toLowerCase(),
                    email: user.email,
                  })}
                  onConfirm={() => void handleStatus(user)}
                >
                  {user.isActive ? t('users.block') : t('users.unblock')}
                </ConfirmDialog>
              ),
            },
          ]}
          emptyTitle={t('users.noUsers')}
          getRowKey={(user) => user.id}
          rows={filteredUsers}
        />
      </section>
      <aside className="self-start rounded-voro-lg border border-line bg-card p-4">
        <h2 className="text-lg font-bold">{t('users.details')}</h2>
        {selectedUser ? (
          <dl className="mt-4 grid gap-3 text-sm">
            <div><dt className="font-bold text-muted-foreground">{t('common.name')}</dt><dd>{selectedUser.name}</dd></div>
            <div><dt className="font-bold text-muted-foreground">{t('common.email')}</dt><dd>{selectedUser.email}</dd></div>
            <div><dt className="font-bold text-muted-foreground">{t('common.role')}</dt><dd>{selectedUser.role}</dd></div>
            <div><dt className="font-bold text-muted-foreground">{t('users.verified')}</dt><dd>{selectedUser.emailVerified ? t('common.yes') : t('common.no')}</dd></div>
            {selectedUser.restaurantName ? <div><dt className="font-bold text-muted-foreground">{t('users.restaurant')}</dt><dd>{selectedUser.restaurantName}</dd></div> : null}
            {selectedUser.courierPhone ? <div><dt className="font-bold text-muted-foreground">{t('users.driverPhone')}</dt><dd>{selectedUser.courierPhone}</dd></div> : null}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{t('users.select')}</p>
        )}
      </aside>
    </div>
  )
}
