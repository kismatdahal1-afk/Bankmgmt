import { useState, useEffect, useCallback } from 'react'

export function useApi(apiFunc, params = null, immediate = true) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)

  const execute = useCallback(async (p) => {
    setLoading(true)
    setError(null)
    try {
      const res = p ? await apiFunc(p) : await apiFunc()
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [apiFunc])

  useEffect(() => {
    if (immediate) {
      execute(params)
    }
  }, [execute, params, immediate])

  return { data, loading, error, execute, setData }
}
