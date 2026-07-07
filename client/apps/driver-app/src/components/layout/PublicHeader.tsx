export function PublicHeader() {
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo.svg" alt="Voro" className="size-10 shrink-0 rounded-voro-md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">Voro Driver</p>
            <p className="truncate text-xs text-muted-foreground">Admin-issued accounts only</p>
          </div>
        </div>
        <span className="rounded-voro-md border border-line px-3 py-2 text-xs font-bold text-muted-foreground">
          Setup code required once
        </span>
      </div>
    </header>
  )
}
