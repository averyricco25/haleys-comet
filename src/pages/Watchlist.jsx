import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useShows } from '../context/ShowsContext'
import ShowCard from '../components/ShowCard'

const TABS = [
  { key: 'shows', label: '📺 Shows' },
  { key: 'movies', label: '🎬 Movies' },
]

export default function Watchlist() {
  const { shows, loaded } = useShows()
  const [tab, setTab] = useState('shows')

  const list = Object.values(shows)
    .filter((s) => (tab === 'movies' ? s.type === 'movie' : s.type !== 'movie'))
    .filter((s) => s.status === 'watchlist')
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))

  return (
    <>
      <header className="page-header">
        <h1>Watchlist</h1>
        <p className="page-sub">What you want to watch next</p>
      </header>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {loaded && list.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">🌠</span>
          <p>{tab === 'movies' ? 'No movies on your watchlist yet.' : 'No shows on your watchlist yet.'}</p>
          <Link to={tab === 'movies' ? '/search?mode=movies' : '/search'} className="btn btn-primary">
            {tab === 'movies' ? 'Find a movie' : 'Find a show'}
          </Link>
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
