import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import MobileBottomNav from './components/MobileBottomNav'
import IOSInstallPrompt from './components/IOSInstallPrompt'
import InstallModal from './components/InstallModal'
import Home from './pages/Home'
import Movies from './pages/Movies'
import TVShows from './pages/TVShows'
import Search from './pages/Search'
import Watch from './pages/Watch'

function App() {
  const location = useLocation()
  const isWatchPage = location.pathname.startsWith('/watch')

  return (
    <div className="app">
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
