import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster, TooltipProvider } from '@voro/ui'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import VerifyEmail from './pages/VerifyEmail'

function App() {
  return (
    <TooltipProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster />
    </TooltipProvider>
  )
}

export default App
