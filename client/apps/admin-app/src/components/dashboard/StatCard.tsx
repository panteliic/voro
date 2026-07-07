import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  label: string
  value: number
  icon: LucideIcon
  helper?: string
}

export function StatCard({ label, value, icon: Icon, helper }: StatCardProps) {
  return (
    <article className="rounded-voro-lg border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold text-content">{value}</p>
        </div>
        <span className="grid size-10 place-items-center rounded-voro-lg bg-accent text-action">
          <Icon className="size-5" />
        </span>
      </div>
      {helper ? <p className="mt-3 text-xs text-muted-foreground">{helper}</p> : null}
    </article>
  )
}
