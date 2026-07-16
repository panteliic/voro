type StatusBadgeProps = {
  tone?: 'success' | 'warning' | 'danger' | 'neutral'
  children: string
}

const toneClass = {
  success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  warning: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  danger: 'border-red-400/20 bg-red-400/10 text-red-300',
  neutral: 'border-line bg-muted text-content',
}

export function StatusBadge({ tone = 'neutral', children }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-voro-md border px-2 py-1 text-xs font-bold ${toneClass[tone]}`}>
      {children}
    </span>
  )
}
