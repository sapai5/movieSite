import { useEffect, useRef, useState } from 'react'
import MovieRow from './MovieRow'

const cache = new Map()
export function loadShelf(key, loader) {
  if (!cache.has(key)) {
    const request = Promise.resolve().then(loader).catch((error) => { cache.delete(key); throw error })
    cache.set(key, request)
  }
  return cache.get(key)
}

// Reserve a poster row until it approaches the viewport, then mount/fetch once.
export function LazySection({ title, children }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setVisible(true); return }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { rootMargin: '300px 0px' })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return <section ref={ref} className="lazy-section" aria-label={title}>
    {visible ? children : <ShelfPlaceholder title={title} />}
  </section>
}

function ShelfPlaceholder({ title }) {
  return <div className="movie-row shelf-placeholder"><div className="row-header"><h2 className="row-title">{title}</h2></div>
    <div className="shelf-skeletons" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <div key={i} />)}</div></div>
}

function ShelfContent({ shelf, onSelect }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    setError(false)
    loadShelf(shelf.id, shelf.load).then((movies) => { if (!cancelled) setItems(movies) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [shelf, attempt])
  if (error) return <div className="movie-row shelf-message"><h2 className="row-title">{shelf.title}</h2><p>Couldn't load these titles.</p>
    <button className="filter-btn" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div>
  if (!items) return <ShelfPlaceholder title={shelf.title} />
  if (!items.length) return <div className="movie-row shelf-message"><h2 className="row-title">{shelf.title}</h2><p>No titles available in this region right now.</p></div>
  return <MovieRow title={shelf.title} movies={items} onSelect={onSelect} />
}

export default function LazyShelf({ shelf, onSelect }) {
  return <LazySection title={shelf.title}><ShelfContent shelf={shelf} onSelect={onSelect} /></LazySection>
}
