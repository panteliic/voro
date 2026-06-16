import { useState, type Dispatch, type SetStateAction } from 'react'
import { Button, Input } from '@voro/ui'
import { CreditCard, Eye, EyeOff, Pencil } from 'lucide-react'
import { useI18n } from '../../../i18n/i18n'
import { customerApi } from '../../../services/customerApi'
import type {
  CustomerPaymentMethod,
  CustomerPaymentMethodPayload,
  CustomerProfile,
} from '../../../types/customer'
import { SettingsSectionLayout } from './SettingsSectionLayout'

type PaymentSettingsProps = {
  paymentMethods: CustomerPaymentMethod[]
  setProfile: Dispatch<SetStateAction<CustomerProfile | null>>
}

const currentYear = new Date().getFullYear()

const emptyPaymentMethod: CustomerPaymentMethodPayload = {
  label: '',
  brand: '',
  last4: '',
  expMonth: null,
  expYear: null,
}

function cardDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 19)
}

function hasMaskedCharacters(value: string) {
  return value.includes('•')
}

function formatCardNumber(value: string) {
  return cardDigits(value)
    .replace(/(.{4})/g, '$1 ')
    .trim()
}

function maskedCardNumber(last4: string) {
  return `•••• •••• •••• ${last4}`
}

function detectCardBrand(value: string) {
  const digits = cardDigits(value)

  if (/^4/.test(digits)) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard'
  if (/^3[47]/.test(digits)) return 'American Express'
  if (/^6(?:011|5)/.test(digits)) return 'Discover'
  if (/^3(?:0[0-5]|[68])/.test(digits)) return 'Diners Club'
  if (/^35/.test(digits)) return 'JCB'
  if (/^9891/.test(digits)) return 'DinaCard'
  if (/^(50|5[6-9]|6)/.test(digits)) return 'Maestro'

  return ''
}

function normalizeMonthInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 2)

  if (!digits) {
    return ''
  }

  const month = Number(digits)

  if (month > 12) {
    return '12'
  }

  return digits
}

function normalizeYearInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 4)
}

function passesLuhn(value: string) {
  const digits = cardDigits(value)

  if (digits.length < 12) {
    return false
  }

  let sum = 0
  let shouldDouble = false

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index])

    if (shouldDouble) {
      digit *= 2

      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    shouldDouble = !shouldDouble
  }

  return sum % 10 === 0
}

