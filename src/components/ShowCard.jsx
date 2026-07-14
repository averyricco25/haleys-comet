import { Link } from 'react-router-dom'
import RatingStars from './RatingStars'

export default function ShowCard({ show, progress }) {
  const pct = progress != null ? Math.round(progress * 100) : null
  const to = show.type === 'movie' ? `/movie/${show.movieId}` : `/show/${show.id}`
  return (
    <Link to={to} className="show-card">
      <div className="poster-wrap">
        {show.image ? (
          <img src={show.image} alt={show.name} className="poster" loading="lazy" />
        ) : (
          <div className="poster poster-empty">📺</div>
        )}
        {pct != null && (
          <div className="poster-progress">
            <div className="poster-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <div className="show-card-info">
        <span className="show-card-name">{show.name}</span>
        {show.rating > 0 && <RatingStars rating={show.rating} size="sm" />}
        {pct != null && <span className="show-card-pct">{pct}% watched</span>}
      </div>
    </Link>
  )
}
