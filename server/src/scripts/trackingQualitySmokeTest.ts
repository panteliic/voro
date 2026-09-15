import assert from 'node:assert/strict'
import { isUsableLocationSample } from '../services/driverService'
import type { DriverProfile } from '../types/driver'

const now = Date.now()
const driver: DriverProfile = {
  id: 1,
  userId: 1,
  name: 'Tracking test courier',
  email: 'tracking@example.test',
  phone: '',
  vehicleType: 'scooter',
  isAvailable: false,
  isOnline: true,
  currentLatitude: 44.8144,
  currentLongitude: 20.4399,
  lastLocationAt: new Date(now - 5_000),
  lastLocationAddress: '',
  lastLocationAddressLatitude: null,
  lastLocationAddressLongitude: null,
  lastLocationAddressAt: null,
  createdAt: new Date(now),
  updatedAt: new Date(now),
}

assert.equal(isUsableLocationSample(driver, {
  latitude: 44.81455,
  longitude: 20.44005,
  accuracyMeters: 12,
  speedMps: 8,
  capturedAt: new Date(now),
}), true, 'normal movement should be accepted')

assert.equal(isUsableLocationSample(driver, {
  latitude: 44.81445,
  longitude: 20.43995,
  accuracyMeters: 81,
  speedMps: 0,
  capturedAt: new Date(now),
}), false, 'low-quality GPS should not move tracking')

assert.equal(isUsableLocationSample(driver, {
  latitude: 45.2,
  longitude: 20.8,
  accuracyMeters: 8,
  speedMps: 8,
  capturedAt: new Date(now),
}), false, 'an impossible short-interval jump should be rejected')

assert.equal(isUsableLocationSample(driver, {
  latitude: 44.81445,
  longitude: 20.43995,
  accuracyMeters: 8,
  speedMps: 0,
  capturedAt: new Date(now - 61_000),
}), false, 'a stale browser reading should be rejected')

console.log('Tracking quality smoke tests passed: normal movement, low accuracy, impossible jump, and stale reading.')
