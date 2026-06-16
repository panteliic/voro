import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@voro/ui'
import { Laptop, Moon, Sun } from 'lucide-react'
import { useI18n } from '../i18n/i18n'
import { useTheme, type ThemePreference } from '../theme/theme'

const themeOptions: Array<{
  value: ThemePreference
  labelKey: string
  icon: typeof Laptop
}> = [
  { value: 'system', labelKey: 'theme.system', icon: Laptop },
  { value: 'light', labelKey: 'theme.light', icon: Sun },
  { value: 'dark', labelKey: 'theme.dark', icon: Moon },
]

export function ThemeMenu() {
  const { t } = useI18n()
  const { resolvedTheme, setTheme, theme } = useTheme()
  const ActiveIcon = themeOptions.find((option) => option.value === theme)?.icon ?? Laptop
  const resolvedThemeLabel = t(resolvedTheme === 'dark' ? 'theme.dark' : 'theme.light')

  return (
    <div className="fixed right-4 top-4 z-50">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label={t('theme.change')}
                className="border-line bg-card/90 text-content shadow-sm backdrop-blur hover:bg-accent"
                size="icon"
                type="button"
                variant="outline"
              >
                <ActiveIcon className="size-4" />
                <span className="sr-only">{t('theme.change')}</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>{t('theme.theme')}</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuLabel>{t('theme.theme')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(value) => setTheme(value as ThemePreference)}
            value={theme}
          >
            {themeOptions.map(({ icon: Icon, labelKey, value }) => (
              <DropdownMenuRadioItem key={value} value={value}>
                <Icon className="size-4 text-muted-foreground" />
                <span>{t(labelKey)}</span>
                {value === 'system' ? (
                  <span className="ml-auto text-xs text-muted-foreground">{resolvedThemeLabel}</span>
                ) : null}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
