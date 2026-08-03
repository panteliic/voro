import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { VoroAppBoot } from '../../../packages/ui/src/components/ui/voro-loading-screen'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './i18n/i18n.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VoroAppBoot>
      <I18nProvider>
        <App />
      </I18nProvider>
    </VoroAppBoot>
  </StrictMode>,
)
