export type CheckoutDraftItem = {
  productId: number
  name: string
  price: number
  quantity: number
}

export type CheckoutDraft = {
  restaurantId: number
  restaurantName: string
  restaurantImageUrl: string
  items: CheckoutDraftItem[]
}

const checkoutDraftStorageKey = 'voro:checkout-draft'
export const checkoutDraftChangedEvent = 'voro:checkout-draft-changed'

function notifyCheckoutDraftChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(checkoutDraftChangedEvent))
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft) {
  try {
    localStorage.setItem(checkoutDraftStorageKey, JSON.stringify(draft))
  } catch {
    // The checkout still works through navigation state if local storage is unavailable.
  } finally {
    notifyCheckoutDraftChanged()
  }
}

export function loadCheckoutDraft(): CheckoutDraft | null {
  try {
    const value = localStorage.getItem(checkoutDraftStorageKey) || sessionStorage.getItem(checkoutDraftStorageKey)
    if (!value) return null

    const draft = JSON.parse(value) as CheckoutDraft
    return Number.isInteger(draft.restaurantId) && draft.restaurantId > 0 && Array.isArray(draft.items)
      ? draft
      : null
  } catch {
    return null
  }
}

export function clearCheckoutDraft() {
  try {
    localStorage.removeItem(checkoutDraftStorageKey)
    sessionStorage.removeItem(checkoutDraftStorageKey)
  } catch {
    // There is nothing else to clear when storage is unavailable.
  } finally {
    notifyCheckoutDraftChanged()
  }
}
