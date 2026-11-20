import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { FiSearch, FiDownload } from 'react-icons/fi'
import { openInstallGuide, isAppStandalone } from '../services/install'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [query, setQuery] = useState('')
  const [standalone, setStandalone] = useState(() => isAppStandalone())
  const navigate = useNavigate()

  useEffect(() => {
    setStandalone(isAppStandalone())
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate('/search?q=' + encodeURIComponent(query.trim()))
    }
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
          <button type="button" className="nav-install-btn" onClick={openInstallGuide} title="Install App to Home Screen">
            <FiDownload size={14} /> Install App
          </button>
        )}

        <form onSubmit={handleSearch} className="nav-search">
          <FiSearch size={16} />
          <input
            type="text"
            placeholder="Movies, TV shows..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
      </div>
    </nav>
  )
}