import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { FiArrowLeft, FiVolume2, FiGlobe, FiTv, FiSliders, FiChevronLeft, FiChevronRight, FiPlay } from 'react-icons/fi'
import { FaStar } from 'react-icons/fa'
import { getMovieDetails, getTVDetails, getTVSeasonDetails, getStillUrl } from '../services/tmdb'

const SERVERS = [
  {
    id: 'vidrift',
    name: 'VidRift (Primary)',
    getMovieUrl: (id, dub) => `https://embed.vidrift.net/embed/movie/${id}?dub=${dub ? '1' : '0'}`,
    getTvUrl: (id, s, e, dub) => `https://embed.vidrift.net/embed/tv/${id}/${s}/${e}?dub=${dub ? '1' : '0'}`,
  },
  {
    id: 'vidsrc',
    name: 'VidSrc (1080p Alt)',
    getMovieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: 'autoembed',
    name: 'AutoEmbed (Multi-Source)',
    getMovieUrl: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`,
  },
]

export default function Watch() {
  const params = useParams()
  const navigate = useNavigate()
  const iframeRef = useRef(null)

  // Support both /watch/:id (defaults to movie) and /watch/:type/:id/:season?/:episode?
  const isTVRoute = params.type === 'tv'
  const mediaId = params.id
  const currentSeason = params.season ? Number(params.season) : 1
  const currentEpisode = params.episode ? Number(params.episode) : 1

  const [details, setDetails] = useState(null)
  const [seasonData, setSeasonData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [englishDefault, setEnglishDefault] = useState(true)
  const [selectedQuality, setSelectedQuality] = useState('1080p')
  const [selectedServer, setSelectedServer] = useState(SERVERS[0].id)

  useEffect(() => {
    setLoading(true)
    const fetchFn = isTVRoute ? getTVDetails : getMovieDetails
    fetchFn(mediaId)
      .then((data) => {
        setDetails(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [mediaId, isTVRoute])

  // If TV show, load current season's episodes
  useEffect(() => {
    if (isTVRoute && mediaId) {
      getTVSeasonDetails(mediaId, currentSeason)
        .then(setSeasonData)
        .catch(console.error)
    }
  }, [isTVRoute, mediaId, currentSeason])

  // Dispatch quality override to VidRift iframe via postMessage
  const applyQuality = useCallback((quality) => {
    if (selectedServer === 'vidrift' && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'vidrift:set',
            quality: quality,
          },
          'https://embed.vidrift.net'
        )
      } catch (e) {
        console.warn('postMessage to VidRift failed', e)
      }
    }
  }, [selectedServer])

  const handleQualityChange = (q) => {
    setSelectedQuality(q)
    applyQuality(q)
  }

  const handleIframeLoad = () => {
    if (selectedServer === 'vidrift') {
      applyQuality(selectedQuality)
      setTimeout(() => applyQuality(selectedQuality), 1500)
      setTimeout(() => applyQuality(selectedQuality), 3500)
    }
  }

  // Episode navigation helpers
  const totalEpisodesInSeason = seasonData?.episodes?.length || 0
  const hasNextEp = currentEpisode < totalEpisodesInSeason
  const hasPrevEp = currentEpisode > 1

  const goToEpisode = (s, e) => {
    navigate(`/watch/tv/${mediaId}/${s}/${e}`)
  }

  if (loading) {
    return (
      <div className="watch-page">
        <div className="loading-container" style={{ minHeight: '60vh' }}>
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  const currentServerObj = SERVERS.find((s) => s.id === selectedServer) || SERVERS[0]
  const playerSrc = isTVRoute
    ? currentServerObj.getTvUrl(mediaId, currentSeason, currentEpisode, englishDefault)
    : currentServerObj.getMovieUrl(mediaId, englishDefault)

  const title = details?.title || details?.name || 'Now Playing'
  const year = (details?.release_date || details?.first_air_date) ? new Date(details.release_date || details.first_air_date).getFullYear() : ''
  const rating = details?.vote_average ? details.vote_average.toFixed(1) : ''
  const currentEpData = seasonData?.episodes?.find((ep) => ep.episode_number === currentEpisode)
  const seasons = details?.seasons?.filter((s) => s.season_number > 0) || []

  return (
    <div className="watch-page">
      <header className="watch-top-bar">
        <div className="watch-top-left">
          <Link to="/" className="watch-brand-link">MOVIEPLAYER</Link>
          <button className="back-btn" onClick={() => navigate(-1)}>
            <FiArrowLeft /> Back
          </button>
        </div>

        {/* TV Quick Navigation (Season & Episode Switcher) */}
        {isTVRoute && seasons.length > 0 && (
          <div className="tv-nav-bar">
            <select
              className="season-select compact"
              value={currentSeason}
              onChange={(e) => goToEpisode(Number(e.target.value), 1)}
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.season_number}>
                  {s.name || `Season ${s.season_number}`}
                </option>
              ))}
            </select>

            <div className="episode-stepper">
              <button
                className="ep-step-btn"
                disabled={!hasPrevEp}
                onClick={() => goToEpisode(currentSeason, currentEpisode - 1)}
                title="Previous episode"
              >
                <FiChevronLeft /> Prev
              </button>
              <span className="ep-badge">
                Ep {currentEpisode} {totalEpisodesInSeason ? `/ ${totalEpisodesInSeason}` : ''}
              </span>
              <button
                className="ep-step-btn"
                disabled={!hasNextEp}
                onClick={() => goToEpisode(currentSeason, currentEpisode + 1)}
                title="Next episode"
              >
                Next <FiChevronRight />
              </button>
            </div>
          </div>
        )}

        <div className="watch-controls-group">
          {/* Quality Selector */}
          <div className="control-pill-group">
            <span className="control-label"><FiSliders size={13} /> Quality:</span>
            {['1080p', '4K', '720p', 'auto'].map((q) => (
              <button
                key={q}
                className={`control-btn ${selectedQuality === q ? 'active' : ''}`}
                onClick={() => handleQualityChange(q)}
              >
                {q.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Audio Preference */}
          {selectedServer === 'vidrift' && (
            <div className="control-pill-group">
              <button
                className={`control-btn ${englishDefault ? 'active' : ''}`}
                onClick={() => setEnglishDefault(true)}
                title="Request English dub when available"
              >
                <FiVolume2 /> English
              </button>
              <button
                className={`control-btn ${!englishDefault ? 'active' : ''}`}
                onClick={() => setEnglishDefault(false)}
                title="Original language"
              >
                <FiGlobe /> Original
              </button>
            </div>
          )}

          {/* Server Selector */}
          <div className="control-pill-group">
            <span className="control-label"><FiTv size={13} /> Server:</span>
            {SERVERS.map((s) => (
              <button
                key={s.id}
                className={`control-btn ${selectedServer === s.id ? 'active' : ''}`}
                onClick={() => setSelectedServer(s.id)}
              >
                {s.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Video Player */}
      <div className="player-container">
        <iframe
          ref={iframeRef}
          key={`${playerSrc}-${selectedServer}`}
          src={playerSrc}
          onLoad={handleIframeLoad}
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="origin"
          title={title}
        />
      </div>

      {/* Details & Episode List */}
      <div className="watch-info">
        <h1 className="watch-title">
          {title} {isTVRoute && <span className="watch-ep-heading">• S{currentSeason} E{currentEpisode}: {currentEpData?.name || `Episode ${currentEpisode}`}</span>}
        </h1>

        <div className="watch-meta">
          {rating && (
            <span style={{ color: '#ffd700', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FaStar /> {rating}
            </span>
          )}
          {year && <span>{year}</span>}
          {details?.genres?.map((g) => g.name).join(', ')}
          <span className="quality-badge">Target: {selectedQuality.toUpperCase()}</span>
          <span className="server-badge">Server: {currentServerObj.name}</span>
          <span className="type-badge">{isTVRoute ? 'TV SERIES' : 'MOVIE'}</span>
        </div>

        <p className="watch-overview">{currentEpData?.overview || details?.overview}</p>

        {/* TV Episodes Grid */}
        {isTVRoute && seasonData?.episodes && seasonData.episodes.length > 0 && (
          <div className="watch-episodes-section">
            <div className="episodes-header" style={{ marginTop: '36px' }}>
              <h2 className="modal-section-title">Season {currentSeason} Episodes</h2>
            </div>
            <div className="episodes-grid-compact">
              {seasonData.episodes.map((ep) => (
                <div
                  key={ep.id}
                  className={`episode-card ${ep.episode_number === currentEpisode ? 'active' : ''}`}
                  onClick={() => goToEpisode(currentSeason, ep.episode_number)}
                >
                  <div className="ep-card-thumb-box">
                    <img
                      src={getStillUrl(ep.still_path)}
                      alt={ep.name}
                      className="ep-card-thumb"
                      loading="lazy"
                    />
                    <div className="ep-card-play"><FiPlay /></div>
                  </div>
                  <div className="ep-card-body">
                    <div className="ep-card-title">
                      {ep.episode_number}. {ep.name}
                    </div>
                    {ep.runtime && <span className="ep-card-runtime">{ep.runtime}m</span>}
                    <p className="ep-card-overview">{ep.overview || 'No synopsis'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}