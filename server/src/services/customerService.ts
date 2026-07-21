import * as customerRepository from "../repositories/customerRepository";
import * as restaurantRepository from "../repositories/restaurantRepository";
import * as geocodingService from "./geocodingService";
import * as redisService from "./redisService";
import * as routingService from "./routingService";
import * as operationsRepository from "../repositories/operationsRepository";
import type {
  CreateCustomerOrderPayload,
  CustomerAddressPayload,
  CustomerPaymentMethodPayload,
  CustomerPreferencesPayload,
  CustomerProfilePayload,
} from "../types/customer";
import { HttpError } from "../utils/httpError";
import { encryptPaymentCardNumber } from "../utils/paymentCardCrypto";

const handoffOptions = new Set([
  "leave_at_door",
  "meet_at_door",
  "meet_outside",
]);
const deliveryWindowOptions = new Set(["asap", "lunch", "evening"]);
const deliveryFee = 250;
const issueCategories = new Set(['late_delivery', 'missing_item', 'wrong_item', 'quality', 'courier', 'other'])

export async function searchAddressSuggestions(query: string) {
  return { suggestions: await geocodingService.searchAddressSuggestions(query) };
}

const deliveryEstimateByStatus = {
  pending: { min: 35, max: 45 },
  accepted: { min: 25, max: 35 },
  preparing: { min: 15, max: 25 },
  ready: { min: 10, max: 15 },
  picked_up: { min: 5, max: 10 },
} as const;

