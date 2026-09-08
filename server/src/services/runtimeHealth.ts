let dispatchWorkerReady = false

export function setDispatchWorkerReady(value: boolean) {
  dispatchWorkerReady = value
}

export function isDispatchWorkerReady() {
  return dispatchWorkerReady
}
