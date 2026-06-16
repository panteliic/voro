import type { Dispatch, SetStateAction } from 'react'
import { Switch } from '@voro/ui'
import { Moon, Sun } from 'lucide-react'
import { useI18n } from '../../../i18n/i18n'
import { customerApi } from '../../../services/customerApi'
import { useTheme, type ThemePreference } from '../../../theme/theme'
import type { CustomerPreferences, CustomerProfile } from '../../../types/customer'
import { SettingRow } from './SettingRow'
import { SettingsSectionLayout } from './SettingsSectionLayout'

type ThemeSettingsProps = {
  preferences: CustomerPreferences
  setProfile: Dispatch<SetStateAction<CustomerProfile | null>>
}

const themeOptions = ['system', 'light', 'dark'] satisfies ThemePreference[]

export function ThemeSettings({ preferences, setProfile }: ThemeSettingsProps) {
  const { t } = useI18n()
  const { resolvedTheme, setTheme, theme } = useTheme()
  const translatedResolvedTheme = t(resolvedTheme === 'dark' ? 'theme.dark' : 'theme.light')

  async function updateReduceMotion(checked: boolean) {
    const result = await customerApi.updatePreferences({ ...preferences, reduceMotion: checked })
    setProfile((current) => (current ? { ...current, preferences: result.preferences } : current))
  }

  return (
    <SettingsSectionLayout
      description={t('theme.description')}
      icon={theme === 'dark' || resolvedTheme === 'dark' ? Moon : Sun}
      title={t('theme.theme')}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {themeOptions.map((option) => (
          <button
            className={`cursor-pointer rounded-voro-lg border px-4 py-3 text-left transition ${
              theme === option
                ? 'border-action bg-accent text-content'
                : 'border-line bg-background text-muted-foreground hover:border-action/50 hover:text-content'
            }`}
            key={option}
            onClick={() => setTheme(option)}
            type="button"
          >
            <span className="text-sm font-bold">{t(`theme.${option}`)}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {option === 'system'
                ? t('theme.follows', { theme: translatedResolvedTheme })
                : t('theme.always', { theme: t(`theme.${option}`).toLowerCase() })}
            </span>
          </button>
        ))}
      </div>
      <SettingRow label={t('theme.resolved')} value={translatedResolvedTheme} />
      <div className="grid gap-3 rounded-voro-lg border border-line bg-background px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-sm font-bold text-content">{t('theme.reduceMotion')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('theme.reduceMotionDesc')}</p>
        </div>
        <Switch
          checked={preferences.reduceMotion}
          onCheckedChange={(checked) => void updateReduceMotion(checked)}
        />
      </div>
    </SettingsSectionLayout>
  )
}
