import { startDispatchWorker } from '../services/dispatchService'

startDispatchWorker()
process.send?.({ type: 'ready' })
