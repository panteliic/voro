import type { AdminOrderMessage, DispatchAlert, OperationsSnapshot, SupportIssue } from '../types/operations'
import { apiRequest } from './apiClient'

export function getOperations() {
  return apiRequest<OperationsSnapshot>('/admin/operations')
}

export function reassignOrder(orderId: number, courierId: number) {
  return apiRequest<{ assigned: true }>(`/admin/orders/${orderId}/reassign`, {
    method: 'POST',
    body: JSON.stringify({ courierId }),
  })
}

export function updateIssue(issueId: number, payload: { status: 'in_review' | 'resolved'; resolutionNote?: string }) {
  return apiRequest<{ issue: SupportIssue }>(`/admin/issues/${issueId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function acknowledgeDispatchAlert(alertId: number) {
  return apiRequest<{ alert: DispatchAlert }>(`/admin/dispatch-alerts/${alertId}/acknowledge`, { method: 'PATCH', body: '{}' })
}

export function getOrderConversation(orderId: number) {
  return apiRequest<{ messages: AdminOrderMessage[] }>(`/admin/orders/${orderId}/messages`)
}
