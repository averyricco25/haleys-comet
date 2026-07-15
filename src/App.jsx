import { Routes, Route, Navigate } from 'react-router-dom'
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

  return (
    <div className="app">
      <main className="page">
        <Routes>
          <Route path="/" element={<MyShows />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/search" element={<Search />} />
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
