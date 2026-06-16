import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
type ResolvedTheme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'voro-theme'
const themePreferences: ThemePreference[] = ['system', 'light', 'dark']

type ThemeContextValue = {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function isThemePreference(value: string | null): value is ThemePreference {
  return Boolean(value && themePreferences.includes(value as ThemePreference))
}

function getStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system'
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(storedTheme) ? storedTheme : 'system'
  } catch {
    return 'system'
  }
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(theme: ThemePreference): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme
}

function applyTheme(theme: ThemePreference) {
  if (typeof document === 'undefined') {
    return resolveTheme(theme)
  }

  const resolvedTheme = resolveTheme(theme)
  const root = document.documentElement

  root.classList.toggle('dark', resolvedTheme === 'dark')
  root.classList.toggle('dark-theme', resolvedTheme === 'dark')
  root.classList.toggle('light-theme', resolvedTheme === 'light')
  root.dataset.theme = theme
  root.dataset.resolvedTheme = resolvedTheme
  root.style.colorScheme = resolvedTheme

  return resolvedTheme
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => getStoredTheme())
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme))

  useEffect(() => {
    setResolvedTheme(applyTheme(theme))

    if (theme !== 'system') {
      return
    }

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      setResolvedTheme(applyTheme('system'))
    }

    systemTheme.addEventListener('change', handleSystemThemeChange)

    return () => {
      systemTheme.removeEventListener('change', handleSystemThemeChange)
    }
  }, [theme])

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === THEME_STORAGE_KEY) {
        setThemeState(isThemePreference(event.newValue) ? event.newValue : 'system')
      }
    }

    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    setThemeState(nextTheme)

    try {
      if (nextTheme === 'system') {
        window.localStorage.removeItem(THEME_STORAGE_KEY)
      } else {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
      }
    } catch {
      // The in-memory theme still updates if storage is unavailable.
    }
  }, [])

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider.')
  }

  return context
}
