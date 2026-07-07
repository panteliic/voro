import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '../hooks/useAuth'
import { I18nProvider } from '../i18n/i18n'
import { router } from './router'

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </I18nProvider>
  )
}

export default App
