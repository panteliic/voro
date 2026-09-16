import { HttpError } from '../utils/httpError'
import * as redisService from './redisService'

type GeocodingResult = {
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
  lat?: string
  lon?: string
  place_id?: number
  display_name?: string
}

export type GeocodedLocation = {
  latitude: number
  longitude: number
  displayName: string
  street?: string
  city?: string
  postalCode?: string
  country?: string
}

export type AddressSuggestion = {
  id: string
  label: string
  street: string
  city: string
  postalCode: string
  country: string
  latitude: number
  longitude: number
}

function isInsideSerbia(latitude: number, longitude: number) {
  return latitude >= 42.2 && latitude <= 46.2 && longitude >= 18.8 && longitude <= 23.1
}

function houseNumberFromQuery(query: string) {
  return query.match(/\b\d+[a-zA-ZčćđšžČĆĐŠŽ]?\b/)?.[0] || ''
}

function normalizedHouseNumber(value: string) {
  return value.replace(/\s/g, '').toLocaleLowerCase()
}

export async function searchAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  const searchQuery = query.trim()
  if (searchQuery.length < 3) return []

  return redisService.getOrSetCachedJson(
    `geocode:suggestions:${encodeURIComponent(searchQuery.toLocaleLowerCase())}`,
    24 * 60 * 60,
    async () => {
      const url = new URL('https://nominatim.openstreetmap.org/search')
      url.searchParams.set('q', searchQuery)
      url.searchParams.set('format', 'jsonv2')
      url.searchParams.set('addressdetails', '1')
      url.searchParams.set('countrycodes', 'rs')
      url.searchParams.set('limit', '6')

      let response: Response

      try {
        response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Voro Delivery/1.0 (address suggestion lookup)',
          },
          signal: AbortSignal.timeout(8_000),
        })
      } catch {
        throw new HttpError(502, 'Could not reach the address service.')
      }

      if (!response.ok) {
        throw new HttpError(502, 'Could not load address suggestions.')
      }

      const requestedHouseNumber = houseNumberFromQuery(searchQuery)
      const data = (await response.json()) as GeocodingResult[]

      return data
        .map((result): AddressSuggestion | null => {
          const latitude = Number(result.lat)
          const longitude = Number(result.lon)
          const address = result.address
          const streetName = address?.road || ''
          const houseNumber = address?.house_number || ''

          if (
            !address ||
            !streetName ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            !isInsideSerbia(latitude, longitude) ||
            address.country_code?.toUpperCase() !== 'RS' ||
            (requestedHouseNumber && normalizedHouseNumber(houseNumber) !== normalizedHouseNumber(requestedHouseNumber))
          ) {
            return null
          }

          const street = [streetName, houseNumber].filter(Boolean).join(' ')
          const city = address.city || address.town || address.village || address.municipality || address.city_district || address.state || ''
          const postalCode = address.postcode || ''
          const country = address.country || 'Serbia'

          return {
            id: `nominatim-${result.place_id || `${latitude}-${longitude}`}`,
            label: [street, city, postalCode, country].filter(Boolean).join(', '),
            street,
            city,
            postalCode,
            country,
            latitude,
            longitude,
          }
        })
        .filter((suggestion): suggestion is AddressSuggestion => Boolean(suggestion))
    },
  )
}

export async function geocodeAddress(address: string): Promise<GeocodedLocation> {
  const query = address.trim()

  if (query.length < 5) {
    throw new HttpError(400, 'Enter a complete restaurant address.')
  }

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')

  let response: Response

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Voro Delivery/1.0 (restaurant location lookup)',
      },
      signal: AbortSignal.timeout(8_000),
    })
  } catch {
    throw new HttpError(502, 'Could not reach the location service.')
  }

  if (!response.ok) {
    throw new HttpError(502, 'Could not find the restaurant location.')
  }

  const result = ((await response.json()) as GeocodingResult[])[0]
  const latitude = Number(result?.lat)
  const longitude = Number(result?.lon)

  if (
    !result ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new HttpError(404, 'No map location was found for this address.')
  }

  return {
    latitude,
    longitude,
    displayName: result.display_name || query,
  }
}

export async function reverseGeocodeAddress(latitude: number, longitude: number): Promise<GeocodedLocation> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new HttpError(400, 'Location coordinates are invalid.')
  }

  const cacheKey = `geocode:reverse:${latitude.toFixed(4)}:${longitude.toFixed(4)}`
  return redisService.getOrSetCachedJson(cacheKey, 7 * 24 * 60 * 60, async () => {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('lat', String(latitude))
    url.searchParams.set('lon', String(longitude))
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('zoom', '18')

    let response: Response
    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Voro Delivery/1.0 (courier location lookup)',
        },
        signal: AbortSignal.timeout(8_000),
      })
    } catch {
      throw new HttpError(502, 'Could not reach the location service.')
    }

    if (!response.ok) {
      throw new HttpError(502, 'Could not resolve the courier location.')
    }

    const result = (await response.json()) as GeocodingResult
    const address = result.address
    const street = [address?.road, address?.house_number].filter(Boolean).join(' ')
    const city = address?.city || address?.town || address?.village || address?.municipality || address?.city_district || address?.state || ''
    const displayName = [street, city, address?.postcode, address?.country].filter(Boolean).join(', ') || result.display_name

    if (!displayName) {
      throw new HttpError(404, 'No address was found for this courier location.')
    }

    return {
      latitude,
      longitude,
      displayName,
      street,
      city,
      postalCode: address?.postcode || '',
      country: address?.country || 'Serbia',
    }
  })
}