export function PaymentSettings({ paymentMethods, setProfile }: PaymentSettingsProps) {
  const { t } = useI18n()
  const [form, setForm] = useState<CustomerPaymentMethodPayload>(emptyPaymentMethod)
  const [editingPaymentMethodId, setEditingPaymentMethodId] = useState<number | null>(null)
  const [cardNumber, setCardNumber] = useState('')
  const [isCardNumberVisible, setIsCardNumberVisible] = useState(true)
  const [expMonthInput, setExpMonthInput] = useState('')
  const [expYearInput, setExpYearInput] = useState('')
  const [cardNumberError, setCardNumberError] = useState('')
  const [expiryError, setExpiryError] = useState('')
  const [status, setStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const detectedBrand = detectCardBrand(cardNumber) || form.brand
  const isEditing = editingPaymentMethodId !== null
  const displayedCardNumber =
    isCardNumberVisible || hasMaskedCharacters(cardNumber)
      ? cardNumber || t('payments.cardNumberPlaceholder')
      : maskedCardNumber(form.last4 || '0000')

  function updateField<Key extends keyof CustomerPaymentMethodPayload>(
    key: Key,
    value: CustomerPaymentMethodPayload[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleCardNumberChange(value: string) {
    const formattedValue = formatCardNumber(value)
    const brand = detectCardBrand(formattedValue)
    const digits = cardDigits(formattedValue)

    setCardNumber(formattedValue)
    setCardNumberError('')
    setExpiryError('')
    setForm((current) => ({
      ...current,
      brand,
      last4: digits.length >= 4 ? digits.slice(-4) : '',
    }))
  }

  function resetForm() {
    setEditingPaymentMethodId(null)
    setForm(emptyPaymentMethod)
    setCardNumber('')
    setExpMonthInput('')
    setExpYearInput('')
    setCardNumberError('')
    setExpiryError('')
    setStatus('')
    setIsCardNumberVisible(true)
  }

  function handleEditMethod(method: CustomerPaymentMethod) {
    setEditingPaymentMethodId(method.id)
    setForm({
      label: method.label,
      brand: method.brand,
      last4: method.last4,
      expMonth: method.expMonth,
      expYear: method.expYear,
    })
    setCardNumber(maskedCardNumber(method.last4))
    setIsCardNumberVisible(true)
    setExpMonthInput(method.expMonth ? String(method.expMonth).padStart(2, '0') : '')
    setExpYearInput(method.expYear ? String(method.expYear) : '')
    setCardNumberError('')
    setExpiryError('')
    setStatus('')
  }

  async function handleAddPaymentMethod() {
    const digits = cardDigits(cardNumber)
    const hasMaskedSavedCard =
      hasMaskedCharacters(cardNumber) && digits.length === 4 && Boolean(form.brand && form.last4)
    const nextBrand = detectCardBrand(cardNumber) || form.brand
    const nextLast4 = digits.length >= 4 ? digits.slice(-4) : form.last4

    if (!hasMaskedSavedCard && !passesLuhn(cardNumber)) {
      setCardNumberError(t('payments.cardNumberInvalid'))
      return
    }

    const expMonth = expMonthInput ? Number(expMonthInput) : null
    const expYear = expYearInput ? Number(expYearInput) : null

    if (
      (expMonth !== null && (expMonth < 1 || expMonth > 12)) ||
      (expYear !== null && (expYearInput.length !== 4 || expYear < currentYear))
    ) {
      setExpiryError(t('payments.expiryInvalid'))
      return
    }

    setIsSaving(true)
    setStatus('')

    try {
      const payload = {
        ...form,
        brand: nextBrand,
        cardNumber: hasMaskedSavedCard ? undefined : digits,
        expMonth,
        expYear,
        last4: nextLast4,
      }
      const result = editingPaymentMethodId
        ? await customerApi.updatePaymentMethod(editingPaymentMethodId, payload)
        : await customerApi.createPaymentMethod(payload)

      setProfile((current) =>
        current ? { ...current, paymentMethods: result.paymentMethods } : current,
      )
      resetForm()
      setStatus(editingPaymentMethodId ? t('payments.updated') : t('payments.saved'))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t('payments.error'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSetDefault(paymentMethodId: number) {
    const result = await customerApi.setDefaultPaymentMethod(paymentMethodId)
    setProfile((current) =>
      current ? { ...current, paymentMethods: result.paymentMethods } : current,
    )
  }

  async function handleDelete(paymentMethodId: number) {
    const result = await customerApi.deletePaymentMethod(paymentMethodId)
    setProfile((current) =>
      current ? { ...current, paymentMethods: result.paymentMethods } : current,
    )
  }

  return (
    <SettingsSectionLayout
      description={t('payments.description')}
      icon={CreditCard}
      title={t('settings.payments.label')}
    >
      <div className="grid gap-3">
        <div>
          <h3 className="text-sm font-bold text-content">{t('payments.savedCards')}</h3>
        </div>
        {paymentMethods.length === 0 ? (
          <p className="rounded-voro-lg border border-dashed border-line bg-background px-4 py-3 text-sm text-muted-foreground">
            {t('payments.empty')}
          </p>
        ) : null}
        {paymentMethods.map((method) => (
          <div
            className="grid gap-3 rounded-voro-lg border border-line bg-background px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
            key={method.id}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-content">{method.label}</p>
                <span className="rounded-voro-md bg-action/15 px-2 py-1 text-xs font-bold text-action">
                  {method.brand}
                </span>
                <span className="font-mono text-sm font-bold text-content">
                  {maskedCardNumber(method.last4)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {method.expMonth && method.expYear
                  ? t('payments.expires', { month: method.expMonth, year: method.expYear })
                  : t('payments.noExpiration')}
                {method.isDefault ? ` · ${t('common.default')}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => handleEditMethod(method)} type="button" variant="outline">
                <Pencil className="size-4" />
                {t('payments.edit')}
              </Button>
              {!method.isDefault ? (
                <Button
                  onClick={() => void handleSetDefault(method.id)}
                  type="button"
                  variant="outline"
                >
                  {t('payments.setDefault')}
                </Button>
              ) : null}
              <Button onClick={() => void handleDelete(method.id)} type="button" variant="outline">
                {t('common.remove')}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 rounded-voro-lg border border-line bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-content">
              {isEditing ? t('payments.editCard') : t('payments.newCard')}
            </h3>
            {isEditing ? (
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {t('payments.savedNumberHidden')}
              </p>
            ) : null}
          </div>
          {isEditing ? (
            <Button onClick={resetForm} type="button" variant="outline">
              {t('payments.addNewCard')}
            </Button>
          ) : null}
          <Button disabled={isSaving} onClick={handleAddPaymentMethod} type="button">
            {isSaving ? t('common.saving') : isEditing ? t('payments.update') : t('payments.add')}
          </Button>
        </div>
        <div className="rounded-voro-lg border border-line bg-card p-4 shadow-voro-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-voro-md bg-action/15 px-2 py-1 text-xs font-bold uppercase text-action">
              {detectedBrand || t('payments.unknownBrand')}
            </span>
            <CreditCard className="size-5 text-muted-foreground" />
          </div>
          <p className="mt-6 font-mono text-xl font-bold tracking-wide text-content">
            {displayedCardNumber}
          </p>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">
                {t('payments.label')}
              </p>
              <p className="mt-1 text-sm font-bold text-content">
                {form.label || t('payments.labelPlaceholder')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase text-muted-foreground">
                {t('payments.expiresLabel')}
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-content">
                {expMonthInput || 'MM'}/{expYearInput ? expYearInput.slice(-2) : 'YY'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-bold text-content">
            {t('payments.label')}
            <Input
              value={form.label}
              onChange={(event) => updateField('label', event.target.value)}
              placeholder={t('payments.labelPlaceholder')}
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-bold text-content">
          {t('payments.cardNumber')}
          <div className="relative">
            <Input
              aria-invalid={Boolean(cardNumberError)}
              className="font-mono tracking-wide pr-10"
              inputMode="numeric"
              maxLength={23}
              onChange={(event) => handleCardNumberChange(event.target.value)}
              placeholder={t('payments.cardNumberPlaceholder')}
              value={
                isCardNumberVisible || hasMaskedCharacters(cardNumber)
                  ? cardNumber
                  : maskedCardNumber(form.last4 || '')
              }
            />
            <button
              aria-label={t(isCardNumberVisible ? 'payments.hideNumber' : 'payments.showNumber')}
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-voro-md text-muted-foreground transition hover:bg-accent hover:text-content"
              onClick={() => setIsCardNumberVisible((value) => !value)}
              type="button"
            >
              {isCardNumberVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {cardNumberError ? (
            <span className="text-xs font-bold text-destructive">{cardNumberError}</span>
          ) : null}
        </label>
        <div className="grid w-full grid-cols-2 gap-3">
          <label className="grid gap-2 text-sm font-bold text-content">
            {t('payments.month')}
            <Input
              aria-invalid={Boolean(expiryError)}
              inputMode="numeric"
              maxLength={2}
              onChange={(event) => {
                const value = normalizeMonthInput(event.target.value)
                setExpMonthInput(value)
                updateField('expMonth', value === '' ? null : Number(value))
                setExpiryError('')
              }}
              placeholder="MM"
              value={expMonthInput}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-content">
            {t('payments.year')}
            <Input
              aria-invalid={Boolean(expiryError)}
              inputMode="numeric"
              maxLength={4}
              onChange={(event) => {
                const value = normalizeYearInput(event.target.value)
                setExpYearInput(value)
                updateField('expYear', value === '' ? null : Number(value))
                setExpiryError('')
              }}
              placeholder="YYYY"
              value={expYearInput}
            />
          </label>
        </div>
        {expiryError ? <p className="text-xs font-bold text-destructive">{expiryError}</p> : null}
        {status ? <p className="text-sm font-medium text-muted-foreground">{status}</p> : null}
      </div>
    </SettingsSectionLayout>
  )
}
