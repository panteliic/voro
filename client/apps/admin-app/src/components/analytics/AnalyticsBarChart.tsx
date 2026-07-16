import { BarChart3 } from 'lucide-react'
import type { DailyAnalytics } from '../../types/analytics'
import { formatRsd } from '../../utils/currency'

type AnalyticsBarChartProps = {
  data: DailyAnalytics[]
  title: string
  subtitle: string
  language: 'en' | 'sr'
}

function dayLabel(date: string, language: 'en' | 'sr') {
  return new Intl.DateTimeFormat(language === 'sr' ? 'sr-RS' : 'en-US', { weekday: 'short' })
    .format(new Date(`${date}T12:00:00`))
    .replace('.', '')
}

export function AnalyticsBarChart({ data, title, subtitle, language }: AnalyticsBarChartProps) {
  const maxAmount = Math.max(...data.map((day) => day.amount), 1)

  return (
    <article className="admin-panel overflow-hidden">
      <div className="flex items-start gap-2 border-b border-line px-5 py-4">
        <BarChart3 className="mt-0.5 size-4 text-action" />
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="dashboard-chart-grid mx-5 mt-5 flex h-56 items-end gap-2 border-b border-line pb-7 sm:gap-3">
        {data.map((day) => {
          const height = Math.max(8, Math.round((day.amount / maxAmount) * 100))
          const label = `${dayLabel(day.date, language)}: ${formatRsd(day.amount)} · ${day.count}`

          return (
            <div className="group relative flex h-full min-w-0 flex-1 items-end" key={day.date}>
              <div
                aria-label={label}
                className="w-full rounded-t-md border border-white/10 bg-gradient-to-t from-action/35 to-action/85 transition-opacity group-hover:opacity-100"
                role="img"
                style={{ height: `${height}%` }}
                title={label}
              />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground sm:text-xs">
                {dayLabel(day.date, language)}
              </span>
            </div>
          )
        })}
      </div>
    </article>
  )
}
