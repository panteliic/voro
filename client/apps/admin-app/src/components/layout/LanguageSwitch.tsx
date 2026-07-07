import { Button } from '@voro/ui'
import { useI18n, type Language } from '../../i18n/i18n'

const languages: Array<{ value: Language; label: string }> = [
  { value: 'en', label: 'EN' },
  { value: 'sr', label: 'SR' },
]

export function LanguageSwitch() {
  const { language, setLanguage } = useI18n()

  return (
    <div className="flex rounded-voro-lg border border-line bg-background p-1">
      {languages.map((item) => (
        <Button
          className={language === item.value ? 'bg-accent text-content' : 'border-transparent'}
          key={item.value}
          onClick={() => setLanguage(item.value)}
          size="sm"
          type="button"
          variant={language === item.value ? 'outline' : 'ghost'}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}
