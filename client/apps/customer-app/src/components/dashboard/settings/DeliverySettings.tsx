import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@voro/ui'
import { MapPin, Truck } from 'lucide-react'
import { useI18n } from '../../../i18n/i18n'
import { customerApi } from '../../../services/customerApi'
import { searchLocations } from '../../../services/locationSearchApi'
import type {
  CustomerAddress,
  CustomerAddressPayload,
  CustomerPreferences,
  CustomerProfile,
} from '../../../types/customer'
import type { LocationSuggestion } from '../../../types/location'
import { SettingsSectionLayout } from './SettingsSectionLayout'

type DeliverySettingsProps = {
  addresses: CustomerAddress[]
  preferences: CustomerPreferences
  setProfile: Dispatch<SetStateAction<CustomerProfile | null>>
}

const emptyAddress: CustomerAddressPayload = {
  label: '',
  street: '',
  city: '',
  postalCode: '',
  country: '',
  apartment: '',
  deliveryInstructions: '',
  latitude: null,
  longitude: null,
}

function toPayload(address: CustomerAddress): CustomerAddressPayload {
  return {
    label: address.label,
    street: address.street,
    city: address.city,
    postalCode: address.postalCode,
    country: address.country,
    apartment: address.apartment,
    deliveryInstructions: address.deliveryInstructions,
    latitude: address.latitude,
    longitude: address.longitude,
  }
}

