import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Routes, Route, useLocation, useNavigationType, useNavigate, matchPath } from 'react-router-dom'
import Navbar from './components/Navbar'
import MobileBottomNav from './components/MobileBottomNav'
import IOSInstallPrompt from './components/IOSInstallPrompt'
import InstallModal from './components/InstallModal'
import Home from './pages/Home'
import Movies from './pages/Movies'
import TVShows from './pages/TVShows'
import Search from './pages/Search'
import Watch from './pages/Watch'
import Library from './pages/Library'

function watchRoute(pathname) {
  return ['/watch/:type/:id/:season/:episode', '/watch/:type/:id', '/watch/:id']
    .map((path) => matchPath(path, pathname)).find(Boolean)
}

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
  const navigate = useNavigate()
  const route = watchRoute(location.pathname)
  const isWatchPage = !!route
  const [activeWatch, setActiveWatch] = useState(() => route ? { path: location.pathname, params: route.params } : null)
  const lastBrowse = useRef('/')
  useLayoutEffect(() => {
    const next = watchRoute(location.pathname)
    if (next) setActiveWatch({ path: location.pathname, params: next.params })
    else lastBrowse.current = location.pathname + location.search
  }, [location.pathname, location.search])
  const closePlayer = () => {
    setActiveWatch(null)
    if (isWatchPage) navigate(lastBrowse.current)
  }

  return (
    <div className={`app${activeWatch && !isWatchPage ? ' has-corner-player' : ''}`}>
      <ScrollToTop />
      {!isWatchPage && <Navbar />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tv" element={<TVShows />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/search" element={<Search />} />
        <Route path="/library" element={<Library />} />
        <Route path="/watch/*" element={null} />
      </Routes>

      {activeWatch && <Watch params={activeWatch.params} docked={!isWatchPage}
        onExpand={() => navigate(activeWatch.path)} onClose={closePlayer} />}

      {/* iOS & Mobile Bottom Navigation Bar */}
      <MobileBottomNav />

      {/* PWA Add to Home Screen Banner & Interactive Modal */}
      <IOSInstallPrompt />
      <InstallModal />
    </div>
  )
}

export default App