function trim(value: string) {
  return value.trim();
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function positiveInteger(value: unknown) {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function haversineKilometers(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusKm = 6_371
  const latitudeDelta = ((lat2 - lat1) * Math.PI) / 180
  const longitudeDelta = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(longitudeDelta / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function restaurantOpenNow(openingHours: Record<string, unknown>) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Belgrade',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const weekday = (parts.find((part) => part.type === 'weekday')?.value || '').toLowerCase().slice(0, 3)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0)
  const today = openingHours[weekday]

  if (!today || typeof today !== 'object') return true
  const schedule = today as { enabled?: unknown; open?: unknown; close?: unknown }
  if (schedule.enabled === false) return false
  const timeToMinutes = (value: unknown) => {
    const [hours, minutes] = String(value || '').split(':').map(Number)
    return Number.isInteger(hours) && Number.isInteger(minutes) ? hours * 60 + minutes : null
  }
  const open = timeToMinutes(schedule.open)
  const close = timeToMinutes(schedule.close)
  if (open === null || close === null) return true
  const now = hour * 60 + minute
  return open <= close ? now >= open && now <= close : now >= open || now <= close
}

function cardDigits(value: unknown) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 19);
}

function passesLuhn(value: string) {
  if (value.length < 12) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);

    if (shouldDouble) {
      digit *= 2;

      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function normalizeAddress(
  payload: Record<string, unknown>,
): CustomerAddressPayload {
  const street = trim(String(payload.street || ""));
  const city = trim(String(payload.city || ""));

  if (!street || !city) {
    throw new HttpError(400, "Street and city are required.");
  }

  const latitude = nullableNumber(payload.latitude);
  const longitude = nullableNumber(payload.longitude);

  if (
    (latitude !== null && (latitude < -90 || latitude > 90)) ||
    (longitude !== null && (longitude < -180 || longitude > 180))
  ) {
    throw new HttpError(400, "Enter valid map coordinates.");
  }

  return {
    label: trim(String(payload.label || "")),
    street,
    city,
    postalCode: trim(String(payload.postalCode || "")),
    country: trim(String(payload.country || "")),
    apartment: trim(String(payload.apartment || "")),
    deliveryInstructions: trim(String(payload.deliveryInstructions || "")),
    latitude,
    longitude,
  };
}

function normalizePreferences(
  payload: Record<string, unknown>,
): CustomerPreferencesPayload {
  const deliveryHandoff = trim(
    String(payload.deliveryHandoff || "leave_at_door"),
  );
  const preferredDeliveryWindow = trim(
    String(payload.preferredDeliveryWindow || "asap"),
  );

  if (!handoffOptions.has(deliveryHandoff)) {
    throw new HttpError(400, "Invalid delivery handoff preference.");
  }

  if (!deliveryWindowOptions.has(preferredDeliveryWindow)) {
    throw new HttpError(400, "Invalid delivery window preference.");
  }

  return {
    deliveryHandoff,
    courierNotes: trim(String(payload.courierNotes || "")),
    allowSubstitutions: booleanValue(payload.allowSubstitutions, true),
    preferredDeliveryWindow,
    orderStatusNotifications: booleanValue(
      payload.orderStatusNotifications,
      true,
    ),
    courierMessageNotifications: booleanValue(
      payload.courierMessageNotifications,
      true,
    ),
    promotionNotifications: booleanValue(payload.promotionNotifications, false),
    receiptEmailNotifications: booleanValue(
      payload.receiptEmailNotifications,
      true,
    ),
    twoStepVerification: booleanValue(payload.twoStepVerification, false),
    personalizedRecommendations: booleanValue(
      payload.personalizedRecommendations,
      true,
    ),
    reduceMotion: booleanValue(payload.reduceMotion, false),
  };
}

function normalizePaymentMethod(
  payload: Record<string, unknown>,
  options: { requireCardNumber: boolean },
): CustomerPaymentMethodPayload {
  const label = trim(String(payload.label || ""));
  const brand = trim(String(payload.brand || ""));
  const submittedLast4 = trim(String(payload.last4 || ""));
  const cardNumber = cardDigits(payload.cardNumber);
  const hasCardNumber = cardNumber.length > 0;
  const last4 = hasCardNumber ? cardNumber.slice(-4) : submittedLast4;
  const expMonth = nullableNumber(payload.expMonth);
  const expYear = nullableNumber(payload.expYear);

  if (options.requireCardNumber && !hasCardNumber) {
    throw new HttpError(400, "Full card number is required.");
  }

  if (hasCardNumber && !passesLuhn(cardNumber)) {
    throw new HttpError(400, "Card number is invalid.");
  }

  if (hasCardNumber && submittedLast4 && submittedLast4 !== last4) {
    throw new HttpError(
      400,
      "Card number does not match the submitted last four digits.",
    );
  }

  if (!label || !brand || !/^\d{4}$/.test(last4)) {
    throw new HttpError(
      400,
      "Payment label, brand, and card number are required.",
    );
  }

  if (expMonth !== null && (expMonth < 1 || expMonth > 12)) {
    throw new HttpError(400, "Expiration month must be between 1 and 12.");
  }

  if (expYear !== null && expYear < 2024) {
    throw new HttpError(400, "Expiration year is invalid.");
  }

  return {
    label,
    brand,
    last4,
    cardNumber: hasCardNumber ? cardNumber : undefined,
    encryptedCardNumber: hasCardNumber
      ? encryptPaymentCardNumber(cardNumber)
      : undefined,
    expMonth,
    expYear,
  };
}

function normalizeOrder(
  payload: Record<string, unknown>,
): CreateCustomerOrderPayload {
  const restaurantId = positiveInteger(payload.restaurantId);
  const addressId = payload.addressId === undefined || payload.addressId === null
    ? null
    : positiveInteger(payload.addressId);
  const note = trim(String(payload.note || "")).slice(0, 500);
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const paymentMethod = payload.paymentMethod === "cash" ? "cash" : "card";
  const cashTendered = nullableNumber(payload.cashTendered);

  if (!restaurantId) {
    throw new HttpError(400, "Choose a restaurant before placing an order.");
  }

  if (payload.addressId !== undefined && payload.addressId !== null && !addressId) {
    throw new HttpError(400, "Choose a valid delivery address.");
  }

  if (rawItems.length === 0 || rawItems.length > 20) {
    throw new HttpError(400, "Add between 1 and 20 menu items to an order.");
  }

  const quantities = new Map<number, number>();

  for (const rawItem of rawItems) {
    const item = rawItem as Record<string, unknown>;
    const productId = positiveInteger(item.productId);
    const quantity = positiveInteger(item.quantity);

    if (!productId || !quantity || quantity > 20) {
      throw new HttpError(400, "Each order item needs a valid quantity.");
    }

    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  const items = [...quantities].map(([productId, quantity]) => ({ productId, quantity }));

  if (items.some((item) => item.quantity > 20)) {
    throw new HttpError(400, "You can order up to 20 of each menu item.");
  }

  if (paymentMethod === "cash" && (cashTendered === null || cashTendered <= 0 || cashTendered > 100_000)) {
    throw new HttpError(400, "Enter the cash amount you will give the courier.");
  }

  return {
    restaurantId,
    addressId,
    note,
    items,
    paymentMethod,
    cashTendered: paymentMethod === "cash" ? cashTendered : null,
  };
}

export async function getCustomerProfile(userId: number) {
  const user = await customerRepository.getUserProfile(userId);

  if (!user) {
    throw new HttpError(404, "User not found.");
  }

  const [preferences, addresses, paymentMethods] = await Promise.all([
    customerRepository.ensurePreferences(userId),
    customerRepository.listAddresses(userId),
    customerRepository.listPaymentMethods(userId),
  ]);

  return {
    user,
    preferences,
    addresses,
    paymentMethods,
  };
}

export async function getRestaurantDiscovery(categorySlug = "", userId?: number) {
  const normalizedCategory = categorySlug.trim();
  const cacheKey = `catalog:discovery:v2:${encodeURIComponent(normalizedCategory.toLocaleLowerCase() || "all")}:${userId || 'anon'}`;

  return redisService.getOrSetCachedJson(cacheKey, 60, async () => {
    const [categories, restaurants, favoriteIds] = await Promise.all([
      restaurantRepository.listRestaurantCategories(),
      restaurantRepository.listDiscoverableRestaurants(normalizedCategory),
      userId ? operationsRepository.listFavoriteRestaurantIds(userId) : Promise.resolve([]),
    ]);

    const favorites = new Set(favoriteIds)
    return {
      categories,
      restaurants: restaurants.map((restaurant) => ({
        ...restaurant,
        isFavorite: favorites.has(restaurant.id),
        isOpen: restaurant.isAcceptingOrders && restaurantOpenNow(restaurant.openingHours),
      })),
    };
  });
}

export async function getRestaurantMenu(restaurantId: number) {
  return redisService.getOrSetCachedJson(`catalog:menu:${restaurantId}`, 60, async () => {
    const restaurant = await restaurantRepository.findRestaurantById(restaurantId);

    if (!restaurant || !restaurant.isActive) {
      throw new HttpError(404, "Restaurant not found.");
    }

    const [categories, products] = await Promise.all([
      restaurantRepository.listProductCategories(restaurant.id),
      customerRepository.listAvailableProducts(restaurant.id),
    ]);

    return {
      restaurant: {
        ...restaurant,
        isOpen: restaurant.isAcceptingOrders && restaurantOpenNow(restaurant.openingHours),
      },
      categories,
      products,
    };
  });
}

export async function createOrder(userId: number, payload: Record<string, unknown>) {
  const normalized = normalizeOrder(payload);
  const restaurant = await restaurantRepository.findRestaurantById(normalized.restaurantId);

  if (!restaurant || !restaurant.isActive) {
    throw new HttpError(404, "Restaurant not found.");
  }

  if (!restaurant.isAcceptingOrders || !restaurantOpenNow(restaurant.openingHours)) {
    throw new HttpError(409, 'This restaurant is not accepting orders right now.')
  }

  const addresses = await customerRepository.listAddresses(userId);
  const address = normalized.addressId
    ? addresses.find((item) => item.id === normalized.addressId)
    : addresses.find((item) => item.isDefault) || addresses[0];

  if (!address) {
    throw new HttpError(400, "Add a delivery address before placing an order.");
  }

  if (
    restaurant.latitude !== null &&
    restaurant.longitude !== null &&
    address.latitude !== null &&
    address.longitude !== null
  ) {
    const distanceKm = haversineKilometers(
      restaurant.latitude,
      restaurant.longitude,
      address.latitude,
      address.longitude,
    )
    if (distanceKm > restaurant.deliveryRadiusKm) {
      throw new HttpError(
        400,
        `This address is outside ${restaurant.name}'s ${restaurant.deliveryRadiusKm} km delivery zone.`,
      )
    }
  }

  const order = await customerRepository.createCustomerOrder(
    userId,
    { ...normalized, addressId: address.id },
    deliveryFee,
  );

  if (!order) {
    throw new HttpError(400, "One or more selected menu items are unavailable.");
  }

  await operationsRepository.createRestaurantNotification(restaurant.id, {
    type: 'order_created',
    title: `New order #${order.id}`,
    body: 'A new customer order is ready for your review.',
    data: { orderId: order.id },
  })

  return { order };
}

export async function getOrders(userId: number) {
  const orders = await customerRepository.listCustomerOrders(userId)

  return {
    orders: orders.map((order) => {
      const estimate = deliveryEstimateByStatus[
        order.status as keyof typeof deliveryEstimateByStatus
      ]

      if (!estimate) {
        return {
          ...order,
          estimatedDeliveryMinutes: null,
          estimatedDeliveryRange: null,
        }
      }

      const extraPreparationMinutes = Math.min(
        12,
        Math.max(0, order.items.reduce((total, item) => total + item.quantity, 0) - 1) * 2,
      )

      return {
        ...order,
        estimatedDeliveryMinutes: estimate.max + extraPreparationMinutes,
        estimatedDeliveryRange: {
          min: estimate.min + extraPreparationMinutes,
          max: estimate.max + extraPreparationMinutes,
        },
      }
    }),
  }
}

export async function getOrderRoute(userId: number, orderId: number) {
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new HttpError(400, 'Order not found.')
  }

  const locations = await customerRepository.getCustomerOrderRouteLocations(userId, orderId)

  if (!locations) {
    throw new HttpError(404, 'Order not found.')
  }

  const liveCourier = locations.courierId
    ? await redisService.getLiveDriver(locations.courierId)
    : null
  const courierLatitude = liveCourier?.currentLatitude ?? locations.courierLatitude
  const courierLongitude = liveCourier?.currentLongitude ?? locations.courierLongitude

  if (
    locations.restaurantLatitude === null ||
    locations.restaurantLongitude === null ||
    locations.deliveryLatitude === null ||
    locations.deliveryLongitude === null
  ) {
    throw new HttpError(400, 'Set restaurant and delivery coordinates before viewing the route.')
  }

  const isOnTheWay =
    locations.deliveryStatus === 'on_the_way' &&
    courierLatitude !== null &&
    courierLongitude !== null
  const route = isOnTheWay
    ? await routingService.findDrivingRoute(
        { latitude: courierLatitude as number, longitude: courierLongitude as number },
        { latitude: locations.deliveryLatitude, longitude: locations.deliveryLongitude },
      )
    : null

  return {
    orderId,
    restaurant: {
      name: locations.restaurantName,
      latitude: locations.restaurantLatitude,
      longitude: locations.restaurantLongitude,
    },
    delivery: {
      address: locations.deliveryAddress,
      latitude: locations.deliveryLatitude,
      longitude: locations.deliveryLongitude,
    },
    courier: locations.courierName
      ? {
          name: liveCourier?.name || locations.courierName,
          latitude: courierLatitude,
          longitude: courierLongitude,
        }
      : null,
    deliveryStatus: locations.deliveryStatus || null,
    route,
  }
}

export async function getOrderTracking(userId: number, orderId: number) {
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new HttpError(400, 'Order not found.')
  }

  const locations = await customerRepository.getCustomerOrderRouteLocations(userId, orderId)

  if (!locations) {
    throw new HttpError(404, 'Order not found.')
  }

  const liveCourier = locations.courierId
    ? await redisService.getLiveDriver(locations.courierId)
    : null

  return {
    orderId,
    courier: locations.courierName
      ? {
          name: liveCourier?.name || locations.courierName,
          latitude: liveCourier?.currentLatitude ?? locations.courierLatitude,
          longitude: liveCourier?.currentLongitude ?? locations.courierLongitude,
        }
      : null,
    deliveryStatus: locations.deliveryStatus || null,
  }
}

export async function listFavorites(userId: number) {
  return { restaurantIds: await operationsRepository.listFavoriteRestaurantIds(userId) }
}

export async function setFavorite(userId: number, restaurantId: number, isFavorite: boolean) {
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    throw new HttpError(400, 'Restaurant not found.')
  }
  const restaurant = await restaurantRepository.findRestaurantById(restaurantId)
  if (!restaurant || !restaurant.isActive) throw new HttpError(404, 'Restaurant not found.')
  return { favorite: await operationsRepository.setFavorite(userId, restaurantId, isFavorite) }
}

