import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchMulti, getImageUrl } from '../services/tmdb'
import MovieModal from '../components/MovieModal'
import { FaStar } from 'react-icons/fa'

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(urlQuery)
  const [results, setResults] = useState([])
  const [filterType, setFilterType] = useState('all') // 'all', 'movie', 'tv'
  const [loading, setLoading] = useState(false)
  const [searchedFor, setSearchedFor] = useState('')
  const [selected, setSelected] = useState(null)
  const requestId = useRef(0)
  const inputRef = useRef(null)

  // Focus the box with the cursor after any text carried over from the navbar
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.focus({ preventScroll: true })
    const end = el.value.length
    try { el.setSelectionRange(end, end) } catch { /* type=search may not support it */ }
  }, [])

  // Keep the box in sync if the URL changes from elsewhere (e.g. navbar search)
  useEffect(() => {
    setQuery((current) => (current.trim() === urlQuery.trim() ? current : urlQuery))
  }, [urlQuery])

  // Search as you type (debounced)
  useEffect(() => {
    const q = query.trim()
    const id = ++requestId.current

    if (!q) {
      setResults([])
      setSearchedFor('')
      setLoading(false)
      if (urlQuery) setSearchParams({}, { replace: true })
      return
    }

    setLoading(true)
    const timer = setTimeout(async () => {
      if (q !== urlQuery) setSearchParams({ q }, { replace: true })
      try {
        const data = await searchMulti(q)
        if (id !== requestId.current) return // a newer search has started
        const items = (data.results || []).filter(
          (item) => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path
        )
        setResults(items)
        setSearchedFor(q)
      } catch (err) {
        console.error(err)
      }
      if (id === requestId.current) setLoading(false)
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const handleSubmit = (e) => {
    e.preventDefault()
    e.target.querySelector('input')?.blur() // close the phone keyboard
  }

  const filteredResults = results.filter((item) => {
    if (filterType === 'all') return true
    return item.media_type === filterType
  })

  return (
    <div className="search-page">
      <div className="search-header">
        <form onSubmit={handleSubmit}>
          <input
            className="search-input-large"
            type="search"
            enterKeyHint="search"
            placeholder="Search for movies or TV series..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            ref={inputRef}
          />
        </form>

        <div className="search-meta-row">
          {results.length > 0 && (
            <p className="search-results-info">Found {filteredResults.length} title{filteredResults.length !== 1 ? 's' : ''}</p>
          )}

          {results.length > 0 && (
            <div className="search-filters">
              <button
                className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                All ({results.length})
              </button>
              <button
                className={`filter-btn ${filterType === 'movie' ? 'active' : ''}`}
                onClick={() => setFilterType('movie')}
              >
                Movies ({results.filter((i) => i.media_type === 'movie').length})
              </button>
              <button
                className={`filter-btn ${filterType === 'tv' ? 'active' : ''}`}
                onClick={() => setFilterType('tv')}
              >
                TV Shows ({results.filter((i) => i.media_type === 'tv').length})
              </button>
            </div>
          )}
        </div>
      </div>

      {loading && results.length === 0 ? (
        <div className="loading-container"><div className="spinner"></div></div>
      ) : (
        <div className={`search-grid ${loading ? 'is-updating' : ''}`}>
          {filteredResults.map((item) => {
            const title = item.title || item.name || 'Untitled'
            const dateStr = item.release_date || item.first_air_date || ''
            const year = dateStr ? new Date(dateStr).getFullYear() : ''
            const rating = item.vote_average ? item.vote_average.toFixed(1) : ''
            const isTV = item.media_type === 'tv'

            return (
              <div key={`${item.media_type}-${item.id}`} className="search-card" onClick={() => setSelected(item)}>
                <div style={{ position: 'relative' }}>
                  <img src={getImageUrl(item.poster_path)} alt={title} loading="lazy" />
                  <span className="search-type-badge">{isTV ? 'TV' : 'MOVIE'}</span>
                </div>
                <div className="search-card-body">
                  <div className="search-card-title">{title}</div>
                  <div className="search-card-info-row">
                    <span className="search-card-year">{year}</span>
                    {rating && (
                      <span className="search-card-rating">
                        <FaStar size={10} /> {rating}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && results.length === 0 && searchedFor && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '60px 0' }}>
          No titles found for &quot;{searchedFor}&quot;
        </p>
      )}

      {selected && <MovieModal movie={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}