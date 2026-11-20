import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlay, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { getContinueWatchingList, removePlaybackPosition, formatRemaining, formatTime } from '../services/progress'
import { getBackdropUrl, getImageUrl } from '../services/tmdb'

export default function ContinueWatchingRow() {
  const [items, setItems] = useState([])
  const scrollRef = useRef(null)
  const navigate = useNavigate()

  const loadItems = () => {
    setItems(getContinueWatchingList())
  }

  useEffect(() => {
    loadItems()
    window.addEventListener('storage', loadItems)
    return () => window.removeEventListener('storage', loadItems)
  }, [])

  const handleResume = (item) => {
    if (item.type === 'tv') {
      navigate(`/watch/tv/${item.id}/${item.season || 1}/${item.episode || 1}`)
    } else {
      navigate(`/watch/movie/${item.id}`)
    }
  }

  const handleRemove = (e, item) => {
    e.stopPropagation()
    removePlaybackPosition(item.id, item.type, item.season, item.episode)
    loadItems()
  }

  const scroll = (dir) => {
    if (!scrollRef.current) return
    const amount = scrollRef.current.clientWidth * 0.75
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth'
    })
  }

  if (items.length === 0) return null

  return (
    <div className="movie-row continue-watching-row">
      <div className="row-header">
        <h2 className="row-title">Continue Watching for You</h2>
      </div>
      <div className="row-scroll-container">
        <button
          className="scroll-btn scroll-btn-left visible"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          <FiChevronLeft />
        </button>

        <div className="row-movies continue-row-movies" ref={scrollRef}>
          {items.map((item) => {
            const isTV = item.type === 'tv'
            const imgSrc = getBackdropUrl(item.backdrop_path, 'w780') || getImageUrl(item.poster_path, 'w500')
            const remaining = formatRemaining(item.currentTime, item.duration)

            return (
              <div
                key={`${item.type}_${item.id}_${item.season}_${item.episode}`}
                className="continue-card"
                onClick={() => handleResume(item)}
              >
                <div className="continue-media-box">
                  <img
                    src={imgSrc}
                    alt={item.title}
                    className="continue-card-img"
                    loading="lazy"
                  />
                  <button
                    className="continue-remove-btn"
                    onClick={(e) => handleRemove(e, item)}
                    title="Remove from Continue Watching"
                  >
                    <FiX />
                  </button>
                  <div className="continue-play-overlay">
                    <div className="continue-play-circle">
                      <FiPlay />
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="continue-progress-bar">
                    <div
                      className="continue-progress-fill"
                      style={{ width: `${Math.max(5, item.progressPercent)}%` }}
                    />
                  </div>
                </div>

                <div className="continue-card-body">
                  <div className="continue-card-title">{item.title}</div>
                  <div className="continue-card-subtitle">
                    {isTV && <span className="ep-tag">S{item.season}:E{item.episode}</span>}
                    {remaining ? (
                      <span className="time-rem">{remaining}</span>
                    ) : (
                      <span className="time-rem">{formatTime(item.currentTime)}</span>
                    )}
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