export async function cancelOrder(userId: number, orderId: number, reason: unknown) {
  if (!Number.isInteger(orderId) || orderId <= 0) throw new HttpError(400, 'Order not found.')
  const owner = await operationsRepository.getOrderOwner(orderId)
  if (!owner || Number(owner.user_id) !== userId) throw new HttpError(404, 'Order not found.')
  const cancelled = await operationsRepository.cancelCustomerOrder(userId, orderId, trim(String(reason || '')).slice(0, 500))
  if (!cancelled) throw new HttpError(409, 'Only a pending order can be cancelled.')

  await operationsRepository.createRestaurantNotification(Number(owner.restaurant_id), {
    type: 'order_cancelled',
    title: `Order #${orderId} was cancelled`,
    body: 'The customer cancelled this pending order.',
    data: { orderId },
  })
  return { cancelled: true }
}

export async function createOrderIssue(userId: number, orderId: number, payload: Record<string, unknown>) {
  if (!Number.isInteger(orderId) || orderId <= 0) throw new HttpError(400, 'Order not found.')
  const category = trim(String(payload.category || ''))
  const description = trim(String(payload.description || '')).slice(0, 2_000)
  if (!issueCategories.has(category) || description.length < 5) {
    throw new HttpError(400, 'Choose an issue category and describe the problem.')
  }
  const issue = await operationsRepository.createIssue(userId, orderId, { category, description })
  if (!issue) throw new HttpError(404, 'Order not found.')
  return { issue }
}

