import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { VoroAppBoot } from '../../../packages/ui/src/components/ui/voro-loading-screen'
import './index.css'
import App from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VoroAppBoot>
      <App />
    </VoroAppBoot>
  </StrictMode>,
)
