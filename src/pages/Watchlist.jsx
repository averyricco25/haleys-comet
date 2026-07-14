import { Link } from 'react-router-dom'
import { useShows } from '../context/ShowsContext'
import ShowCard from '../components/ShowCard'

export default function Watchlist() {
  const { shows, loaded } = useShows()
  const list = Object.values(shows)
    .filter((s) => s.type !== 'movie' && s.status === 'watchlist')
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))

  return (
    <>
      <header className="page-header">
        <h1>Watchlist</h1>
        <p className="page-sub">Shows you want to watch</p>
      </header>
      {loaded && list.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">🌠</span>
          <p>Your watchlist is empty. Add shows you want to watch later.</p>
          <Link to="/search" className="btn btn-primary">Find a show</Link>
        </div>
      ) : (
        <div className="show-grid">
          {list.map((s) => (
            <ShowCard key={s.id} show={s} />
          ))}
        </div>
      )}
    </>
  )
}