export async function createOrderReview(userId: number, orderId: number, payload: Record<string, unknown>) {
  if (!Number.isInteger(orderId) || orderId <= 0) throw new HttpError(400, 'Order not found.')
  const rating = Number(payload.rating)
  const comment = trim(String(payload.comment || '')).slice(0, 1_000)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, 'Choose a rating from 1 to 5.')
  }
  const review = await operationsRepository.createReview(userId, orderId, { rating, comment })
  if (!review) throw new HttpError(409, 'Only delivered orders can be reviewed.')
  return { review }
}

export async function reorderOrder(userId: number, orderId: number, payload: Record<string, unknown>) {
  const source = await customerRepository.getCustomerOrderForReorder(userId, orderId)
  if (!source || source.items.length === 0) throw new HttpError(404, 'This order cannot be reordered.')
  return createOrder(userId, {
    restaurantId: source.restaurantId,
    addressId: payload.addressId ?? null,
    note: '',
    items: source.items,
    paymentMethod: payload.paymentMethod || 'card',
    cashTendered: payload.cashTendered ?? null,
  })
}

export async function getOrderMessages(userId: number, orderId: number) {
  if (!Number.isInteger(orderId) || orderId <= 0) throw new HttpError(400, 'Order not found.')
  const messages = await operationsRepository.listOrderMessages(orderId, userId, 'customer')
  if (!messages) throw new HttpError(404, 'Order conversation not found.')
  return { messages }
}

