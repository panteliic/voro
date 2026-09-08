(() => {
  const storageKey = 'voro-theme'
  const root = document.documentElement

  let storedTheme = null

  try {
    storedTheme = window.localStorage.getItem(storageKey)
  } catch {
    storedTheme = null
  }

  const preference =
    storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system'
      ? storedTheme
      : 'system'
  const resolvedTheme =
    preference === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : preference

  root.classList.toggle('dark', resolvedTheme === 'dark')
  root.classList.toggle('dark-theme', resolvedTheme === 'dark')
  root.classList.toggle('light-theme', resolvedTheme === 'light')
  root.dataset.theme = preference
  root.dataset.resolvedTheme = resolvedTheme
  root.style.colorScheme = resolvedTheme
})()
