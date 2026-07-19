import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AdminLayout() {
  return (
    <div className="admin-console min-h-screen bg-background text-content lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Header />
        <main className="admin-main mx-auto w-full max-w-[1600px] px-4 pb-[calc(4rem+max(env(safe-area-inset-bottom),0.5rem))] pt-5 sm:px-6 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
