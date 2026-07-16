import type { CreateDriverPayload, Driver } from '../types/driver'
import type { DriverAnalytics } from '../types/analytics'
import { apiRequest } from './apiClient'

export function listDrivers() {
  return apiRequest<{ couriers: Driver[] }>('/admin/drivers')
}

export function getDriver(driverId: number) {
  return apiRequest<{ courier: Driver }>(`/admin/drivers/${driverId}`)
}

export function getDriverAnalytics(driverId: number) {
  return apiRequest<DriverAnalytics>(`/admin/drivers/${driverId}/analytics`)
}

export function createDriver(payload: CreateDriverPayload) {
  return apiRequest<{ courier: Driver; setupCode: string }>('/admin/drivers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateDriverStatus(driverId: number, isAvailable: boolean) {
  return apiRequest<{ courier: Driver }>(`/admin/drivers/${driverId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isAvailable }),
  })
}

export function resetDriverPassword(driverId: number) {
  return apiRequest<{ courier: Driver; setupCode: string }>(
    `/admin/drivers/${driverId}/password-reset`,
    {
      method: 'POST',
    },
  )
}
