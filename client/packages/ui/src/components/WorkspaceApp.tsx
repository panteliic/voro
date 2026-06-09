import type { AppRole, HealthState } from '@voro/shared'
import { cx } from '../utils/cx'

type WorkflowItem = {
  label: string
  value: string
  state: HealthState
}

type Metric = {
  label: string
  value: string
}

export type WorkspaceAppConfig = {
  role: AppRole
  theme?: 'light' | 'dark' | 'system'
  appName: string
  port: number
  eyebrow: string
  headline: string
  description: string
  primaryAction: string
  secondaryAction: string
  metrics: Metric[]
  workflow: WorkflowItem[]
}

const roleTone: Record<AppRole, { rail: string; badge: string }> = {
  customer: {
    rail: 'border-line bg-card text-content',
    badge: 'bg-action/15 text-action ring-action/30',
  },
  restaurant: {
    rail: 'border-line bg-card text-content',
    badge: 'bg-action/15 text-action ring-action/30',
  },
  driver: {
    rail: 'border-line bg-card text-content',
    badge: 'bg-action/15 text-action ring-action/30',
  },
}

const stateTone: Record<HealthState, string> = {
  online: 'bg-voro-neutral-200 text-content ring-line',
  syncing: 'bg-action/15 text-action ring-action/30',
  attention: 'bg-action text-action-text ring-action',
}

const themeClass = {
  light: 'light-theme',
  dark: 'dark-theme',
  system: '',
}

export function WorkspaceApp({ config }: { config: WorkspaceAppConfig }) {
  const tone = roleTone[config.role]

  return (
    <main
      className={cx(
        themeClass[config.theme ?? 'system'],
        'min-h-screen bg-surface px-4 py-6 font-main text-content sm:px-6 lg:px-8',
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-voro-sm font-medium text-muted">{config.eyebrow}</p>
            <h1 className="mt-2 text-voro-2xl font-bold leading-tight text-content sm:text-4xl">
              {config.appName}
            </h1>
          </div>
          <span
            className={cx(
              'inline-flex w-fit items-center rounded-voro-md px-3 py-1 text-voro-sm font-medium ring-1',
              tone.badge,
            )}
          >
            Port {config.port}
          </span>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className={cx('voro-card p-6', tone.rail)}>
            <p className="text-voro-sm font-bold uppercase">{config.role} app</p>
            <h2 className="mt-4 text-voro-2xl font-bold leading-snug sm:text-3xl">
              {config.headline}
            </h2>
            <p className="mt-3 max-w-2xl text-voro-base leading-7 text-muted">
              {config.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="voro-button-primary px-4 py-2 text-voro-sm" type="button">
                {config.primaryAction}
              </button>
              <button
                className="rounded-voro-md border border-line bg-card px-4 py-2 text-voro-sm font-medium text-content transition hover:border-action focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
                type="button"
              >
                {config.secondaryAction}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {config.metrics.map((metric) => (
              <article className="voro-card p-4" key={metric.label}>
                <p className="text-voro-sm text-muted">{metric.label}</p>
                <p className="mt-2 text-voro-2xl font-bold text-content">{metric.value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="voro-card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-voro-lg font-bold text-content">Shared workflow status</h2>
          </div>
          <div className="divide-y divide-line">
            {config.workflow.map((item) => (
              <div
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                key={item.label}
              >
                <div>
                  <p className="font-medium text-content">{item.label}</p>
                  <p className="text-voro-sm text-muted">{item.value}</p>
                </div>
                <span
                  className={cx(
                    'inline-flex w-fit items-center rounded-voro-md px-2.5 py-1 text-voro-xs font-bold ring-1',
                    stateTone[item.state],
                  )}
                >
                  {item.state}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
