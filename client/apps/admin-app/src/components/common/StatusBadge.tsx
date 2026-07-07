type StatusBadgeProps = {
  tone?: 'success' | 'warning' | 'danger' | 'neutral'
  children: string
}

const toneClass = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-red-200 bg-red-50 text-red-700',
  neutral: 'border-line bg-muted text-content',
}

export function StatusBadge({ tone = 'neutral', children }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-voro-md border px-2 py-1 text-xs font-bold ${toneClass[tone]}`}>
      {children}
    </span>
  )
}
