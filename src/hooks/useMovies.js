import { useState, useEffect } from 'react'

export function useMovies(fetchFn, deps = []) {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchFn()
      .then((data) => {
        if (!cancelled) {
          setMovies(data.results || [])
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, deps)

  return { movies, loading, error }
}
