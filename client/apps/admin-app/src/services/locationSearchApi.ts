import { apiRequest } from './apiClient'

export type LocationSuggestion = {
  id: string
  label: string
  latitude: number
  longitude: number
}

const cyrillicToLatin: Record<string, string> = {
  А: 'A', а: 'a', Б: 'B', б: 'b', В: 'V', в: 'v', Г: 'G', г: 'g', Д: 'D', д: 'd', Ђ: 'Đ', ђ: 'đ', Е: 'E', е: 'e', Ж: 'Ž', ж: 'ž', З: 'Z', з: 'z', И: 'I', и: 'i', Ј: 'J', ј: 'j', К: 'K', к: 'k', Л: 'L', л: 'l', Љ: 'Lj', љ: 'lj', М: 'M', м: 'm', Н: 'N', н: 'n', Њ: 'Nj', њ: 'nj', О: 'O', о: 'o', П: 'P', п: 'p', Р: 'R', р: 'r', С: 'S', с: 's', Т: 'T', т: 't', Ћ: 'Ć', ћ: 'ć', У: 'U', у: 'u', Ф: 'F', ф: 'f', Х: 'H', х: 'h', Ц: 'C', ц: 'c', Ч: 'Č', ч: 'č', Џ: 'Dž', џ: 'dž', Ш: 'Š', ш: 'š',
}

function toLatin(value: string) {
  return value.replace(/[А-ШЂЈЉЊЋЏа-шђјљњћџ]/g, (letter) => cyrillicToLatin[letter] || letter)
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
