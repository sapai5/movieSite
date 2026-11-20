import { useState, useEffect, useRef } from 'react'
import { FiChevronLeft, FiChevronRight, FiGlobe } from 'react-icons/fi'
import MovieCard from './MovieCard'
import { fetchInternationalHits } from '../services/recommendations'

const REGIONS = [
  { id: 'us', label: '🇺🇸 United States', desc: 'Top Hollywood & US Releases' },
  { id: 'ko', label: '🇰🇷 South Korea', desc: 'K-Dramas & Korean Cinema' },
  { id: 'ja', label: '🇯🇵 Japan', desc: 'Anime & Blockbusters' },
  { id: 'es', label: '🇪🇸 Spain & LatAm', desc: 'Spanish Thrillers & Drama' },
  { id: 'gb', label: '🇬🇧 United Kingdom', desc: 'British Cinema & Series' },
  { id: 'fr', label: '🇫🇷 France', desc: 'French Cinema' },
  { id: 'hi', label: '🇮🇳 India', desc: 'Bollywood & Indian Hits' },
  { id: 'de', label: '🇩🇪 Germany', desc: 'German Films & Series' },
  { id: 'all', label: '🌍 Global Mix', desc: 'Worldwide Acclaimed Hits' },
]

export default function InternationalRow({ onSelect }) {
  // United States is the primary/default region
  const [selectedRegion, setSelectedRegion] = useState(REGIONS[0].id)
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchInternationalHits(selectedRegion).then((data) => {
      if (!cancelled) {
        setMovies(data)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [selectedRegion])

  const scroll = (dir) => {
    if (!scrollRef.current) return
    const amount = scrollRef.current.clientWidth * 0.75
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth'
    })
  }

  const activeRegionObj = REGIONS.find(r => r.id === selectedRegion) || REGIONS[0]
  const regionName = activeRegionObj.label.split(' ').slice(1).join(' ')

  return (
    <div className="movie-row international-row">
      <div className="row-header international-header">
        <div>
          <h2 className="row-title">
            <FiGlobe style={{ color: '#5ac8fa', marginRight: '8px', verticalAlign: 'middle' }} />
            Popular Around the World
          </h2>
          <span className="row-subtitle">Trending in {regionName}: {activeRegionObj.desc}</span>
        </div>

        {/* Region / Country Pills */}
        <div className="region-pills-container">
          {REGIONS.map((r) => (
            <button
              key={r.id}
              className={`region-pill-btn ${selectedRegion === r.id ? 'active' : ''}`}
              onClick={() => setSelectedRegion(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="row-scroll-container">
        <button
          className="scroll-btn scroll-btn-left visible"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          <FiChevronLeft />
        </button>

        <div className="row-movies" ref={scrollRef}>
          {loading ? (
            <div className="row-loading-spinner"><div className="spinner"></div></div>
          ) : (
            movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} onClick={() => onSelect(movie)} />
            ))
          )}
        </div>

        <button
          className="scroll-btn scroll-btn-right visible"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          <FiChevronRight />
        </button>
      </div>
    </div>
  )
}