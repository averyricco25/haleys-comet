import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useShows } from '../context/ShowsContext'
import ShowCard from '../components/ShowCard'
import FavRow from '../components/FavRow'

const TABS = [
  { key: 'watching', label: 'Watching' },
  { key: 'finished', label: 'Finished' },
]

export default function MyShows() {
  const { shows, loaded } = useShows()
  const [tab, setTab] = useState('watching')

  const list = Object.values(shows)
    .filter((s) => s.type !== 'movie' && s.status === tab)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))

  const favorites = Object.values(shows)
    .filter((s) => s.type !== 'movie' && s.favorite)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))

  return (
    <>
      <header className="page-header">
        <h1>My Shows</h1>
      </header>
      <FavRow items={favorites} />
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {loaded && list.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">🛸</span>
          <p>{tab === 'watching' ? "You're not watching anything yet." : 'Nothing finished yet.'}</p>
          <Link to="/search" className="btn btn-primary">Find a show</Link>
        </div>
      ) : (
        <div className="show-grid">
          {list.map((s) => (
            <ShowCard
              key={s.id}
              show={s}
              progress={s.totalEpisodes ? (s.watched?.length || 0) / s.totalEpisodes : 0}
            />
          ))}
        </div>
      )}
    </>
  )
}
