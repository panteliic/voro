import { Link } from 'react-router-dom'
import { Button } from '@voro/ui'
import { useI18n } from '../i18n/i18n'

export default function NotFoundPage() {
  const { t } = useI18n()

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-8 text-content">
      <section className="w-full max-w-md rounded-voro-lg border border-line bg-card p-6 text-center">
        <h1 className="text-2xl font-bold">{t('router.notFoundTitle')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('router.notFoundDesc')}</p>
        <Button asChild className="mt-5">
          <Link to="/">{t('router.goHome')}</Link>
        </Button>
      </section>
    </main>
  )
}
