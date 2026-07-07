import { useEffect, useState } from 'react'
import { getDashboardStats } from '../services/adminApi'
import type { AdminStats } from '../types/admin'

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadStats() {
      try {
        const result = await getDashboardStats()

        if (isMounted) {
          setStats(result.stats)
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : 'Could not load stats.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadStats()

    return () => {
      isMounted = false
    }
  }, [])

  return { stats, error, isLoading }
}
