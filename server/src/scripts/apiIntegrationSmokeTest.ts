import assert from 'node:assert/strict'

const baseUrl = (process.env.VORO_TEST_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '')

type ApiResult<T> = { status: number; body: T }

async function request<T>(path: string, options: { method?: string; token?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()
  const body = (response.headers.get('content-type')?.includes('application/json')
    ? (text ? JSON.parse(text) : {})
    : text) as T
  return { status: response.status, body }
}

function mustSucceed<T>(result: ApiResult<T>, label: string) {
  assert.ok(result.status >= 200 && result.status < 300, `${label} failed (${result.status}): ${JSON.stringify(result.body)}`)
  return result.body
}

async function waitFor<T>(callback: () => Promise<T | null>, label: string, attempts = 16) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = await callback()
    if (value) return value
    await new Promise((resolve) => setTimeout(resolve, 1_500))
  }
  throw new Error(`Timed out waiting for ${label}.`)
}

type TokenResponse = { accessToken: string }
type Restaurant = { id: number; name: string }
type Product = { id: number }
type Order = { id: number; discountAmount: number; tipAmount: number }
type DriverOffer = { id: number; orderId: number }
type Delivery = { id: number; orderId: number }

async function run() {
  const health = mustSucceed(await request<{ status: string; database: string; redis: string }>('/health'), 'health check')
  assert.equal(health.status, 'ok')
  assert.equal(health.database, 'ok')
  assert.equal(health.redis, 'ok')

  const metrics = await request<string>('/metrics')
  assert.equal(metrics.status, 200)

  const email = `api-e2e-${Date.now()}-${process.pid}@voro.test`
  const signup = mustSucceed(await request<{ devCode?: string }>('/auth/signup', {
    method: 'POST',
    body: { name: 'API Integration Customer', email, password: 'valid-password-123' },
  }), 'signup')
  assert.ok(signup.devCode, 'The API integration test requires development email verification codes.')
  mustSucceed(await request('/auth/verify-email', {
    method: 'POST',
    body: { email, code: signup.devCode },
  }), 'email verification')
  const customerSession = mustSucceed(await request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: { email, password: 'valid-password-123' },
  }), 'customer login')

  const customerToken = customerSession.accessToken
  const profile = mustSucceed(await request<{ referral: { code: string } }>('/customer/profile', { token: customerToken }), 'customer profile')
  assert.match(profile.referral.code, /^VORO-/)

  const address = mustSucceed(await request<{ address: { id: number } }>('/customer/addresses', {
    method: 'POST',
    token: customerToken,
    body: {
      label: 'API E2E', street: 'Studentski trg 1', city: 'Beograd', postalCode: '11000', country: 'Serbia',
      apartment: '', deliveryInstructions: '', latitude: 44.8128, longitude: 20.427,
    },
  }), 'address creation').address

  const restaurants = mustSucceed(await request<{ restaurants: Restaurant[] }>('/customer/restaurants', { token: customerToken }), 'restaurant discovery')
  const restaurant = restaurants.restaurants.find((item) => item.name === 'Domaće palačinke')
  assert.ok(restaurant, 'Expected the deterministic Domaće palačinke demo restaurant.')
  const menu = mustSucceed(await request<{ products: Product[] }>(`/customer/restaurants/${restaurant.id}`, { token: customerToken }), 'menu lookup')
  assert.ok(menu.products.length > 0, 'The demo restaurant needs at least one product.')

  const adminSession = mustSucceed(await request<TokenResponse>('/admin/auth/login', {
    method: 'POST',
    body: { email: 'admin@seed.voro.test', password: 'password123' },
  }), 'admin login')
  const promoCode = `E2E-${Date.now()}`
  const promotion = mustSucceed(await request<{ promotion: { code: string } }>('/admin/promotions', {
    method: 'POST',
    token: adminSession.accessToken,
    body: {
      restaurantId: restaurant.id, code: promoCode, description: 'API integration promotion',
      discountType: 'fixed', discountValue: 100, minimumOrder: 0, maxRedemptions: 1,
    },
  }), 'promotion creation')
  assert.equal(promotion.promotion.code, promoCode)

  const checkout = mustSucceed(await request<{ order: Order }>('/customer/orders', {
    method: 'POST',
    token: customerToken,
    body: {
      restaurantId: restaurant.id, addressId: address.id, note: 'API integration dispatch test',
      items: [{ productId: menu.products[0].id, quantity: 1 }], paymentMethod: 'cash', cashTendered: 5_000,
      promoCode, referralCode: '', tipAmount: 50,
    },
  }), 'checkout').order
  assert.equal(checkout.discountAmount, 100)
  assert.equal(checkout.tipAmount, 50)

  const restaurantSession = mustSucceed(await request<TokenResponse>('/restaurant/auth/login', {
    method: 'POST',
    body: { email: 'restaurant.domace-palacinke@voro.test', password: 'password123' },
  }), 'restaurant login')
  const driverSession = mustSucceed(await request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: { email: 'marko.jovanovic@driver.voro.test', password: 'password123' },
  }), 'driver login')
  mustSucceed(await request('/driver/presence', {
    method: 'PATCH', token: driverSession.accessToken,
    body: { isOnline: true, latitude: 44.8144, longitude: 20.4399 },
  }), 'driver presence')
  mustSucceed(await request(`/restaurant/orders/${checkout.id}/status`, {
    method: 'PATCH', token: restaurantSession.accessToken, body: { status: 'accepted' },
  }), 'restaurant acceptance')

  const offer = await waitFor(async () => {
    const dashboard = mustSucceed(await request<{ offers: DriverOffer[] }>('/driver/me', { token: driverSession.accessToken }), 'driver dashboard')
    return dashboard.offers.find((item) => item.orderId === checkout.id) || null
  }, 'dispatch offer')
  const acceptedOffer = mustSucceed(await request<{ delivery: Delivery }>(`/driver/offers/${offer.id}/accept`, {
    method: 'POST', token: driverSession.accessToken,
  }), 'dispatch acceptance')
  assert.equal(acceptedOffer.delivery.orderId, checkout.id)
  for (const status of ['picked_up', 'on_the_way', 'delivered']) {
    mustSucceed(await request(`/driver/deliveries/${acceptedOffer.delivery.id}/status`, {
      method: 'PATCH', token: driverSession.accessToken, body: { status },
    }), `delivery status ${status}`)
  }

  const month = new Date().toISOString().slice(0, 7)
  const calendar = mustSucceed(await request<{ orders: Array<{ id: number }> }>(`/restaurant/orders/completed?month=${month}`, {
    token: restaurantSession.accessToken,
  }), 'restaurant calendar')
  assert.ok(calendar.orders.some((order) => order.id === checkout.id), 'Completed order must appear in the restaurant calendar.')

  const cancellableOrder = mustSucceed(await request<{ order: Order }>('/customer/orders', {
    method: 'POST', token: customerToken,
    body: {
      restaurantId: restaurant.id, addressId: address.id, note: 'API integration cancellation test',
      items: [{ productId: menu.products[0].id, quantity: 1 }], paymentMethod: 'cash', cashTendered: 5_000,
      promoCode: '', referralCode: '', tipAmount: 0,
    },
  }), 'second checkout').order
  const cancellation = mustSucceed(await request<{ cancelled: boolean }>(`/customer/orders/${cancellableOrder.id}/cancel`, {
    method: 'POST', token: customerToken, body: { reason: 'API integration test cleanup' },
  }), 'order cancellation')
  assert.equal(cancellation.cancelled, true)

  console.log('API integration smoke test passed: registration, checkout, promotion, dispatch, calendar, and cancellation.')
}

void run().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
