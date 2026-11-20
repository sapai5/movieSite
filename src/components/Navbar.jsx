import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { FiSearch, FiDownload } from 'react-icons/fi'
import { openInstallGuide, isAppStandalone } from '../services/install'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [query, setQuery] = useState('')
  const [standalone, setStandalone] = useState(() => isAppStandalone())
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const onSearchPage = pathname === '/search'

  useEffect(() => {
    setStandalone(isAppStandalone())
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // The search page has its own box, so clear this one whenever we land there
  useEffect(() => {
    if (onSearchPage) setQuery('')
  }, [onSearchPage])

  const goToSearch = (text) => {
    const q = text.trim()
    navigate(q ? '/search?q=' + encodeURIComponent(q) : '/search')
  }

  // Start searching as soon as you type: hand off to the live search page
  const handleChange = (e) => {
    const value = e.target.value
    setQuery(value)
    if (value.trim()) goToSearch(value)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    goToSearch(query)
  }

  return (
    <nav className={scrolled ? 'navbar scrolled' : 'navbar'}>
      <div className="navbar-left">
        <Link to="/" className="navbar-brand">MOVIEPLAYER</Link>
        <div className="navbar-nav-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Home
          </NavLink>
          <NavLink to="/tv" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            TV Shows
          </NavLink>
          <NavLink to="/movies" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Movies
          </NavLink>
        </div>
      </div>

      <div className="navbar-right">
        {!standalone && (
          <button type="button" className="nav-install-btn" onClick={openInstallGuide} title="Install App to Home Screen" aria-label="Install App">
            <FiDownload size={14} /> <span className="nav-install-label">Install App</span>
          </button>
        )}

        <Link to="/search" className="nav-search-icon-btn" aria-label="Search">
          <FiSearch size={20} />
        </Link>

        <form onSubmit={handleSearch} className={`nav-search ${onSearchPage ? 'is-hidden' : ''}`}>
          <FiSearch size={16} />
          <input
            type="text"
            placeholder="Movies, TV shows..."
            value={query}
            onChange={handleChange}
          />
        </form>
      </div>
    </nav>
  )
}