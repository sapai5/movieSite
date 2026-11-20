import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import MobileBottomNav from './components/MobileBottomNav'
import IOSInstallPrompt from './components/IOSInstallPrompt'
import InstallModal from './components/InstallModal'
import AccessGate from './components/AccessGate'
import Home from './pages/Home'
import Movies from './pages/Movies'
import TVShows from './pages/TVShows'
import Search from './pages/Search'
import Watch from './pages/Watch'
import Admin from './pages/Admin'

function App() {
  const location = useLocation()
  const isWatchPage = location.pathname.startsWith('/watch')
  const isAdminPage = location.pathname.startsWith('/admin')
  const showNavbar = !isWatchPage && !isAdminPage

  return (
    <div className="app">
      {showNavbar && <Navbar />}

      <Routes>
        {/* Admin Dashboard: not blocked by the user gate */}
        <Route path="/admin" element={<Admin />} />

        {/* Protected Streaming Routes */}
        <Route
          path="/"
          element={
            <AccessGate>
              <Home />
            </AccessGate>
          }
        />
        <Route
          path="/tv"
          element={
            <AccessGate>
              <TVShows />
            </AccessGate>
          }
        />
        <Route
          path="/movies"
          element={
            <AccessGate>
              <Movies />
            </AccessGate>
          }
        />
        <Route
          path="/search"
          element={
            <AccessGate>
              <Search />
            </AccessGate>
          }
        />
        <Route
          path="/watch/:type/:id/:season/:episode"
          element={
            <AccessGate>
              <Watch />
            </AccessGate>
          }
        />
        <Route
          path="/watch/:type/:id"
          element={
            <AccessGate>
              <Watch />
            </AccessGate>
          }
        />
        <Route
          path="/watch/:id"
          element={
            <AccessGate>
              <Watch />
            </AccessGate>
          }
        />
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
