import { useState } from 'react'
import { FiPlus, FiBookmark, FiCheck } from 'react-icons/fi'
import useLibrary from '../hooks/useLibrary'
import { libraryKey, setLibraryStatus } from '../services/library'

export default function LibraryActions({ movie, compact = false }) {
  const library = useLibrary()
  const status = library[libraryKey(movie)]?.status
  const [error, setError] = useState('')
  const change = (event, next) => {
    event.stopPropagation()
    try {
      setLibraryStatus(movie, status === next ? null : next)
      setError('')
    } catch { setError('Could not save. Browser storage may be full or disabled.') }
  }
  return (
    <div className={`library-actions${compact ? ' compact' : ''}`} onClick={(e) => e.stopPropagation()}>
      <button type="button" className={`library-action ${status === 'watchlist' ? 'selected' : ''}`}
        aria-pressed={status === 'watchlist'} aria-label={status === 'watchlist' ? 'Remove from watchlist' : 'Add to watchlist'}
        title={status === 'watchlist' ? 'Remove from watchlist' : 'Add to watchlist'} onClick={(e) => change(e, 'watchlist')}>
        {status === 'watchlist' ? <FiBookmark /> : <FiPlus />} {!compact && (status === 'watchlist' ? 'In Watchlist' : 'Watchlist')}
      </button>
      <button type="button" className={`library-action ${status === 'watched' ? 'selected' : ''}`}
        aria-pressed={status === 'watched'} aria-label={status === 'watched' ? 'Unmark as watched' : 'Mark as watched'}
        title={status === 'watched' ? 'Unmark as watched' : 'Mark as watched'} onClick={(e) => change(e, 'watched')}>
        <FiCheck /> {!compact && (status === 'watched' ? 'Watched' : 'Mark Watched')}
      </button>
      {error && <span className="library-save-error" role="alert">{error}</span>}
    </div>
  )
}
