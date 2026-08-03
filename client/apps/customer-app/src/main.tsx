import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { VoroAppBoot } from '../../../packages/ui/src/components/ui/voro-loading-screen'
import './index.css'
import App from './App.tsx'
import { store } from './app/store.ts'
import { I18nProvider } from './i18n/i18n.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VoroAppBoot>
      <Provider store={store}>
        <I18nProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </I18nProvider>
      </Provider>
    </VoroAppBoot>
  </StrictMode>,
)
