import { FiPlay, FiInfo } from 'react-icons/fi'
import { FaStar } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { getBackdropUrl } from '../services/tmdb'

export default function Hero({ movie, onInfo }) {
  const navigate = useNavigate()
  if (!movie) return null

  const title = movie.title || movie.name || ''
  const dateStr = movie.release_date || movie.first_air_date || ''
  const year = dateStr ? new Date(dateStr).getFullYear() : ''
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'
  const isTV = movie.media_type === 'tv' || Boolean(movie.first_air_date && !movie.release_date)

  const handlePlay = () => {
    if (isTV) {
      navigate(`/watch/tv/${movie.id}/1/1`)
    } else {
      navigate(`/watch/movie/${movie.id}`)
    }
  }

  return (
    <section
      className="hero"
      style={{
        backgroundImage: `url(${getBackdropUrl(movie.backdrop_path)})`,
      }}
    >
      <div className="hero-content">
        <h1 className="hero-title">{title}</h1>
        <div className="hero-meta">
          <span className="hero-rating"><FaStar /> {rating}</span>
          {year && <span className="hero-year">{year}</span>}
          <span className="type-badge large">{isTV ? 'TV SERIES' : 'MOVIE'}</span>
        </div>
        <p className="hero-overview">{movie.overview}</p>
        <div className="hero-buttons">
          <button className="btn btn-play" onClick={handlePlay}>
            <FiPlay /> {isTV ? 'Play S1:E1' : 'Play'}
          </button>
          <button className="btn btn-info" onClick={() => onInfo(movie)}>
            <FiInfo /> More Info
          </button>
        </div>
      </div>
    </section>
  )
}