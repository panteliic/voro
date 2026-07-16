import * as customerRepository from "../repositories/customerRepository";
import * as restaurantRepository from "../repositories/restaurantRepository";
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

  return { restaurantId, addressId, note, items };
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

export async function getRestaurantDiscovery(categorySlug = "") {
  const [categories, restaurants] = await Promise.all([
    restaurantRepository.listRestaurantCategories(),
    restaurantRepository.listDiscoverableRestaurants(categorySlug),
  ]);

  return { categories, restaurants };
}

export async function getRestaurantMenu(restaurantId: number) {
  const restaurant = await restaurantRepository.findRestaurantById(restaurantId);

  if (!restaurant || !restaurant.isActive) {
    throw new HttpError(404, "Restaurant not found.");
  }

  const [categories, products] = await Promise.all([
    restaurantRepository.listProductCategories(restaurant.id),
    customerRepository.listAvailableProducts(restaurant.id),
  ]);

  return { restaurant, categories, products };
}

export async function createOrder(userId: number, payload: Record<string, unknown>) {
  const normalized = normalizeOrder(payload);
  const restaurant = await restaurantRepository.findRestaurantById(normalized.restaurantId);

  if (!restaurant || !restaurant.isActive) {
    throw new HttpError(404, "Restaurant not found.");
  }

  const addresses = await customerRepository.listAddresses(userId);
  const address = normalized.addressId
    ? addresses.find((item) => item.id === normalized.addressId)
    : addresses.find((item) => item.isDefault) || addresses[0];

  if (!address) {
    throw new HttpError(400, "Add a delivery address before placing an order.");
  }

  const order = await customerRepository.createCustomerOrder(
    userId,
    { ...normalized, addressId: address.id },
    deliveryFee,
  );

  if (!order) {
    throw new HttpError(400, "One or more selected menu items are unavailable.");
  }

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
