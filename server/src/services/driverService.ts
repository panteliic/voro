import * as driverRepository from '../repositories/driverRepository'
import { HttpError } from '../utils/httpError'

async function getOwnedDriver(userId: number) {
  const driver = await driverRepository.findDriverByUserId(userId)

  if (!driver) {
    throw new HttpError(404, 'Driver account is not linked to a courier profile.')
  }

  return driver
}

export async function getDashboard(userId: number) {
  const driver = await getOwnedDriver(userId)
  const deliveries = await driverRepository.listActiveDeliveries(driver.id)

  return { driver, deliveries }
}
