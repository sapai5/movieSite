import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  FiPlay, FiChevronLeft, FiChevronRight, FiMoreVertical,
  FiInfo, FiRotateCcw, FiCheckCircle, FiTrash2,
} from 'react-icons/fi'
import {
  getContinueWatchingList, removePlaybackPosition, dismissFromContinueWatching,
  markAsWatched, formatRemaining, formatTime,
} from '../services/progress'
import { getBackdropUrl, getImageUrl } from '../services/tmdb'

const MENU_WIDTH = 280

function ItemMenu({ item, anchorRect, onClose, onAction }) {
  const menuRef = useRef(null)
  const isTV = item.type === 'tv'

  useEffect(() => {
    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onClose)
    window.addEventListener('scroll', onClose, true)
    menuRef.current?.querySelector('.cw-menu-item')?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  // Desktop: pop up next to the button. Phones: CSS turns it into a bottom sheet.
  const openUp = anchorRect.bottom + 220 > window.innerHeight
  const left = Math.min(
    Math.max(8, anchorRect.right - MENU_WIDTH),
    window.innerWidth - MENU_WIDTH - 8
  )
  const style = openUp
    ? { left, bottom: Math.max(8, window.innerHeight - anchorRect.top + 6) }
    : { left, top: Math.max(8, anchorRect.bottom + 6) }

  return createPortal(
    <>
      <div className="cw-menu-backdrop" aria-hidden="true" />
      <div className="cw-menu" style={style} ref={menuRef} role="menu" aria-label={`Options for ${item.title}`}>
        <div className="cw-menu-header">
          <div className="cw-menu-title">{item.title}</div>
          {isTV && <div className="cw-menu-sub">Season {item.season}, Episode {item.episode}</div>}
        </div>
        <button role="menuitem" className="cw-menu-item" onClick={() => onAction('info')}>
          <FiInfo /> More Info
        </button>
        <button role="menuitem" className="cw-menu-item" onClick={() => onAction('restart')}>
          <FiRotateCcw /> {isTV ? 'Play Episode from Beginning' : 'Play from Beginning'}
        </button>
        <button role="menuitem" className="cw-menu-item" onClick={() => onAction('watched')}>
          <FiCheckCircle /> Mark as Watched
        </button>
        <button role="menuitem" className="cw-menu-item danger" onClick={() => onAction('remove')}>
          <FiTrash2 /> Remove from Continue Watching
        </button>
        <button className="cw-menu-cancel" onClick={onClose}>Cancel</button>
      </div>
    </>,
    document.body
  )
}

export default function ContinueWatchingRow({ onInfo }) {
  const [items, setItems] = useState([])
  const [menu, setMenu] = useState(null) // { item, anchorRect }
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

  const openMenu = (e, item) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenu((current) => (current?.item === item ? null : { item, anchorRect: rect }))
  }

  const closeMenu = useCallback(() => setMenu(null), [])

  const handleMenuAction = (action) => {
    const item = menu?.item
    setMenu(null)
    if (!item) return
    if (action === 'info') {
      onInfo?.({
        id: Number(item.id),
        media_type: item.type,
        title: item.type === 'movie' ? item.title : undefined,
        name: item.type === 'tv' ? item.title : undefined,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
      })
    } else if (action === 'restart') {
      removePlaybackPosition(item.id, item.type, item.season, item.episode)
      handleResume(item)
    } else if (action === 'watched') {
      markAsWatched(item.id, item.type, item.season, item.episode)
      loadItems()
    } else if (action === 'remove') {
      dismissFromContinueWatching(item.id, item.type)
      loadItems()
    }
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
                  <div className="continue-card-text">
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
                  <button
                    type="button"
                    className={`continue-more-btn ${menu?.item === item ? 'open' : ''}`}
                    onClick={(e) => openMenu(e, item)}
                    aria-label={`More options for ${item.title}`}
                    aria-haspopup="menu"
                    aria-expanded={menu?.item === item}
                  >
                    <FiMoreVertical />
                  </button>
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

      {menu && (
        <ItemMenu
          item={menu.item}
          anchorRect={menu.anchorRect}
          onClose={closeMenu}
          onAction={handleMenuAction}
        />
      )}
    </div>
  )
}