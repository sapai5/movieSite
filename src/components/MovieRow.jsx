import { useRef, useState, useEffect, useCallback } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import MovieCard from './MovieCard'

export default function MovieRow({ title, movies, onSelect }) {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 10)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)

    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [movies, checkScroll])

  const scroll = (dir) => {
    if (!scrollRef.current) return
    const container = scrollRef.current
    const scrollAmount = container.clientWidth * 0.75
    container.scrollBy({
      left: dir === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  if (!movies || movies.length === 0) return null

  return (
    <div className="movie-row">
      <div className="row-header">
        <h2 className="row-title">{title}</h2>
      </div>
      <div className="row-scroll-container">
        <button
          className={`scroll-btn scroll-btn-left ${canScrollLeft ? 'visible' : ''}`}
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          disabled={!canScrollLeft}
        >
          <FiChevronLeft />
        </button>

        <div className="row-movies" ref={scrollRef}>
          {movies.map((movie) => (
            <MovieCard key={`${movie.media_type || 'movie'}:${movie.id}`} movie={movie} onClick={() => onSelect(movie)} />
          ))}
        </div>

        <button
          className={`scroll-btn scroll-btn-right ${canScrollRight ? 'visible' : ''}`}
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          disabled={!canScrollRight}
        >
          <FiChevronRight />
        </button>
      </div>
    </div>
  )
}
