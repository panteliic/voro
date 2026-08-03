import { useEffect, useState, type ReactNode } from 'react'

export function VoroLoadingScreen() {
  return (
    <main className="voro-loading-screen">
      <section aria-label="Loading" aria-live="polite" className="voro-loading-screen__content" role="status">
        <div className="voro-loading-screen__mark">
          <span className="voro-loading-screen__pulse" />
          <span className="voro-loading-screen__ring" />
          <span className="voro-loading-screen__logo">
            <img alt="" src="/logo.svg" />
          </span>
          <span className="voro-loading-screen__dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
      </section>
    </main>
  )
}

export function VoroAppBoot({ children }: { children: ReactNode }) {
  const [isBooting, setIsBooting] = useState(true)

  useEffect(() => {
    const timeout = window.setTimeout(() => setIsBooting(false), 700)
    return () => window.clearTimeout(timeout)
  }, [])

  return (
    <>
      {isBooting ? <VoroLoadingScreen /> : null}
      {children}
    </>
  )
}
