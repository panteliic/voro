import type { LucideIcon } from 'lucide-react'

type AnalyticsMetricProps = {
  icon: LucideIcon
  label: string
  value: string | number
  helper?: string
}

export function AnalyticsMetric({ icon: Icon, label, value, helper }: AnalyticsMetricProps) {
  return (
    <article className="dashboard-stat-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="grid size-8 place-items-center rounded-voro-md border border-line bg-muted text-action">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-5 text-2xl font-bold tracking-tight text-content sm:text-3xl">{value}</p>
      {helper ? <p className="mt-2 text-xs text-muted-foreground">{helper}</p> : null}
    </article>
  )
}
