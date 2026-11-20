import { useEffect } from 'react'
import { Routes, Route, useLocation, useNavigationType } from 'react-router-dom'
import Navbar from './components/Navbar'
import MobileBottomNav from './components/MobileBottomNav'
import IOSInstallPrompt from './components/IOSInstallPrompt'
import InstallModal from './components/InstallModal'
import Home from './pages/Home'
import Movies from './pages/Movies'
import TVShows from './pages/TVShows'
import Search from './pages/Search'
import Watch from './pages/Watch'

// BrowserRouter keeps the old scroll position between pages. Start new pages at
// the top, but leave back/forward (POP) alone so the browser can restore it.
function ScrollToTop() {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  useEffect(() => {
    // 'instant' overrides the global smooth scrolling so pages don't visibly scroll up
    if (navType !== 'POP') window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, navType])
  return null
}

function App() {
  const location = useLocation()
  const isWatchPage = location.pathname.startsWith('/watch')

  return (
    <div className="app">
      <ScrollToTop />
      {!isWatchPage && <Navbar />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tv" element={<TVShows />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/search" element={<Search />} />
        <Route path="/watch/:type/:id/:season/:episode" element={<Watch />} />
        <Route path="/watch/:type/:id" element={<Watch />} />
        <Route path="/watch/:id" element={<Watch />} />
      </Routes>

      {/* iOS & Mobile Bottom Navigation Bar */}
      <MobileBottomNav />

      {/* PWA Add to Home Screen Banner & Interactive Modal */}
      <IOSInstallPrompt />
      <InstallModal />
    </div>
  )
}

export default App
