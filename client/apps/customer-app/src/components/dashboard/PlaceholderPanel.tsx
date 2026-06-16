type PlaceholderPanelProps = {
  title: string
  description: string
}

export function PlaceholderPanel({ description, title }: PlaceholderPanelProps) {
  return (
    <section className="rounded-voro-lg border border-line bg-card p-6">
      <h1 className="text-2xl font-bold text-content">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </section>
  )
}
