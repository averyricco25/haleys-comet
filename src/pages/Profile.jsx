import { useAuth } from '../context/AuthContext'
import { useShows } from '../context/ShowsContext'

// Estimate for shows saved before runtime tracking existed
const showMinutes = (s) => s.watchedMinutes ?? (s.watched?.length || 0) * (s.averageRuntime || 40)

export default function Profile() {
  const { user, signOut } = useAuth()
  const { shows } = useShows()

  const all = Object.values(shows)
  const tvShows = all.filter((s) => s.type !== 'movie')
  const movies = all.filter((s) => s.type === 'movie')

  const finished = tvShows.filter((s) => s.status === 'finished').length
  const watching = tvShows.filter((s) => s.status === 'watching').length
  const watchlist = all.filter((s) => s.status === 'watchlist').length
  const moviesWatched = movies.filter((s) => s.status === 'watched')
  const episodesWatched = tvShows.reduce((sum, s) => sum + (s.watched?.length || 0), 0)
  const rated = all.filter((s) => s.rating > 0)
  const avgRating = rated.length
    ? (rated.reduce((sum, s) => sum + s.rating, 0) / rated.length).toFixed(1)
    : null

  const totalMinutes =
    tvShows.reduce((sum, s) => sum + showMinutes(s), 0) +
    moviesWatched.reduce((sum, m) => sum + (m.runtime || 120), 0)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  return (
    <>
      <header className="page-header">
        <h1>Profile</h1>
      </header>
      <div className="profile-card">
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="avatar" referrerPolicy="no-referrer" />
        ) : (
          <div className="avatar avatar-empty">{(user.displayName || 'G')[0]}</div>
        )}
        <div>
          <p className="profile-name">{user.displayName || 'Guest'}</p>
          {user.email && <p className="profile-email">{user.email}</p>}
          {user.isGuest && <p className="profile-email">Data saved on this device only</p>}
        </div>
      </div>

      <div className="time-hero">
        <span className="time-hero-label">⏱️ Total time watched</span>
        <div className="time-hero-units">
          <span className="time-unit"><b>{days}</b> days</span>
          <span className="time-unit"><b>{hours}</b> hours</span>
          <span className="time-unit"><b>{minutes}</b> minutes</span>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat"><span className="stat-num">{episodesWatched}</span><span className="stat-label">Episodes watched</span></div>
        <div className="stat"><span className="stat-num">{moviesWatched.length}</span><span className="stat-label">Movies watched</span></div>
        <div className="stat"><span className="stat-num">{watching}</span><span className="stat-label">Shows watching</span></div>
        <div className="stat"><span className="stat-num">{finished}</span><span className="stat-label">Shows finished</span></div>
        <div className="stat"><span className="stat-num">{watchlist}</span><span className="stat-label">On watchlists</span></div>
        {avgRating && (
          <div className="stat"><span className="stat-num">★ {avgRating}</span><span className="stat-label">Avg rating</span></div>
        )}
      </div>
      <button className="btn btn-ghost" onClick={signOut} style={{ marginTop: '2rem', width: '100%' }}>
        Sign out
      </button>
    </>
  )
}
