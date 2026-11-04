import { FiPlay, FiInfo } from 'react-icons/fi'
import { FaStar } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { getImageUrl } from '../services/tmdb'

export default function MovieCard({ movie, onClick }) {
  const navigate = useNavigate()
  const title = movie.title || movie.name || 'Untitled'
  const dateStr = movie.release_date || movie.first_air_date || ''
  const year = dateStr ? new Date(dateStr).getFullYear() : ''
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : ''
  const isTV = movie.media_type === 'tv' || Boolean(movie.first_air_date && !movie.release_date)

  const handlePlayDirect = (e) => {
    e.stopPropagation()
    if (isTV) {
      navigate(`/watch/tv/${movie.id}/1/1`)
    } else {
      navigate(`/watch/movie/${movie.id}`)
    }
  }

  return (
    <div className="movie-card" onClick={onClick}>
      <div className="movie-card-media">
        <img
          className="movie-card-img"
          src={getImageUrl(movie.poster_path)}
          alt={title}
          loading="lazy"
        />
        <div className="movie-card-overlay">
          <div className="movie-card-quick-actions">
            <button
              className="quick-action-btn play"
              onClick={handlePlayDirect}
              title={isTV ? 'Play S1 E1' : 'Play movie'}
            >
              <FiPlay />
            </button>
            <button
              className="quick-action-btn info"
              onClick={onClick}
              title="More info"
            >
              <FiInfo />
            </button>
          </div>
          <div className="movie-card-details">
            <div className="movie-card-title">{title}</div>
            <div className="movie-card-info">
              {rating && (
                <span className="movie-card-rating">
                  <FaStar size={11} /> {rating}
                </span>
              )}
              {year && <span className="movie-card-year">{year}</span>}
              <span className="type-badge">{isTV ? 'TV' : 'MOVIE'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}