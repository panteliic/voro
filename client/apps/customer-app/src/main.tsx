import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { VoroAppBoot } from '../../../packages/ui/src/components/ui/voro-loading-screen'
import { AppErrorBoundary } from './components/app/AppErrorBoundary.tsx'
import './index.css'
import App from './App.tsx'
import { store } from './app/store.ts'
import { I18nProvider, useI18n } from './i18n/i18n.tsx'

function AppErrorFallback() {
  const { t } = useI18n()

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-8 text-content">
      <section className="w-full max-w-md rounded-voro-lg border border-line bg-card p-6 text-center">
        <h1 className="text-2xl font-bold">{t('router.errorTitle')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('router.errorDesc')}</p>
        <button
          className="mt-5 rounded-voro-md bg-action px-4 py-2 text-sm font-bold text-action-text"
          onClick={() => window.location.reload()}
          type="button"
        >
          {t('router.retry')}
        </button>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VoroAppBoot>
      <Provider store={store}>
        <I18nProvider>
          <BrowserRouter>
            <AppErrorBoundary fallback={<AppErrorFallback />}>
              <App />
            </AppErrorBoundary>
          </BrowserRouter>
        </I18nProvider>
      </Provider>
    </VoroAppBoot>
  </StrictMode>,
)