export async function sendOrderMessage(userId: number, orderId: number, bodyValue: unknown) {
  if (!Number.isInteger(orderId) || orderId <= 0) throw new HttpError(400, 'Order not found.')
  const body = trim(String(bodyValue || '')).slice(0, 1_000)
  if (!body) throw new HttpError(400, 'Message cannot be empty.')
  const message = await operationsRepository.createOrderMessage(orderId, userId, 'customer', body)
  if (!message) throw new HttpError(409, 'Messaging is available after a courier is assigned.')
  const owner = await operationsRepository.getOrderOwner(orderId)
  if (owner?.courier_user_id) {
    await operationsRepository.createUserNotification(Number(owner.courier_user_id), {
      type: 'new_message',
      title: `New message for order #${orderId}`,
      body,
      data: { orderId },
    })
  }
  return { message }
}

export async function getNotifications(userId: number) {
  const notifications = await operationsRepository.listUserNotifications(userId)
  return { notifications, unreadCount: notifications.filter((notification) => !notification.readAt).length }
}

export async function readNotification(userId: number, notificationId: number) {
  if (!Number.isInteger(notificationId) || notificationId <= 0) throw new HttpError(400, 'Notification not found.')
  if (!(await operationsRepository.markUserNotificationRead(userId, notificationId))) {
    throw new HttpError(404, 'Notification not found.')
  }
  return { read: true }
}

