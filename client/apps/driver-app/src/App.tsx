import { WorkspaceApp, type WorkspaceAppConfig } from '@voro/ui'

const appConfig = {
  role: 'driver',
  theme: 'system',
  appName: 'Voro Driver',
  port: 5175,
  eyebrow: 'Driver delivery surface',
  headline: 'Dispatch, route progress, and delivery health share the same component kit.',
  description:
    'The driver app runs independently on its own Vite port while pulling the shared layout, cards, and workflow list from @voro/ui.',
  primaryAction: 'Start route',
  secondaryAction: 'View stops',
  metrics: [
    { label: 'Assigned drops', value: '9' },
    { label: 'ETA drift', value: '3m' },
    { label: 'Ready pickups', value: '4' },
  ],
  workflow: [
    { label: 'Dispatch feed', value: 'New offers available', state: 'online' },
    { label: 'Route sync', value: 'Updating stop order', state: 'syncing' },
    { label: 'Proof of delivery', value: 'One photo missing', state: 'attention' },
  ],
} satisfies WorkspaceAppConfig

function App() {
  return (
    <WorkspaceApp config={appConfig} />
  )
}

export default App
