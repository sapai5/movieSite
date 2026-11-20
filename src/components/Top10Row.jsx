import { useState, useEffect, useRef } from 'react'
import { FiChevronLeft, FiChevronRight, FiPlay, FiTrendingUp } from 'react-icons/fi'
import { fetchGlobalTop10 } from '../services/recommendations'
import { getImageUrl } from '../services/tmdb'
import { recordInteraction } from '../services/history'

export default function Top10Row({ onSelect }) {
  const [items, setItems] = useState([])
  const scrollRef = useRef(null)

  useEffect(() => {
    fetchGlobalTop10().then(setItems)
  }, [])

  const scroll = (dir) => {
    if (!scrollRef.current) return
    const amount = scrollRef.current.clientWidth * 0.75
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth'
    })
  }

  const handleCardClick = (item) => {
    recordInteraction(item)
    onSelect(item)
  }

  if (items.length === 0) return null

  return (
    <div className="movie-row top-10-row">
      <div className="row-header">
        <h2 className="row-title">
          <FiTrendingUp style={{ color: '#e50914', marginRight: '8px', verticalAlign: 'middle' }} />
          Top 10 Worldwide Today
        </h2>
      </div>

      <div className="row-scroll-container">
        <button
          className="scroll-btn scroll-btn-left visible"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          <FiChevronLeft />
        </button>

        <div className="row-movies top-10-scroll-track" ref={scrollRef}>
          {items.map((item, index) => {
            const rank = index + 1
            const isTV = item.media_type === 'tv'
            const title = item.title || item.name || 'Untitled'

            return (
              <div
                key={`top10-${item.id}`}
                className="top-10-item"
                onClick={() => handleCardClick(item)}
              >
                {/* Large Stylized Outline Rank Number */}
                <span className="top-10-rank-number">{rank}</span>

                {/* Poster Card */}
                <div className="top-10-card-wrapper">
                  <img
                    src={getImageUrl(item.poster_path, 'w500')}
                    alt={title}
                    className="top-10-card-img"
                    loading="lazy"
                  />
                  <div className="top-10-card-overlay">
                    <span className="type-badge top-10-type-badge">{isTV ? 'TV' : 'MOVIE'}</span>
                    <div className="top-10-play-icon">
                      <FiPlay />
                    </div>
                    <div className="top-10-card-title">{title}</div>
                  </div>
                </div>
              </div>
            )
          })}
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