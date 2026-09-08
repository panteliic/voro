import * as dispatchRepository from "../repositories/dispatchRepository";
import * as driverRepository from "../repositories/driverRepository";
import * as customerRepository from "../repositories/customerRepository";
import * as redisService from "./redisService";
import { notifyUser } from "./notificationService";
import { logEvent, trackError } from "./observability";
import { pool } from "../database/pool";

const offerWindowMs = 60_000;
const retryDelayMs = 30_000;
const workerPollIntervalMs = 1_500;
// This is the distance for the courier to reach the restaurant, not the
// restaurant's customer-delivery radius. Keeping it bounded stops a courier
// from being offered a job on the other side of town just because the
// restaurant happens to deliver far.
const defaultPickupRadiusMeters = 5_000;
const minimumPickupRadiusMeters = 3_000;
const maximumPickupRadiusMeters = 6_000;
const maximumOffersPerRound = 4;
const maximumPendingOffersPerCourier = 2;
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
  pickupRadiusMeters: number,
  activeLoads: Map<number, number>,
  pendingOfferCounts: Map<number, number>,
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
      pendingOfferCount: pendingOfferCounts.get(courier.id) || 0,
    }))
    .filter(
      ({ distanceMeters, pendingOfferCount }) =>
        distanceMeters <= pickupRadiusMeters &&
        pendingOfferCount < maximumPendingOffersPerCourier,
    )
    .sort((first, second) => {
      // A courier already carrying work or holding a live offer gets a
      // meaningful penalty. This spreads a burst of orders through the fleet
      // instead of constantly selecting the same closest few drivers.
      const firstScore =
        first.distanceMeters +
        first.activeLoad * 2_000 +
        first.pendingOfferCount * 2_500;
      const secondScore =
        second.distanceMeters +
        second.activeLoad * 2_000 +
        second.pendingOfferCount * 2_500;
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
    const pickupRadiusMeters = Math.max(
      minimumPickupRadiusMeters,
      Math.min(
        maximumPickupRadiusMeters,
        Math.round(order.deliveryRadiusKm * 750) || defaultPickupRadiusMeters,
      ),
    );
    const [liveCouriers, storedCouriers] = await Promise.all([
      redisService.listNearbyLiveDrivers(
        order.restaurantLatitude,
        order.restaurantLongitude,
        pickupRadiusMeters,
      ),
      dispatchRepository.listAvailableOnlineCouriers(),
    ]);

    // Redis has the freshest coordinates, while Postgres remains the source
    // of truth for every recently-online courier. Previously, finding even one
    // Redis record discarded all other online couriers and made offers appear
    // to go to a single driver.
    const couriersById = new Map<number, dispatchRepository.DispatchCandidate>(
      storedCouriers.map((courier) => [courier.id, courier]),
    );
    for (const courier of liveCouriers) {
      couriersById.set(courier.id, {
        id: courier.id,
        name: courier.name,
        vehicleType: courier.vehicleType,
        latitude: courier.currentLatitude,
        longitude: courier.currentLongitude,
      });
    }
    const couriers = [...couriersById.values()];
    const courierIds = couriers.map((courier) => courier.id);
    const [activeLoads, pendingOfferCounts] = await Promise.all([
      dispatchRepository.getCourierActiveLoads(courierIds),
      dispatchRepository.getCourierPendingOfferCounts(courierIds),
    ]);
    const nearby = nearbyCandidates(
      order,
      couriers,
      pickupRadiusMeters,
      activeLoads,
      pendingOfferCounts,
    );

    if (nearby.length === 0) {
      const reason =
        "No available courier is currently close enough to the restaurant.";
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

    const selectedCouriers = nearby.slice(0, maximumOffersPerRound);
    const offerCount = await dispatchRepository.createDispatchOffers(
      orderId,
      selectedCouriers.map(({ courier }) => courier.id),
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
    logEvent("info", "dispatch_offer_sent", {
      orderId,
      offerCount,
      availableCourierCount: couriers.length,
      nearbyCourierCount: nearby.length,
      pickupRadiusMeters,
      offeredCourierIds: selectedCouriers.map(({ courier }) => courier.id),
    });
  } catch (error) {
    trackError("dispatch_process_failed", error, { orderId });
    await dispatchRepository
      .markDispatchWaiting(orderId, "Temporary dispatch error.", retryDelayMs)
      .catch(() => undefined);
  }
}

export function enqueueDispatch(orderId: number) {
  void dispatchRepository
    .queueDispatch(orderId)
    .then(() => redisService.enqueueDispatch(orderId))
    .catch((error) => trackError("dispatch_queue_failed", error, { orderId }));
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

    const recoveredAssignments =
      await dispatchRepository.recoverStaleCourierAssignments();
    await Promise.all(
      recoveredAssignments.flatMap((assignment) => [
        redisService.enqueueDispatch(assignment.orderId),
        notifyUser(assignment.customerUserId, {
          type: "courier_reassignment",
          title: `Order #${assignment.orderId}: finding another courier`,
          body: "Your courier could not be reached before pickup. We are finding a replacement now.",
          data: { orderId: assignment.orderId },
        }),
      ]),
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
      await Promise.all([
        driverRepository.purgeExpiredDeliveryLocations(),
        customerRepository.purgeExpiredCheckoutIdempotency(),
      ]).catch((error) => {
        trackError("daily_data_retention_cleanup_failed", error);
      });
    }
    const orderIds = [
      ...new Set([
        ...recoveredAssignments.map((assignment) => assignment.orderId),
        ...queuedOrderIds,
        ...pendingOrderIds,
      ]),
    ];

    for (const orderId of orderIds) {
      await processDispatch(orderId);
    }
  } finally {
    isDispatchCycleRunning = false;
  }
}

export function startDispatchWorker() {
  logEvent("info", "dispatch_worker_started");
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
