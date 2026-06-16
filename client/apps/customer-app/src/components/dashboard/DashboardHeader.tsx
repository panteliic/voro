import { useI18n } from '../../i18n/i18n'

type DashboardHeaderProps = {
  title: string
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const { t } = useI18n()

  return (
    <header className="mb-5 border-b border-line pb-5">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{t('nav.customerApp')}</p>
        <h1 className="text-2xl font-bold text-content">{title}</h1>
      </div>
    </header>
  )
}