function mapUrl(latitude: number, longitude: number) {
  const delta = 0.01
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta,
  ].join(',')

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`
}

export function DeliverySettings({
  addresses,
  preferences,
  setProfile,
}: DeliverySettingsProps) {
  const { t } = useI18n()
  const defaultAddress = addresses.find((address) => address.isDefault) || addresses[0]
  const [editingAddressId, setEditingAddressId] = useState<number | null>(defaultAddress?.id ?? null)
  const editingAddress = addresses.find((address) => address.id === editingAddressId) || null
  const [addressForm, setAddressForm] = useState<CustomerAddressPayload>(
    editingAddress ? toPayload(editingAddress) : emptyAddress,
  )
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [status, setStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const address = addresses.find((item) => item.id === editingAddressId) || null
    setAddressForm(address ? toPayload(address) : emptyAddress)
    setSuggestions([])
    setSearchError('')
  }, [addresses, editingAddressId])

  useEffect(() => {
    const query = addressForm.street.trim()

    if (query.length < 3) {
      setSuggestions([])
      setSearchError('')
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      setIsSearching(true)
      searchLocations(query, controller.signal)
        .then((results) => {
          setSuggestions(results)
          setSearchError('')
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setSuggestions([])
            setSearchError(error instanceof Error ? error.message : t('delivery.suggestionsError'))
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearching(false)
          }
        })
    }, 350)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [addressForm.street, t])

  const mapCoordinates = useMemo(() => {
    if (addressForm.latitude === null || addressForm.longitude === null) {
      return null
    }

    return {
      latitude: addressForm.latitude,
      longitude: addressForm.longitude,
    }
  }, [addressForm.latitude, addressForm.longitude])

  function updateAddressField<Key extends keyof CustomerAddressPayload>(
    key: Key,
    value: CustomerAddressPayload[Key],
  ) {
    setAddressForm((current) => ({ ...current, [key]: value }))
  }

  function handleSelectSuggestion(suggestion: LocationSuggestion) {
    setAddressForm((current) => ({
      ...current,
      street: suggestion.street,
      city: suggestion.city,
      postalCode: suggestion.postalCode,
      country: suggestion.country,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    }))
    setSuggestions([])
    setSearchError('')
    setStatus(t('delivery.selected'))
  }

  async function updatePreferences(nextPreferences: CustomerPreferences) {
    const result = await customerApi.updatePreferences(nextPreferences)
    setProfile((current) => (current ? { ...current, preferences: result.preferences } : current))
  }

  async function handleSaveAddress() {
    setIsSaving(true)
    setStatus('')

    try {
      const result =
        editingAddressId === null
          ? await customerApi.createAddress(addressForm)
          : await customerApi.updateAddress(editingAddressId, addressForm)
      setProfile((current) => (current ? { ...current, addresses: result.addresses } : current))
      setEditingAddressId(
        result.addresses.find((address) => address.isDefault)?.id ?? result.addresses[0]?.id ?? null,
      )
      setStatus(t('delivery.saved'))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t('delivery.error'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSetDefault(addressId: number) {
    const result = await customerApi.setDefaultAddress(addressId)
    setProfile((current) => (current ? { ...current, addresses: result.addresses } : current))
    setEditingAddressId(addressId)
  }

  return (
    <SettingsSectionLayout
      description={t('delivery.description')}
      icon={Truck}
      title={t('settings.delivery.label')}
    >
      <div className="grid gap-4">
        <div className="rounded-voro-lg border border-line bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-content">{t('delivery.savedLocations')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('delivery.savedLocationsDesc')}
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingAddressId(null)
                setAddressForm(emptyAddress)
              }}
              type="button"
              variant="outline"
            >
              {t('delivery.addAddress')}
            </Button>
          </div>

          <div className="mt-4 grid gap-2">
            {addresses.length === 0 ? (
              <p className="rounded-voro-md border border-dashed border-line px-3 py-3 text-sm text-muted-foreground">
                {t('delivery.noLocations')}
              </p>
            ) : null}
            {addresses.map((address) => (
              <button
                className={`cursor-pointer rounded-voro-md border px-3 py-3 text-left transition ${
                  editingAddressId === address.id
                    ? 'border-action bg-accent'
                    : 'border-line bg-card hover:border-action/50'
                }`}
                key={address.id}
                onClick={() => setEditingAddressId(address.id)}
                type="button"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-bold text-content">
                    {address.label || t('delivery.address')}
                  </span>
                  {address.isDefault ? (
                    <span className="rounded-voro-md bg-action/15 px-2 py-1 text-xs font-bold text-action">
                      {t('common.default')}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {[address.street, address.apartment, address.postalCode, address.city]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 rounded-voro-lg border border-line bg-background p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-content">
              {t('delivery.placeName')}
              <Input
                value={addressForm.label}
                onChange={(event) => updateAddressField('label', event.target.value)}
                placeholder={t('delivery.placePlaceholder')}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-content">
              {t('delivery.apartment')}
              <Input
                value={addressForm.apartment}
                onChange={(event) => updateAddressField('apartment', event.target.value)}
                placeholder={t('delivery.apartmentPlaceholder')}
              />
            </label>
          </div>

          <div className="relative grid gap-2 text-sm font-bold text-content">
            <label htmlFor="street-search">{t('delivery.street')}</label>
            <Input
              id="street-search"
              value={addressForm.street}
              onChange={(event) => {
                updateAddressField('street', event.target.value)
                updateAddressField('latitude', null)
                updateAddressField('longitude', null)
              }}
              placeholder={t('delivery.streetPlaceholder')}
            />
            {isSearching || suggestions.length > 0 || searchError ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-voro-lg border border-line bg-popover shadow-voro-lg">
                {isSearching ? (
                  <p className="px-3 py-2 text-sm font-medium text-muted-foreground">
                    {t('common.searching')}
                  </p>
                ) : null}
                {searchError ? (
                  <p className="px-3 py-2 text-sm font-medium text-destructive">{searchError}</p>
                ) : null}
                {suggestions.map((suggestion) => (
                  <button
                    className="block w-full cursor-pointer px-3 py-2 text-left text-sm font-medium text-content transition hover:bg-accent"
                    key={suggestion.id}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    type="button"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold text-content">
              {t('delivery.city')}
              <Input
                value={addressForm.city}
                onChange={(event) => updateAddressField('city', event.target.value)}
                placeholder={t('delivery.filledFromLocation')}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-content">
              {t('delivery.postalCode')}
              <Input
                value={addressForm.postalCode}
                onChange={(event) => updateAddressField('postalCode', event.target.value)}
                placeholder={t('delivery.filledFromLocation')}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-content">
              {t('delivery.country')}
              <Input
                value={addressForm.country}
                onChange={(event) => updateAddressField('country', event.target.value)}
                placeholder={t('delivery.filledFromLocation')}
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-bold text-content">
            {t('delivery.instructions')}
            <Textarea
              value={addressForm.deliveryInstructions}
              onChange={(event) => updateAddressField('deliveryInstructions', event.target.value)}
              placeholder={t('delivery.instructionsPlaceholder')}
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{status}</p>
            <div className="flex gap-2">
              {editingAddressId ? (
                <Button
                  onClick={() => void handleSetDefault(editingAddressId)}
                  type="button"
                  variant="outline"
                >
                  {t('delivery.setDefault')}
                </Button>
              ) : null}
              <Button disabled={isSaving} onClick={handleSaveAddress} type="button">
                {isSaving ? t('common.saving') : t('delivery.saveAddress')}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-voro-lg border border-line bg-background p-4">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-action" />
            <p className="text-sm font-bold text-content">{t('delivery.mapPreview')}</p>
          </div>
          {mapCoordinates ? (
            <iframe
              className="mt-3 h-80 w-full rounded-voro-lg border border-line"
              src={mapUrl(mapCoordinates.latitude, mapCoordinates.longitude)}
              title={t('delivery.mapPreview')}
            />
          ) : (
            <div className="mt-3 grid h-80 place-items-center rounded-voro-lg border border-dashed border-line px-4 text-center text-sm text-muted-foreground">
              {t('delivery.mapEmpty')}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 rounded-voro-lg border border-line bg-background p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-content">
            {t('delivery.handoff')}
            <Select
              value={preferences.deliveryHandoff}
              onValueChange={(value) =>
                void updatePreferences({ ...preferences, deliveryHandoff: value })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leave_at_door">{t('delivery.leaveAtDoor')}</SelectItem>
                <SelectItem value="meet_at_door">{t('delivery.meetAtDoor')}</SelectItem>
                <SelectItem value="meet_outside">{t('delivery.meetOutside')}</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-content">
            {t('delivery.window')}
            <Select
              value={preferences.preferredDeliveryWindow}
              onValueChange={(value) =>
                void updatePreferences({ ...preferences, preferredDeliveryWindow: value })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asap">{t('delivery.asap')}</SelectItem>
                <SelectItem value="lunch">{t('delivery.lunch')}</SelectItem>
                <SelectItem value="evening">{t('delivery.evening')}</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
        <label className="grid gap-2 text-sm font-bold text-content">
          {t('delivery.defaultNotes')}
          <Textarea
            value={preferences.courierNotes}
            onChange={(event) =>
              void updatePreferences({ ...preferences, courierNotes: event.target.value })
            }
          />
        </label>
        <div className="flex items-center justify-between gap-4 rounded-voro-lg border border-line bg-card px-4 py-3">
          <div>
            <p className="text-sm font-bold text-content">{t('delivery.substitutions')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('delivery.substitutionsDesc')}
            </p>
          </div>
          <Switch
            checked={preferences.allowSubstitutions}
            onCheckedChange={(checked) =>
              void updatePreferences({ ...preferences, allowSubstitutions: checked })
            }
          />
        </div>
      </div>
    </SettingsSectionLayout>
  )
}
