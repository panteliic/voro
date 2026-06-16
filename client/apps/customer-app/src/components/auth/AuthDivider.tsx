import { useI18n } from '../../i18n/i18n'

export function AuthDivider() {
  const { t } = useI18n()

  return (
    <div className="my-6 flex w-full items-center gap-3 text-xs font-bold uppercase text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {t('auth.divider')}
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
