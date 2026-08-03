import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../app/hooks'
import { setAuthSession } from '../features/auth/authSlice'
import { useI18n } from '../i18n/i18n'
import type { AuthUser } from '../types/auth'

type AuthCallbackResult =
  | {
      ok: true
      accessToken: string
      refreshToken: string
      user: AuthUser
      message: string
    }
  | {
      ok: false
      error: string
    }

function parseAuthCallback(): AuthCallbackResult {
  const query = new URLSearchParams(window.location.search)
  const queryError = query.get('error')

  if (queryError) {
    return { ok: false, error: queryError }
  }

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const accessToken = params.get('accessToken')
  const refreshToken = params.get('refreshToken')
  const userRaw = params.get('user')

  if (!accessToken || !refreshToken || !userRaw) {
    return { ok: false, error: 'Could not complete social login.' }
  }

  try {
    return {
      ok: true,
      accessToken,
      refreshToken,
      user: JSON.parse(userRaw) as AuthUser,
      message: params.get('message') || 'Signed in.',
    }
  } catch {
    return { ok: false, error: 'Could not read social login session.' }
  }
}

function AuthCallback() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t } = useI18n()
  const result = useMemo(() => parseAuthCallback(), [])

  useEffect(() => {
    if (!result.ok) {
      return
    }

    dispatch(
      setAuthSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
        message: result.message,
      }),
    )
    window.history.replaceState(null, '', '/auth/callback')
    navigate('/', { replace: true })
  }, [dispatch, navigate, result])

  if (!result.ok) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-6 text-center text-content">
        <div>
          <h1 className="text-2xl font-bold">{t('auth.callback.failed')}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{result.error}</p>
          <Link className="mt-6 inline-flex font-medium text-action hover:underline" to="/login">
            {t('auth.callback.back')}
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-center text-content">
      <p className="text-sm text-muted-foreground">{t('auth.callback.completing')}</p>
    </main>
  )
}

export default AuthCallback
