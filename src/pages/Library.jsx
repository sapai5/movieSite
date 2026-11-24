import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiBookmark, FiCheck, FiDownload, FiUpload, FiPlayCircle, FiPlay, FiX } from 'react-icons/fi'
import useLibrary from '../hooks/useLibrary'
import MovieCard from '../components/MovieCard'
import MovieModal from '../components/MovieModal'
import { downloadBackup, importBackup, MAX_IMPORT_BYTES } from '../services/backup'
import { getInProgressList, removeTitleProgress, formatRemaining } from '../services/progress'
import { getBackdropUrl, getImageUrl } from '../services/tmdb'

// Started-but-unfinished titles, kept in sync with playback, imports and other tabs.
function useInProgress() {
  const [items, setItems] = useState(getInProgressList)
  useEffect(() => {
    const load = () => setItems(getInProgressList())
    const events = ['movieplayer_progress_updated', 'movieplayer_library_updated', 'storage']
    events.forEach((name) => window.addEventListener(name, load))
    return () => events.forEach((name) => window.removeEventListener(name, load))
  }, [])
  return items
}

function ProgressCard({ item, onResume, onRemove }) {
  const isTV = item.type === 'tv'
  const image = getBackdropUrl(item.backdrop_path, 'w780') || getImageUrl(item.poster_path, 'w500')
  const remaining = formatRemaining(item.currentTime, item.duration)
  const label = `Resume ${item.title}${isTV ? `, season ${item.season} episode ${item.episode}` : ''}`
  return (
    <div className="progress-card">
      <button className="progress-card-main" onClick={() => onResume(item)} aria-label={label}>
        <span className="progress-card-media">
          {image ? <img src={image} alt="" loading="lazy" /> : <span className="progress-card-fallback" aria-hidden="true">{item.title}</span>}
          <span className="progress-card-play" aria-hidden="true"><FiPlay /></span>
          <span className="progress-card-bar" aria-hidden="true"><span style={{ width: `${Math.max(4, item.progressPercent || 0)}%` }} /></span>
        </span>
        <span className="progress-card-body">
          <span className="progress-card-title">{item.title}</span>
          <span className="progress-card-meta">
            {isTV ? <span className="ep-tag">S{item.season}:E{item.episode}</span> : <span>Movie</span>}
            {remaining && <span className="progress-card-left">{remaining}</span>}
          </span>
        </span>
      </button>
      <button className="progress-card-remove" onClick={() => onRemove(item)} aria-label={`Remove ${item.title} from In Progress`} title="Remove progress">
        <FiX />
      </button>
    </div>
  )
}

const TABS = [['progress', 'In Progress', FiPlayCircle], ['watchlist', 'Watchlist', FiBookmark], ['watched', 'Watched', FiCheck]]
const EMPTY = {
  progress: ['Nothing in progress', 'Start a movie or episode and it will wait for you here.', FiPlayCircle],
  watchlist: ['Your next movie night starts here', 'Use the + button on a poster to save a movie or show.', FiBookmark],
  watched: ['Your watched collection starts here', 'Use the checkmark on a title to add it to Watched.', FiCheck],
}

