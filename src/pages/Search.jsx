import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { searchMulti, getImageUrl } from '../services/tmdb'
import MovieModal from '../components/MovieModal'
import { FaStar } from 'react-icons/fa'

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState([])
  const [filterType, setFilterType] = useState('all') // 'all', 'movie', 'tv'
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [totalResults, setTotalResults] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setQuery(q)
      performSearch(q)
    }
  }, [searchParams])

  const performSearch = async (q) => {
    if (!q.trim()) return
    setLoading(true)
    try {
      const data = await searchMulti(q)
      // Filter out people or items without posters
      const items = (data.results || []).filter(
        (item) => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path
      )
      setResults(items)
      setTotalResults(items.length)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      setSearchParams({ q: query.trim() })
    }
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
            type="text"
            placeholder="Search for movies or TV series..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </form>

        <div className="search-meta-row">
          {totalResults > 0 && (
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

      {loading ? (
        <div className="loading-container"><div className="spinner"></div></div>
      ) : (
        <div className="search-grid">
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

      {!loading && results.length === 0 && initialQuery && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '60px 0' }}>
          No titles found for &quot;{initialQuery}&quot;
        </p>
      )}

      {selected && <MovieModal movie={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}