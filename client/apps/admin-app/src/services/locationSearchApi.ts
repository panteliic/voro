import { apiRequest } from './apiClient'

export type LocationSuggestion = {
  id: string
  label: string
  latitude: number
  longitude: number
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    city?: string
    country?: string
    countrycode?: string
    district?: string
    housenumber?: string
    name?: string
    osm_id?: number
    osm_type?: string
    postcode?: string
    state?: string
    street?: string
  }
}

type PhotonResponse = { features?: PhotonFeature[] }

type NominatimResult = {
  place_id?: number
  lat?: string
  lon?: string
  address?: {
    country_code?: string
    house_number?: string
    road?: string
  }
  display_name?: string
}

const serbiaBounds = { minLon: 18.8, minLat: 42.2, maxLon: 23.1, maxLat: 46.2 }

const cyrillicToLatin: Record<string, string> = {
  А: 'A', а: 'a', Б: 'B', б: 'b', В: 'V', в: 'v', Г: 'G', г: 'g', Д: 'D', д: 'd', Ђ: 'Đ', ђ: 'đ', Е: 'E', е: 'e', Ж: 'Ž', ж: 'ž', З: 'Z', з: 'z', И: 'I', и: 'i', Ј: 'J', ј: 'j', К: 'K', к: 'k', Л: 'L', л: 'l', Љ: 'Lj', љ: 'lj', М: 'M', м: 'm', Н: 'N', н: 'n', Њ: 'Nj', њ: 'nj', О: 'O', о: 'o', П: 'P', п: 'p', Р: 'R', р: 'r', С: 'S', с: 's', Т: 'T', т: 't', Ћ: 'Ć', ћ: 'ć', У: 'U', у: 'u', Ф: 'F', ф: 'f', Х: 'H', х: 'h', Ц: 'C', ц: 'c', Ч: 'Č', ч: 'č', Џ: 'Dž', џ: 'dž', Ш: 'Š', ш: 'š',
}

function toLatin(value: string) {
  return value.replace(/[А-ШЂЈЉЊЋЏа-шђјљњћџ]/g, (letter) => cyrillicToLatin[letter] || letter)
}

function isInsideSerbia(longitude: number, latitude: number) {
  return longitude >= serbiaBounds.minLon && longitude <= serbiaBounds.maxLon && latitude >= serbiaBounds.minLat && latitude <= serbiaBounds.maxLat
}

function extractHouseNumber(query: string) {
  return query.match(/\b\d+[a-zA-ZčćđšžČĆĐŠŽ]?\b/)?.[0] || ''
}

function normalizedHouseNumber(value: string) {
  return value.replace(/\s/g, '').toLocaleLowerCase()
}

async function searchExactHouseNumber(query: string, houseNumber: string, signal?: AbortSignal) {
  const params = new URLSearchParams({
    q: toLatin(query),
    format: 'jsonv2',
    addressdetails: '1',
    countrycodes: 'rs',
    limit: '6',
  })
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { signal })
  if (!response.ok) return []

  const data = (await response.json()) as NominatimResult[]

  return data
    .map((result): LocationSuggestion | null => {
      const latitude = Number(result.lat)
      const longitude = Number(result.lon)
      const address = result.address

      if (
        !address?.road ||
        normalizedHouseNumber(address.house_number || '') !== normalizedHouseNumber(houseNumber) ||
        !isInsideSerbia(longitude, latitude) ||
        address.country_code?.toUpperCase() !== 'RS'
      ) {
        return null
      }

      return {
        id: `nominatim-${result.place_id || `${latitude}-${longitude}`}`,
        label: toLatin(result.display_name || `${address.road} ${address.house_number}`),
        latitude,
        longitude,
      }
    })
    .filter((suggestion): suggestion is LocationSuggestion => Boolean(suggestion))
}

export async function searchLocations(query: string, signal?: AbortSignal): Promise<LocationSuggestion[]> {
  const trimmedQuery = query.trim()
  if (trimmedQuery.length < 3) return []

  const result = await apiRequest<{ suggestions: LocationSuggestion[] }>(
    `/admin/restaurant-location-suggestions?q=${encodeURIComponent(trimmedQuery)}`,
    { signal },
  )
  return result.suggestions.map((suggestion) => ({
    ...suggestion,
    label: toLatin(suggestion.label),
  }))
}
