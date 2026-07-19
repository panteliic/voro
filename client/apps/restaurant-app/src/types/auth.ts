export type AuthUser = {
  id: number
  name: string
  email: string
  role: string
  restaurantId: number
  restaurantName: string
  accessRole: 'manager' | 'staff'
}

export type LoginPayload = {
  email: string
  password: string
}

export type SetupPasswordPayload = {
  email: string
  setupCode: string
  password: string
}

export type AuthMode = 'login' | 'setup'
export type SetupPurpose = 'firstAccess' | 'passwordReset'
