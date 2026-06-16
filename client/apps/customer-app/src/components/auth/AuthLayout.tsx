import type { ReactNode } from 'react'

type AuthLayoutProps = {
  title: string
  description: string
  panelTitle: string
  panelDescription: string
  children: ReactNode
}

export function AuthLayout({
  title,
  description,
  panelTitle,
  panelDescription,
  children,
}: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-card text-content">
      <div className="grid min-h-screen w-full md:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden border-r border-line bg-[linear-gradient(145deg,#ffb69f_0%,#ffe0d4_46%,#fff8f5_100%)] px-10 py-10 dark:bg-[linear-gradient(145deg,#2a1814_0%,#211719_52%,#151922_100%)] md:flex md:flex-col md:justify-between lg:px-16 xl:px-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(233,77,41,0.28),transparent_34%),radial-gradient(circle_at_86%_80%,rgba(255,255,255,0.8),transparent_38%)] dark:bg-[radial-gradient(circle_at_14%_12%,rgba(233,77,41,0.18),transparent_34%),radial-gradient(circle_at_86%_80%,rgba(255,255,255,0.08),transparent_38%)]" />
          <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full border border-[#e94d29]/20 dark:border-white/10" />
          <div className="absolute bottom-20 right-24 h-20 w-20 rounded-full bg-white/30 dark:bg-white/10" />

          <div className="relative">
            <img src="/logo.svg" alt="Voro" className="size-14" />
            <h1 className="mt-10 max-w-md text-4xl font-bold leading-tight text-[#241813] dark:text-content xl:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#7b5b50] dark:text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="relative max-w-sm rounded-voro-lg border border-[#e94d29]/20 bg-white/70 p-4 text-sm text-[#241813] dark:border-white/10 dark:bg-card/70 dark:text-content">
            <p className="font-bold">{panelTitle}</p>
            <p className="mt-1 text-[#7b5b50] dark:text-muted-foreground">{panelDescription}</p>
          </div>
        </section>

        <section className="flex items-center justify-center bg-surface px-5 py-10 sm:px-8 lg:px-16 xl:px-24">
          <div className="w-full max-w-md">{children}</div>
        </section>
      </div>
    </main>
  )
}
