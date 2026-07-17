import { Link } from 'react-router-dom'

export default function FavRow({ items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="rec-section">
      <h2 className="section-title">❤️ Favorites</h2>
      <div className="rec-row">
        {items.map((s) => (
          <Link
            key={s.id}
            to={s.type === 'movie' ? `/movie/${s.movieId}` : `/show/${s.id}`}
            className="rec-card"
          >
            {s.image ? (
              <img src={s.image} alt={s.name} className="rec-poster" loading="lazy" />
            ) : (
              <div className="rec-poster poster-empty">{s.type === 'movie' ? '🎬' : '📺'}</div>
            )}
            <span className="rec-name">{s.name}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
