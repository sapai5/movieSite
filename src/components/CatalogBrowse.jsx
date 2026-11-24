import { useEffect, useMemo, useState } from 'react'
import Hero from './Hero'
import MovieRow from './MovieRow'
import MovieModal from './MovieModal'
import ContinueWatchingRow from './ContinueWatchingRow'
import Top10Row from './Top10Row'
import InternationalRow from './InternationalRow'
import LazyShelf, { LazySection, loadShelf } from './LazyShelf'
import { homeShelves, movieShelves, tvShelves, streamingShelves, defaultRegion, REGIONS } from '../services/catalog'
import { fetchPersonalizedContent } from '../services/recommendations'

function PersonalizedRow({ onSelect }) {
  const [content, setContent] = useState(null)
  useEffect(() => {
    let request = 0
    const load = () => {
      const id = ++request
      fetchPersonalizedContent().then((data) => { if (id === request) setContent(data) })
    }
    load()
    window.addEventListener('movieplayer_taste_updated', load)
    return () => { request++; window.removeEventListener('movieplayer_taste_updated', load) }
  }, [])
  return content && <MovieRow title={content.title} movies={content.movies} onSelect={onSelect} />
}

export default function CatalogBrowse({ type = 'all' }) {
  const shelves = type === 'movie' ? movieShelves : type === 'tv' ? tvShelves : homeShelves
  const [hero, setHero] = useState(null)
  const [heroError, setHeroError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [selected, setSelected] = useState(null)
  const [region, setRegion] = useState(defaultRegion)
  const services = useMemo(() => streamingShelves(type, region), [type, region])
  useEffect(() => {
    let cancelled = false
    setHeroError(false)
    const first = shelves[0]
    loadShelf(first.id, first.load).then((items) => {
      if (!cancelled) { setHero(items[Math.floor(Math.random() * Math.min(5, items.length))] || null); setHeroError(!items.length) }
    }).catch(() => { if (!cancelled) setHeroError(true) })
    return () => { cancelled = true }
  }, [shelves, attempt])
  return <>
    {hero ? <Hero movie={hero} onInfo={setSelected} /> : <div className="catalog-hero-placeholder">
      {heroError ? <><h1>Find your next favorite.</h1><p>Couldn't load the featured titles.</p><button className="filter-btn" onClick={() => setAttempt((value) => value + 1)}>Try again</button></> : <div className="spinner" aria-label="Loading featured titles" />}
    </div>}
    {type === 'all' && <><ContinueWatchingRow onInfo={setSelected} />
      <LazySection title="Recommended For You"><PersonalizedRow onSelect={setSelected} /></LazySection>
      <LazySection title="Top 10 Worldwide Today"><Top10Row onSelect={setSelected} /></LazySection>
      <LazySection title="Popular Around the World"><InternationalRow onSelect={setSelected} /></LazySection></>}
    {shelves.slice(0, 2).map((shelf) => <LazyShelf key={shelf.id} shelf={shelf} onSelect={setSelected} />)}
    <section className="streaming-section" aria-label="Browse by streaming service">
      <div className="streaming-heading"><div><span className="library-eyebrow">FIND YOUR FAVORITES</span><h2>Browse by streaming service</h2><p>Subscription catalogs in your region, listed by TMDB.</p></div>
        <label>Region<select aria-label="Region" value={region} onChange={(event) => {
          setRegion(event.target.value)
          try { localStorage.setItem('movieplayer_streaming_region', event.target.value) } catch { /* session-only preference */ }
        }}>{REGIONS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      </div>
      {services.map((shelf) => <LazyShelf key={shelf.id} shelf={shelf} onSelect={setSelected} />)}
    </section>
    {shelves.slice(2).map((shelf) => <LazyShelf key={shelf.id} shelf={shelf} onSelect={setSelected} />)}
    <div className="footer">Powered by TMDB &amp; VidRift &bull; Your next great watch</div>
    {selected && <MovieModal movie={selected} onClose={() => setSelected(null)} />}
  </>
}
