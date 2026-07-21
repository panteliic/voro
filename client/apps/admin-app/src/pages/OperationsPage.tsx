import { useEffect, useState } from 'react'
import { Bike, CircleAlert, LocateFixed, RefreshCw, Send, ShieldCheck } from 'lucide-react'
import { getOperations, reassignOrder, updateIssue } from '../services/operationsApi'
import type { OperationsOrder, OperationsSnapshot, SupportIssue } from '../types/operations'
import { formatRsd } from '../utils/currency'
import { LiveOperationsMap } from '../components/operations/LiveOperationsMap'

function coordinates(latitude: number | null, longitude: number | null) {
  return latitude === null || longitude === null ? 'Location unavailable' : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
}

export function OperationsPage() {
  const [snapshot, setSnapshot] = useState<OperationsSnapshot>({ orders: [], issues: [], couriers: [] })
  const [selectedCouriers, setSelectedCouriers] = useState<Record<number, string>>({})
  const [error, setError] = useState('')
  const [workingOrderId, setWorkingOrderId] = useState<number | null>(null)
  const [workingIssueId, setWorkingIssueId] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    const load = () => void getOperations().then((result) => { if (active) { setSnapshot(result); setError('') } }).catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load operations.') })
    load()
    const interval = window.setInterval(load, 3_000)
    return () => { active = false; window.clearInterval(interval) }
  }, [])

  async function assign(order: OperationsOrder) {
    const courierId = Number(selectedCouriers[order.id])
    if (!Number.isInteger(courierId) || courierId <= 0) return
    setWorkingOrderId(order.id)
    try {
      await reassignOrder(order.id, courierId)
      setSnapshot((current) => ({ ...current, orders: current.orders.map((item) => item.id === order.id ? { ...item, courierId, courierName: current.couriers.find((courier) => courier.id === courierId)?.name || item.courierName, deliveryStatus: 'assigned', dispatchStatus: 'assigned' } : item) }))
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Courier could not be assigned.') } finally { setWorkingOrderId(null) }
  }

  async function resolve(issue: SupportIssue) {
    const resolutionNote = window.prompt('Resolution note for the customer:', issue.resolutionNote) || ''
    setWorkingIssueId(issue.id)
    try {
      const result = await updateIssue(issue.id, { status: 'resolved', resolutionNote })
      setSnapshot((current) => ({ ...current, issues: current.issues.filter((item) => item.id !== result.issue.id) }))
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Issue could not be updated.') } finally { setWorkingIssueId(null) }
  }

  const eligibleCouriers = snapshot.couriers.filter((courier) => courier.isOnline && courier.isAvailable)
  return <section className="grid gap-5"><header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-action">Dispatch desk</p><h1 className="mt-2 text-2xl font-bold">Live operations</h1><p className="mt-2 text-sm text-muted-foreground">Active orders, courier locations, manual reassignment, and customer support reports.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-voro-md bg-accent px-3 py-2 text-sm font-bold text-action"><RefreshCw className="size-4" />Refreshes every 3s</span></header>{error ? <p className="rounded-voro-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}<section className="grid gap-3 sm:grid-cols-3"><article className="rounded-voro-lg border border-line bg-card p-4"><p className="text-sm font-bold text-muted-foreground">Active orders</p><p className="mt-2 text-3xl font-bold">{snapshot.orders.length}</p></article><article className="rounded-voro-lg border border-line bg-card p-4"><p className="text-sm font-bold text-muted-foreground">Online couriers</p><p className="mt-2 text-3xl font-bold">{snapshot.couriers.filter((courier) => courier.isOnline).length}</p></article><article className="rounded-voro-lg border border-line bg-card p-4"><p className="text-sm font-bold text-muted-foreground">Open support reports</p><p className="mt-2 text-3xl font-bold">{snapshot.issues.length}</p></article></section><section className="overflow-hidden rounded-voro-xl border border-line bg-card"><div className="border-b border-line px-5 py-4"><h2 className="font-bold">Live delivery map</h2><p className="mt-1 text-sm text-muted-foreground">Restaurant, customer, and live Redis courier positions for active orders.</p></div><LiveOperationsMap orders={snapshot.orders} /></section><section className="overflow-hidden rounded-voro-xl border border-line bg-card"><div className="border-b border-line px-5 py-4"><h2 className="font-bold">Delivery map feed</h2><p className="mt-1 text-sm text-muted-foreground">Coordinates update from the live Redis courier presence.</p></div>{snapshot.orders.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No active orders right now.</p> : <div className="divide-y divide-line">{snapshot.orders.map((order) => <article className="grid gap-4 p-5 xl:grid-cols-[1.2fr_1fr_auto] xl:items-center" key={order.id}><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold">Order #{order.id}</p><span className="rounded-voro-md bg-muted px-2 py-1 text-xs font-bold">{order.status}</span>{order.deliveryStatus ? <span className="rounded-voro-md bg-accent px-2 py-1 text-xs font-bold text-action">{order.deliveryStatus}</span> : null}</div><p className="mt-2 text-sm">{order.restaurantName} → {order.customerName} · <strong>{formatRsd(order.total)}</strong></p><p className="mt-1 text-xs text-muted-foreground">Dispatch: {order.dispatchStatus || 'not queued'}{order.dispatchError ? ` · ${order.dispatchError}` : ''}</p></div><div className="grid gap-2 rounded-voro-md bg-muted/60 p-3 text-xs"><p className="flex items-center gap-2 font-bold"><LocateFixed className="size-3.5 text-action" />Restaurant: <span className="font-medium text-muted-foreground">{coordinates(order.restaurantLatitude, order.restaurantLongitude)}</span></p><p className="flex items-center gap-2 font-bold"><LocateFixed className="size-3.5 text-emerald-600" />Customer: <span className="font-medium text-muted-foreground">{coordinates(order.customerLatitude, order.customerLongitude)}</span></p><p className="flex items-center gap-2 font-bold"><Bike className="size-3.5 text-blue-600" />Courier: <span className="font-medium text-muted-foreground">{order.courierName ? `${order.courierName} · ${coordinates(order.courierLatitude, order.courierLongitude)}` : 'Unassigned'}</span></p></div><div className="grid gap-2"><select className="min-w-48 rounded-voro-md border border-line bg-background px-3 py-2 text-sm" onChange={(event) => setSelectedCouriers((current) => ({ ...current, [order.id]: event.target.value }))} value={selectedCouriers[order.id] || ''}><option value="">Assign courier…</option>{eligibleCouriers.map((courier) => <option key={courier.id} value={courier.id}>{courier.name} · {courier.vehicleType || 'courier'}</option>)}</select><button className="inline-flex items-center justify-center gap-2 rounded-voro-md bg-action px-3 py-2 text-sm font-bold text-action-text disabled:opacity-50" disabled={!selectedCouriers[order.id] || workingOrderId === order.id || ['picked_up', 'on_the_way'].includes(order.deliveryStatus)} onClick={() => void assign(order)} type="button"><Send className="size-4" />{workingOrderId === order.id ? 'Assigning…' : order.courierId ? 'Reassign' : 'Assign'}</button></div></article>)}</div>}</section><section className="overflow-hidden rounded-voro-xl border border-line bg-card"><div className="flex items-center gap-2 border-b border-line px-5 py-4"><CircleAlert className="size-4 text-action" /><div><h2 className="font-bold">Customer reports</h2><p className="text-sm text-muted-foreground">Resolve reports and notify the customer directly.</p></div></div>{snapshot.issues.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No open reports.</p> : <div className="divide-y divide-line">{snapshot.issues.map((issue) => <article className="grid gap-3 p-5 md:grid-cols-[1fr_auto] md:items-center" key={issue.id}><div><p className="font-bold">Order #{issue.orderId} · {issue.category.replace('_', ' ')}</p><p className="mt-1 text-sm text-muted-foreground">{issue.description}</p><p className="mt-2 text-xs font-bold text-action">{issue.status.replace('_', ' ')}</p></div><button className="inline-flex items-center justify-center gap-2 rounded-voro-md border border-line px-3 py-2 text-sm font-bold hover:bg-muted disabled:opacity-50" disabled={workingIssueId === issue.id} onClick={() => void resolve(issue)} type="button"><ShieldCheck className="size-4" />{workingIssueId === issue.id ? 'Resolving…' : 'Resolve'}</button></article>)}</div>}</section></section>
}
