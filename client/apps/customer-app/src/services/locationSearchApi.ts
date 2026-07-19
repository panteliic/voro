import type { LocationSuggestion } from '../types/location'
import { customerApi } from './customerApi'

type PhotonFeature = {
  geometry?: {
    coordinates?: [number, number]
  }
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

type PhotonResponse = {
  features?: PhotonFeature[]
}

type NominatimResult = {
  place_id?: number
  lat?: string
  lon?: string
  address?: {
    city?: string
    city_district?: string
    country?: string
    country_code?: string
    house_number?: string
    municipality?: string
    postcode?: string
    road?: string
    state?: string
    town?: string
    village?: string
  }
}

const SERBIA_BBOX = {
  minLon: 18.8,
  minLat: 42.2,
  maxLon: 23.1,
  maxLat: 46.2,
}

const cyrillicToLatin: Record<string, string> = {
  А: 'A',
  а: 'a',
  Б: 'B',
  б: 'b',
  В: 'V',
  в: 'v',
  Г: 'G',
  г: 'g',
  Д: 'D',
  д: 'd',
  Ђ: 'Đ',
  ђ: 'đ',
  Е: 'E',
  е: 'e',
  Ж: 'Ž',
  ж: 'ž',
  З: 'Z',
  з: 'z',
  И: 'I',
  и: 'i',
  Ј: 'J',
  ј: 'j',
  К: 'K',
  к: 'k',
  Л: 'L',
  л: 'l',
  Љ: 'Lj',
  љ: 'lj',
  М: 'M',
  м: 'm',
  Н: 'N',
  н: 'n',
  Њ: 'Nj',
  њ: 'nj',
  О: 'O',
  о: 'o',
  П: 'P',
  п: 'p',
  Р: 'R',
  р: 'r',
  С: 'S',
  с: 's',
  Т: 'T',
  т: 't',
  Ћ: 'Ć',
  ћ: 'ć',
  У: 'U',
  у: 'u',
  Ф: 'F',
  ф: 'f',
  Х: 'H',
  х: 'h',
  Ц: 'C',
  ц: 'c',
  Ч: 'Č',
  ч: 'č',
  Џ: 'Dž',
  џ: 'dž',
  Ш: 'Š',
  ш: 'š',
}

function toLatin(value: string) {
  return value.replace(/[А-ШЂЈЉЊЋЏа-шђјљњћџ]/g, (letter) => cyrillicToLatin[letter] || letter)
}

function isInsideSerbia(longitude: number, latitude: number) {
  return (
    longitude >= SERBIA_BBOX.minLon &&
    longitude <= SERBIA_BBOX.maxLon &&
    latitude >= SERBIA_BBOX.minLat &&
    latitude <= SERBIA_BBOX.maxLat
  )
}

function extractHouseNumber(query: string) {
  return query.match(/\b\d+[a-zA-ZčćđšžČĆĐŠŽ]?\b/)?.[0] || ''
}

function suggestionLabel(suggestion: LocationSuggestion) {
  return [suggestion.street, suggestion.city, suggestion.postalCode, suggestion.country]
    .filter(Boolean)
    .join(', ')
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
      const resultHouseNumber = address?.house_number || ''
      const street = address?.road || ''

      if (
        !address ||
        !street ||
        normalizedHouseNumber(resultHouseNumber) !== normalizedHouseNumber(houseNumber) ||
        !isInsideSerbia(longitude, latitude) ||
        address.country_code?.toUpperCase() !== 'RS'
      ) {
        return null
      }

      const suggestion = {
        id: `nominatim-${result.place_id || `${latitude}-${longitude}`}`,
        label: '',
        street: toLatin([street, resultHouseNumber].join(' ')),
        city: toLatin(address.city || address.town || address.village || address.municipality || address.city_district || address.state || ''),
        postalCode: toLatin(address.postcode || ''),
        country: toLatin(address.country || 'Serbia'),
        latitude,
        longitude,
      }

      return { ...suggestion, label: suggestionLabel(suggestion) }
    })
    .filter((suggestion): suggestion is LocationSuggestion => Boolean(suggestion))
}

export async function searchLocations(query: string, signal?: AbortSignal) {
  const trimmedQuery = query.trim()

  if (trimmedQuery.length < 3) {
    return []
  }

  return customerApi.searchAddressSuggestions(trimmedQuery, signal).then((suggestions) =>
    suggestions.map((suggestion) => ({
      ...suggestion,
      label: toLatin(suggestion.label),
      street: toLatin(suggestion.street),
      city: toLatin(suggestion.city),
      postalCode: toLatin(suggestion.postalCode),
      country: toLatin(suggestion.country),
    })),
  )
}