export async function updateProfile(
  userId: number,
  payload: Record<string, unknown>,
) {
  const normalized: CustomerProfilePayload = {
    name: trim(String(payload.name || "")),
    phone: trim(String(payload.phone || "")),
  };

  if (!normalized.name) {
    throw new HttpError(400, "Name is required.");
  }

  const user = await customerRepository.updateUserProfile(userId, normalized);

  if (!user) {
    throw new HttpError(404, "User not found.");
  }

  return { user };
}

export async function updatePreferences(
  userId: number,
  payload: Record<string, unknown>,
) {
  const preferences = await customerRepository.updatePreferences(
    userId,
    normalizePreferences(payload),
  );
  return { preferences };
}

export async function createAddress(
  userId: number,
  payload: Record<string, unknown>,
) {
  const address = await customerRepository.createAddress(
    userId,
    normalizeAddress(payload),
  );
  const addresses = await customerRepository.listAddresses(userId);
  return { address, addresses };
}

export async function updateAddress(
  userId: number,
  addressId: number,
  payload: Record<string, unknown>,
) {
  const address = await customerRepository.updateAddress(
    userId,
    addressId,
    normalizeAddress(payload),
  );

  if (!address) {
    throw new HttpError(404, "Address not found.");
  }

  const addresses = await customerRepository.listAddresses(userId);
  return { address, addresses };
}

export async function setDefaultAddress(userId: number, addressId: number) {
  const address = await customerRepository.setDefaultAddress(userId, addressId);

  if (!address) {
    throw new HttpError(404, "Address not found.");
  }

  const addresses = await customerRepository.listAddresses(userId);
  return { address, addresses };
}

export async function deleteAddress(userId: number, addressId: number) {
  const address = await customerRepository.deleteAddress(userId, addressId);

  if (!address) {
    throw new HttpError(404, "Address not found.");
  }

  const addresses = await customerRepository.listAddresses(userId);
  return { address, addresses };
}

export async function createPaymentMethod(
  userId: number,
  payload: Record<string, unknown>,
) {
  const paymentMethod = await customerRepository.createPaymentMethod(
    userId,
    normalizePaymentMethod(payload, { requireCardNumber: true }),
  );
  const paymentMethods = await customerRepository.listPaymentMethods(userId);
  return { paymentMethod, paymentMethods };
}

export async function updatePaymentMethod(
  userId: number,
  paymentMethodId: number,
  payload: Record<string, unknown>,
) {
  const paymentMethod = await customerRepository.updatePaymentMethod(
    userId,
    paymentMethodId,
    normalizePaymentMethod(payload, { requireCardNumber: false }),
  );

  if (!paymentMethod) {
    throw new HttpError(404, "Payment method not found.");
  }

  const paymentMethods = await customerRepository.listPaymentMethods(userId);
  return { paymentMethod, paymentMethods };
}

export async function setDefaultPaymentMethod(
  userId: number,
  paymentMethodId: number,
) {
  const paymentMethod = await customerRepository.setDefaultPaymentMethod(
    userId,
    paymentMethodId,
  );

  if (!paymentMethod) {
    throw new HttpError(404, "Payment method not found.");
  }

  const paymentMethods = await customerRepository.listPaymentMethods(userId);
  return { paymentMethod, paymentMethods };
}

export async function deletePaymentMethod(
  userId: number,
  paymentMethodId: number,
) {
  const paymentMethod = await customerRepository.deletePaymentMethod(
    userId,
    paymentMethodId,
  );

  if (!paymentMethod) {
    throw new HttpError(404, "Payment method not found.");
  }

  const paymentMethods = await customerRepository.listPaymentMethods(userId);
  return { paymentMethod, paymentMethods };
}
