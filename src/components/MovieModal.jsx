import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiX, FiPlay } from 'react-icons/fi'
import { FaStar } from 'react-icons/fa'
import { getBackdropUrl, getImageUrl, getStillUrl, getMovieDetails, getTVDetails, getTVSeasonDetails } from '../services/tmdb'

export default function MovieModal({ movie, onClose }) {
  const [details, setDetails] = useState(null)
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [seasonData, setSeasonData] = useState(null)
  const [episodesLoading, setEpisodesLoading] = useState(false)
  const navigate = useNavigate()

  const isTV = movie?.media_type === 'tv' || Boolean(movie?.first_air_date && !movie?.release_date)

  useEffect(() => {
    if (movie) {
      const fetchFn = isTV ? getTVDetails : getMovieDetails
      fetchFn(movie.id)
        .then((data) => {
          setDetails(data)
          if (isTV && data.seasons && data.seasons.length > 0) {
            // Find first regular season (usually season 1)
            const firstRegular = data.seasons.find((s) => s.season_number > 0) || data.seasons[0]
            setSelectedSeason(firstRegular.season_number)
          }
        })
        .catch(console.error)
      document.body.style.overflow = 'hidden'
    }
    return () => { document.body.style.overflow = '' }
  }, [movie, isTV])

  // Load episodes when selectedSeason changes for TV shows
  useEffect(() => {
    if (isTV && movie?.id && selectedSeason != null) {
      setEpisodesLoading(true)
      getTVSeasonDetails(movie.id, selectedSeason)
        .then((data) => {
          setSeasonData(data)
          setEpisodesLoading(false)
        })
        .catch((err) => {
          console.error(err)
          setEpisodesLoading(false)
        })
    }
  }, [isTV, movie?.id, selectedSeason])

  if (!movie) return null

  const d = details || movie
  const title = d.title || d.name || ''
  const dateStr = d.release_date || d.first_air_date || ''
  const year = dateStr ? new Date(dateStr).getFullYear() : ''
  const rating = d.vote_average ? d.vote_average.toFixed(1) : 'N/A'
  const runtime = d.runtime ? `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}m` : ''
  const genres = d.genres || []
  const similar = details?.similar?.results?.slice(0, 8) || []
  const seasons = details?.seasons?.filter((s) => s.season_number > 0) || []

  const handlePlayMain = () => {
    onClose()
    if (isTV) {
      navigate(`/watch/tv/${d.id}/${selectedSeason}/1`)
    } else {
      navigate(`/watch/movie/${d.id}`)
    }
  }

  const handlePlayEpisode = (epNum) => {
    onClose()
    navigate(`/watch/tv/${d.id}/${selectedSeason}/${epNum}`)
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}><FiX /></button>
        {getBackdropUrl(d.backdrop_path) && (
          <img className="modal-backdrop-img" src={getBackdropUrl(d.backdrop_path)} alt="" />
        )}
        <div className="modal-body">
          <h2 className="modal-title">{title}</h2>
          <div className="modal-meta">
            <span className="hero-rating"><FaStar /> {rating}</span>
            {year && <span>{year}</span>}
            {runtime && <span>{runtime}</span>}
            <span className="type-badge">{isTV ? 'TV SERIES' : 'MOVIE'}</span>
            {isTV && details?.number_of_seasons && (
              <span>{details.number_of_seasons} Season{details.number_of_seasons > 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="modal-genres">
            {genres.map((g) => (
              <span key={g.id} className="genre-tag">{g.name}</span>
            ))}
          </div>
          <p className="modal-overview">{d.overview}</p>
          <div className="modal-play-btn">
            <button className="btn btn-play" onClick={handlePlayMain}>
              <FiPlay /> {isTV ? `Play Season ${selectedSeason}` : 'Play Movie'}
            </button>
          </div>

          {/* TV Episodes Section */}
          {isTV && seasons.length > 0 && (
            <div className="modal-episodes-section">
              <div className="episodes-header">
                <h3 className="modal-section-title">Episodes</h3>
                <div className="season-select-wrapper">
                  <select
                    className="season-select"
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  >
                    {seasons.map((s) => (
                      <option key={s.id} value={s.season_number}>
                        {s.name || `Season ${s.season_number}`} ({s.episode_count} eps)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {episodesLoading ? (
                <div className="loading-container" style={{ padding: '30px' }}>
                  <div className="spinner"></div>
                </div>
              ) : (
                <div className="episodes-list">
                  {seasonData?.episodes?.map((ep) => (
                    <div
                      key={ep.id}
                      className="episode-item"
                      onClick={() => handlePlayEpisode(ep.episode_number)}
                    >
                      <div className="episode-thumbnail-box">
                        <img
                          src={getStillUrl(ep.still_path)}
                          alt={ep.name}
                          className="episode-thumb"
                          loading="lazy"
                        />
                        <div className="episode-play-overlay">
                          <FiPlay />
                        </div>
                      </div>
                      <div className="episode-info">
                        <div className="episode-title-row">
                          <span className="episode-num">{ep.episode_number}.</span>
                          <span className="episode-name">{ep.name}</span>
                          {ep.runtime && <span className="episode-runtime">{ep.runtime}m</span>}
                        </div>
                        <p className="episode-overview">{ep.overview || 'No episode description available.'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Similar Recommendations */}
          {similar.length > 0 && (
            <div style={{ marginTop: '36px' }}>
              <h3 className="modal-section-title">More Like This</h3>
              <div className="similar-grid">
                {similar.map((s) => (
                  <div
                    key={s.id}
                    className="similar-card"
                    onClick={() => {
                      onClose()
                      if (isTV) {
                        navigate(`/watch/tv/${s.id}/1/1`)
                      } else {
                        navigate(`/watch/movie/${s.id}`)
                      }
                    }}
                  >
                    <img src={getImageUrl(s.poster_path, 'w300')} alt={s.title || s.name} loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}