import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useShows } from '../context/ShowsContext'
import ShowCard from '../components/ShowCard'

const TABS = [
  { key: 'watchlist', label: 'Want to Watch' },
  { key: 'watched', label: 'Watched' },
  { key: 'favorites', label: '⭐ Favorites' },
]

export default function Movies() {
  const { shows, loaded } = useShows()
  const [tab, setTab] = useState('watchlist')

  const list = Object.values(shows)
    .filter((s) => s.type === 'movie')
    .filter((s) => (tab === 'favorites' ? s.favorite : s.status === tab))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))

  return (
    <>
      <header className="page-header">
        <h1>Movies</h1>
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
          <span className="empty-icon">🎬</span>
          <p>
            {tab === 'watchlist' && 'No movies on your list yet.'}
            {tab === 'watched' && 'No movies watched yet.'}
            {tab === 'favorites' && 'No favorites yet — tap ☆ Favorite on any movie to add one.'}
          </p>
          <Link to="/search?mode=movies" className="btn btn-primary">Find a movie</Link>
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