export default function Library() {
  const library = useLibrary()
  const inProgress = useInProgress()
  const navigate = useNavigate()
  // Open on what you're in the middle of, if anything.
  const [tab, setTab] = useState(() => (getInProgressList().length ? 'progress' : 'watchlist'))
  const [type, setType] = useState('all')
  const [selected, setSelected] = useState(null)
  const [backupStatus, setBackupStatus] = useState(null)
  const fileRef = useRef(null)

  const handleExport = () => {
    try { downloadBackup(); setBackupStatus({ text: 'Progress exported.' }) }
    catch { setBackupStatus({ text: "Couldn't create the export file.", error: true }) }
  }
  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('That file is too large to be a progress backup.')
      const { progress, library: saved } = importBackup(await file.text())
      setBackupStatus({ text: progress || saved
        ? `Imported ${progress} playback position${progress === 1 ? '' : 's'} and ${saved} library title${saved === 1 ? '' : 's'}.`
        : 'Nothing new to import. Everything in that file is already here.' })
    } catch (error) {
      setBackupStatus({ text: error.message || "Couldn't import that file.", error: true })
    }
  }

  const resume = (item) => navigate(item.type === 'tv' ? `/watch/tv/${item.id}/${item.season || 1}/${item.episode || 1}` : `/watch/movie/${item.id}`)
  const matchesType = (mediaType) => type === 'all' || mediaType === type

  const entries = Object.values(library).sort((a, b) => b.updatedAt - a.updatedAt)
  const counts = {
    progress: inProgress.length,
    watchlist: entries.filter((item) => item.status === 'watchlist').length,
    watched: entries.filter((item) => item.status === 'watched').length,
  }
  const progressItems = inProgress.filter((item) => matchesType(item.type))
  const items = entries.filter((item) => item.status === tab && matchesType(item.media_type))
  const shown = tab === 'progress' ? progressItems.length : items.length
  const [emptyTitle, emptyText, EmptyIcon] = EMPTY[tab]

  return (
    <main className="library-page">
      <div className="library-heading"><span className="library-eyebrow">YOUR COLLECTION</span><h1>My Library</h1>
        <p>Saved for another night. Remembered long after the credits.</p></div>

      <div className="library-tabs" role="group" aria-label="Library collection">
        {TABS.map(([value, label, Icon]) => (
          <button key={value} className={tab === value ? 'active' : ''} aria-pressed={tab === value} onClick={() => setTab(value)}>
            <Icon aria-hidden="true" /> <span className="library-tab-label">{label}</span> <span className="library-tab-count">{counts[value]}</span>
          </button>
        ))}
      </div>

      <div className="library-filter-row">
        <div className="search-filters" role="group" aria-label="Filter library by type">
          {[['all', 'All'], ['movie', 'Movies'], ['tv', 'TV Shows']].map(([value, label]) => (
            <button key={value} className={`filter-btn ${type === value ? 'active' : ''}`} aria-pressed={type === value} onClick={() => setType(value)}>{label}</button>
          ))}
        </div>
      </div>

      {shown ? (
        tab === 'progress' ? (
          <div className="progress-grid">
            {progressItems.map((item) => (
              <ProgressCard key={`${item.type}_${item.id}`} item={item} onResume={resume} onRemove={(i) => removeTitleProgress(i.id, i.type)} />
            ))}
          </div>
        ) : (
          <div className="library-grid">{items.map((item) => (
            <MovieCard key={`${item.media_type}:${item.id}`} movie={item} onClick={() => setSelected(item)} />
          ))}</div>
        )
      ) : (
        <div className="library-empty"><EmptyIcon size={32} />
          <h2>{emptyTitle}</h2>
          <p>{type !== 'all' ? 'No titles match this filter yet.' : emptyText}</p>
          <Link className="btn btn-play" to="/">Explore titles</Link></div>
      )}

      {/* Backup is occasional, so it lives at the bottom instead of crowding the filters */}
      <section className="library-data" aria-labelledby="library-data-title">
        <div className="library-data-text">
          <h2 id="library-data-title">Your data</h2>
          <p>Progress and your library are saved on this browser. Export a backup to move them to another device.</p>
        </div>
        <div className="library-data-actions">
          <button className="library-action" onClick={handleExport} aria-label="Export progress"><FiDownload aria-hidden="true" /> Export</button>
          <button className="library-action" onClick={() => fileRef.current?.click()} aria-label="Import progress"><FiUpload aria-hidden="true" /> Import</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label="Progress backup file" onChange={handleImport} />
        </div>
        {backupStatus && <p className={`library-backup-status${backupStatus.error ? ' error' : ''}`} role="status">{backupStatus.text}</p>}
      </section>

      {selected && <MovieModal movie={selected} onClose={() => setSelected(null)} />}
    </main>
  )
}
