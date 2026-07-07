export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-voro-lg border border-line bg-card px-4 py-8">
      <p className="text-sm font-bold text-muted-foreground">{label}</p>
    </div>
  )
}
