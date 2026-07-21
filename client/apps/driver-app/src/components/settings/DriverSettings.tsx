import { Bell, Globe2, MapPin, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { translate, type DriverLanguage } from '../../i18n'
import { enableDriverPushNotifications } from '../../services/pushNotifications'

export type DriverTheme = 'light' | 'dark'

export function DriverSettings({
  language,
  theme,
  showDemoLocation,
  isDemoLocation,
  onLanguageChange,
  onDemoLocationChange,
  onThemeChange,
  token,
}: {
  language: DriverLanguage
  theme: DriverTheme
  showDemoLocation: boolean
  isDemoLocation: boolean
  onLanguageChange: (language: DriverLanguage) => void
  onDemoLocationChange: (enabled: boolean) => void
  onThemeChange: (theme: DriverTheme) => void
  token: string
}) {
  const t = (key: string, values?: Record<string, string | number>) => translate(language, key, values)
  const [pushStatus, setPushStatus] = useState('')

  async function enablePush() {
    try {
      await enableDriverPushNotifications(token)
      setPushStatus(t('settings.pushEnabled'))
    } catch {
      setPushStatus(t('settings.pushError'))
    }
  }

  return (
    <section className="grid max-w-3xl gap-5">
      <div className="rounded-voro-lg border border-line bg-card p-5">
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.desc')}</p>
      </div>
      <section className="rounded-voro-lg border border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex items-center gap-3"><Globe2 className="size-5 text-action" /><div><p className="font-bold">{t('settings.language')}</p><p className="text-sm text-muted-foreground">{t('settings.languageDesc')}</p></div></div>
          <select className="rounded-voro-md border border-line bg-background px-3 py-2 text-sm font-bold" onChange={(event) => onLanguageChange(event.target.value as DriverLanguage)} value={language}>
            <option value="sr">Srpski</option><option value="en">English</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">{theme === 'dark' ? <Moon className="size-5 text-action" /> : <Sun className="size-5 text-action" />}<div><p className="font-bold">{t('settings.theme')}</p><p className="text-sm text-muted-foreground">{t('settings.themeDesc')}</p></div></div>
          <div className="flex rounded-voro-md border border-line p-1 text-sm font-bold"><button className={`rounded-voro-sm px-3 py-2 ${theme === 'light' ? 'bg-accent text-action' : 'text-muted-foreground'}`} onClick={() => onThemeChange('light')} type="button">{t('settings.light')}</button><button className={`rounded-voro-sm px-3 py-2 ${theme === 'dark' ? 'bg-accent text-action' : 'text-muted-foreground'}`} onClick={() => onThemeChange('dark')} type="button">{t('settings.dark')}</button></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-4">
          <div className="flex items-center gap-3"><Bell className="size-5 text-action" /><div><p className="font-bold">{t('settings.pushTitle')}</p><p className="text-sm text-muted-foreground">{t('settings.pushDesc')}</p>{pushStatus ? <p className="mt-1 text-xs font-medium text-muted-foreground">{pushStatus}</p> : null}</div></div>
          <button className="rounded-voro-md bg-action px-3 py-2 text-sm font-bold text-action-text" onClick={() => void enablePush()} type="button">{t('settings.pushEnable')}</button>
        </div>
        {showDemoLocation ? <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-4">
          <div className="flex items-center gap-3"><MapPin className="size-5 text-action" /><div><p className="font-bold">{t('settings.demoTitle')}</p><p className="text-sm text-muted-foreground">{t('settings.demoDesc')}</p></div></div>
          <button className={`rounded-voro-md px-3 py-2 text-sm font-bold ${isDemoLocation ? 'bg-emerald-600 text-white' : 'border border-line text-muted-foreground'}`} onClick={() => onDemoLocationChange(!isDemoLocation)} type="button">{isDemoLocation ? t('settings.demoOn') : t('settings.demoOff')}</button>
        </div> : null}
      </section>
    </section>
  )
}
