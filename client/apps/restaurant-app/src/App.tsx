import { WorkspaceApp, type WorkspaceAppConfig } from '@voro/ui'

const appConfig = {
  role: 'restaurant',
  theme: 'light',
  appName: 'Voro Restaurant',
  port: 5174,
  eyebrow: 'Restaurant operations surface',
  headline: 'Kitchen queues, order readiness, and store status run through the shared UI.',
  description:
    'The restaurant app keeps its own route and port while reusing the same component library that powers the other Voro apps.',
  primaryAction: 'Open queue',
  secondaryAction: 'Update menu',
  metrics: [
    { label: 'Active orders', value: '18' },
    { label: 'Prep time', value: '14m' },
    { label: 'Stations live', value: '5' },
  ],
  workflow: [
    { label: 'Kitchen display', value: 'Receiving new tickets', state: 'online' },
    { label: 'Menu publishing', value: 'Pushing price changes', state: 'syncing' },
    { label: 'Pickup shelf', value: 'Two delayed handoffs', state: 'attention' },
  ],
} satisfies WorkspaceAppConfig

function App() {
  return (
    <WorkspaceApp config={appConfig} />
  )
}

export default App
