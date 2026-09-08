import * as dispatchRepository from "../repositories/dispatchRepository";
import * as driverRepository from "../repositories/driverRepository";
import * as redisService from "./redisService";
import { pool } from "../database/pool";

const offerWindowMs = 60_000;
const retryDelayMs = 30_000;
const workerPollIntervalMs = 1_500;
const defaultMatchingRadiusMeters = 7_500;
const maximumOffersPerRound = 3;
const databaseSweepIntervalMs = 20_000;
const locationRetentionSweepIntervalMs = 24 * 60 * 60 * 1_000;

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const earthRadius = 6_371_000;
  const latitudeDelta = ((lat2 - lat1) * Math.PI) / 180;
  const longitudeDelta = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearbyCandidates(
  order: dispatchRepository.DispatchOrder,
  couriers: dispatchRepository.DispatchCandidate[],
  matchingRadiusMeters: number,
  activeLoads: Map<number, number>,
) {
  return couriers
    .map((courier) => ({
      courier,
      distanceMeters: haversineMeters(
        courier.latitude,
        courier.longitude,
        order.restaurantLatitude,
        order.restaurantLongitude,
      ),
      activeLoad: activeLoads.get(courier.id) || 0,
    }))
    .filter(({ distanceMeters }) => distanceMeters <= matchingRadiusMeters)
    .sort((first, second) => {
      // A courier already carrying work gets a meaningful penalty. Distance is
      // still the primary signal, but dispatch does not repeatedly favour the
      // same closest courier when the fleet has alternatives.
      const firstScore = first.distanceMeters + first.activeLoad * 2_000;
      const secondScore = second.distanceMeters + second.activeLoad * 2_000;
      return firstScore - secondScore;
    });
}

async function processDispatch(orderId: number) {
  try {
    const order =
      await dispatchRepository.getPreparingOrderForDispatch(orderId);

    if (!order) {
      await dispatchRepository.markDispatchFailed(
        orderId,
        "Order no longer needs a courier assignment.",
      );
      return;
    }

    const attempts = await dispatchRepository.markDispatchMatching(orderId);
    const matchingRadiusMeters = Math.max(
      4_000,
      Math.min(
        12_000,
        Math.round(order.deliveryRadiusKm * 1_000) ||
          defaultMatchingRadiusMeters,
      ),
    );
    const liveCouriers = await redisService.listNearbyLiveDrivers(
      order.restaurantLatitude,
      order.restaurantLongitude,
      matchingRadiusMeters,
    );
    const couriers =
      liveCouriers.length > 0
        ? liveCouriers.map((courier) => ({
            id: courier.id,
            name: courier.name,
            vehicleType: courier.vehicleType,
            latitude: courier.currentLatitude,
            longitude: courier.currentLongitude,
          }))
        : await dispatchRepository.listAvailableOnlineCouriers();
    const activeLoads = await dispatchRepository.getCourierActiveLoads(
      couriers.map((courier) => courier.id),
    );
    const nearby = nearbyCandidates(
      order,
      couriers,
      matchingRadiusMeters,
      activeLoads,
    );

    if (nearby.length === 0) {
      const reason =
        "No available courier is currently within the delivery radius.";
      await dispatchRepository.markDispatchWaiting(
        orderId,
        reason,
        retryDelayMs,
      );
      if (attempts >= 4) {
        await dispatchRepository.upsertDispatchAlert(
          orderId,
          attempts >= 8 ? "critical" : "warning",
          reason,
        );
      }
      return;
    }

    const offerCount = await dispatchRepository.createDispatchOffers(
      orderId,
      nearby.slice(0, maximumOffersPerRound).map(({ courier }) => courier.id),
      offerWindowMs,
    );
    const reason = `Offer sent to ${offerCount} nearby courier${offerCount === 1 ? "" : "s"}.`;
    await dispatchRepository.markDispatchWaiting(
      orderId,
      reason,
      offerWindowMs,
    );
    if (offerCount === 0 && attempts >= 4) {
      await dispatchRepository.upsertDispatchAlert(
        orderId,
        attempts >= 8 ? "critical" : "warning",
        "No courier accepted the delivery offers.",
      );
    }
    console.info(
      `Dispatch offered order #${orderId} to ${offerCount} nearby couriers.`,
    );
  } catch (error) {
    console.error(`Dispatch failed for order #${orderId}.`, error);
    await dispatchRepository
      .markDispatchWaiting(orderId, "Temporary dispatch error.", retryDelayMs)
      .catch(() => undefined);
  }
}

export function enqueueDispatch(orderId: number) {
  void dispatchRepository
    .queueDispatch(orderId)
    .then(() => redisService.enqueueDispatch(orderId))
    .catch((error) =>
      console.error(`Could not queue dispatch for order #${orderId}.`, error),
    );
}

let isDispatchCycleRunning = false;
let lastDatabaseSweepAt = 0;
let lastLocationRetentionSweepAt = 0;

export async function runDispatchCycle() {
  if (isDispatchCycleRunning) {
    return;
  }

  isDispatchCycleRunning = true;

  try {
    const expiredDriverIds = await driverRepository.expireStaleDriverPresence();
    await Promise.all(
      expiredDriverIds.map((driverId) =>
        redisService.removeDriverPresence(driverId),
      ),
    );

    const queuedOrderIds = await redisService.dequeueDispatchBatch();
    const now = Date.now();
    const pendingOrderIds =
      now - lastDatabaseSweepAt >= databaseSweepIntervalMs
        ? await dispatchRepository.listPendingDispatchOrderIds()
        : [];
    if (
      pendingOrderIds.length > 0 ||
      now - lastDatabaseSweepAt >= databaseSweepIntervalMs
    ) {
      lastDatabaseSweepAt = now;
    }
    if (
      now - lastLocationRetentionSweepAt >=
      locationRetentionSweepIntervalMs
    ) {
      lastLocationRetentionSweepAt = now;
      await driverRepository.purgeExpiredDeliveryLocations().catch((error) => {
        console.error("Could not purge expired delivery locations.", error);
      });
    }
    const orderIds = [...new Set([...queuedOrderIds, ...pendingOrderIds])];

    for (const orderId of orderIds) {
      await processDispatch(orderId);
    }
  } finally {
    isDispatchCycleRunning = false;
  }
}

export function startDispatchWorker() {
  console.info("Dispatch worker started.");
  void runDispatchCycle();

  const interval = setInterval(() => {
    void runDispatchCycle();
  }, workerPollIntervalMs);

  const shutdown = () => {
    clearInterval(interval);
    void pool.end().finally(() => process.exit(0));
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
