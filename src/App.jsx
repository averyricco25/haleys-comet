import { useLayoutEffect, useRef } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import MyShows from './pages/MyShows'
import Movies from './pages/Movies'
import Watchlist from './pages/Watchlist'
import Search from './pages/Search'
import ShowDetail from './pages/ShowDetail'
import MovieDetail from './pages/MovieDetail'
import Profile from './pages/Profile'
import Import from './pages/Import'
import Services from './pages/Services'
import BottomNav from './components/BottomNav'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="splash">
        <span className="splash-comet">☄️</span>
        <h1>Haley's Comet</h1>
      </div>
    )
  }

  if (!user) return <Login />

  return <AuthenticatedApp key={user.uid || 'local'} />
}

function AuthenticatedApp() {
  const location = useLocation()
  const discovering = location.pathname === '/search'
  const discoverLocation = useRef(null)
  const scroll = useRef(0)
  if (discovering) discoverLocation.current = location

  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => { window.history.scrollRestoration = previous }
  }, [])

  useLayoutEffect(() => {
    window.scrollTo({ top: discovering ? scroll.current : 0, behavior: 'instant' })
    if (!discovering) return
    const remember = () => { scroll.current = window.scrollY }
    window.addEventListener('scroll', remember, { passive: true })
    return () => window.removeEventListener('scroll', remember)
  }, [discovering, location.pathname])

  return (
    <div className="app">
      <main className="page">
        {/* Keep Discover's results and horizontal carousels mounted behind details.
            Its last location also preserves mode/genre while the URL is a detail route. */}
        {discoverLocation.current && (
          <div hidden={!discovering}>
            <Routes location={discoverLocation.current}>
              <Route path="/search" element={<Search />} />
            </Routes>
          </div>
        )}
        <Routes>
          <Route path="/" element={<MyShows />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/search" element={null} />
          <Route path="/show/:id" element={<ShowDetail />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/import" element={<Import />} />
          <Route path="/services" element={<Services />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
