import type { LocationSuggestion } from '../types/location'

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

export async function searchLocations(query: string, signal?: AbortSignal) {
  const trimmedQuery = query.trim()
  const typedHouseNumber = extractHouseNumber(trimmedQuery)

  if (trimmedQuery.length < 3) {
    return []
  }

  const params = new URLSearchParams({
    q: toLatin(trimmedQuery),
    limit: '6',
    lang: 'en',
    lon: '20.4612',
    lat: '44.8125',
    bbox: `${SERBIA_BBOX.minLon},${SERBIA_BBOX.minLat},${SERBIA_BBOX.maxLon},${SERBIA_BBOX.maxLat}`,
  })
  const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, { signal })

  if (!response.ok) {
    throw new Error('Could not load location suggestions.')
  }

  const data = (await response.json()) as PhotonResponse

  return (data.features || [])
    .map((feature): LocationSuggestion | null => {
      const coordinates = feature.geometry?.coordinates
      const properties = feature.properties

      if (!coordinates || !properties) {
        return null
      }

      const [longitude, latitude] = coordinates
      if (!isInsideSerbia(longitude, latitude)) {
        return null
      }

      if (properties.countrycode && properties.countrycode.toUpperCase() !== 'RS') {
        return null
      }

      const houseNumber = properties.housenumber || typedHouseNumber
      const street = [properties.street || properties.name || '', houseNumber]
        .filter(Boolean)
        .join(' ')
        .trim()
      const city = properties.city || properties.district || properties.state || ''
      const country = properties.country || ''
      const suggestion = {
        id: `${properties.osm_type || 'place'}-${properties.osm_id || `${latitude}-${longitude}`}`,
        label: '',
        street: toLatin(street),
        city: toLatin(city),
        postalCode: toLatin(properties.postcode || ''),
        country: toLatin(country || 'Serbia'),
        latitude,
        longitude,
      }

      return {
        ...suggestion,
        label: suggestionLabel(suggestion),
      }
    })
    .filter((suggestion): suggestion is LocationSuggestion => Boolean(suggestion?.street))
}
