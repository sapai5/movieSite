import { NavLink, useLocation } from 'react-router-dom'
import { FiHome, FiTv, FiFilm, FiSearch, FiBookmark } from 'react-icons/fi'

export default function MobileBottomNav() {
  const location = useLocation()
  // Hide on watch page to ensure unobstructed playback
  if (location.pathname.startsWith('/watch')) {
    return null
  }

  return (
    <nav className="mobile-bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <FiHome className="bottom-nav-icon" />
        <span className="bottom-nav-label">Home</span>
      </NavLink>

      <NavLink to="/tv" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <FiTv className="bottom-nav-icon" />
        <span className="bottom-nav-label">TV Shows</span>
      </NavLink>

      <NavLink to="/movies" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <FiFilm className="bottom-nav-icon" />
        <span className="bottom-nav-label">Movies</span>
      </NavLink>

      <NavLink to="/search" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <FiSearch className="bottom-nav-icon" />
        <span className="bottom-nav-label">Search</span>
      </NavLink>
      <NavLink to="/library" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <FiBookmark className="bottom-nav-icon" /><span className="bottom-nav-label">Library</span>
      </NavLink>
    </nav>
  )
}
