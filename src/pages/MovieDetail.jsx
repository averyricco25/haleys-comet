import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { lookupMovie, posterUrl, watchProviders } from '../lib/tmdb'
import { useShows } from '../context/ShowsContext'
import RatingStars from '../components/RatingStars'
import NoteBox from '../components/NoteBox'
import StreamingBar from '../components/StreamingBar'

const formatRuntime = (min) => (min ? `${Math.floor(min / 60)}h ${min % 60}m` : null)

export default function MovieDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { shows, saveShow, removeShow } = useShows()
  const [movie, setMovie] = useState(null)
  const [error, setError] = useState(null)
  const [expandSummary, setExpandSummary] = useState(false)

  const docId = `movie-${id}`
  const saved = shows[docId]

  useEffect(() => {
    let cancelled = false
    lookupMovie(id)
      .then((data) => !cancelled && setMovie(data))
      .catch(() => !cancelled && setError("Couldn't load this movie. Check your connection."))
    return () => {
      cancelled = true
    }
  }, [id])

  if (error) return <p className="error center">{error}</p>
  if (!movie) return <p className="muted center" style={{ marginTop: '4rem' }}>Loading…</p>

  const baseDoc = () => ({
    id: docId,
    movieId: movie.id,
    type: 'movie',
    name: movie.title,
    image: posterUrl(movie.poster_path),
    year: movie.release_date ? movie.release_date.slice(0, 4) : null,
    genre: movie.genres?.[0]?.name || null,
    runtime: movie.runtime || null,
    rating: saved?.rating || 0,
    notes: saved?.notes || '',
    favorite: saved?.favorite || false,
    status: saved?.status || null,
  })

  const setStatus = (status) => {
    if (saved?.status === status) {
      if (
        !(saved.rating > 0) ||
        window.confirm(`Remove “${movie.title}” from your library? Your rating will be deleted.`)
      ) {
        removeShow(docId)
      }
    } else {
      saveShow({ ...baseDoc(), status })
    }
  }

  const setRating = (rating) => {
    saveShow({ ...baseDoc(), status: saved?.status || 'watched', rating })
  }

  const saveNote = (notes) => {
    saveShow({ ...baseDoc(), status: saved?.status || 'watched', notes })
  }

  const toggleFavorite = () => {
    saveShow({ ...baseDoc(), status: saved?.status || 'watched', favorite: !saved?.favorite })
  }

  return (
    <div className="detail">
      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
      <div className="detail-hero">
        {movie.poster_path ? (
          <img src={posterUrl(movie.poster_path)} alt={movie.title} className="detail-poster" />
        ) : (
          <div className="detail-poster poster-empty">🎬</div>
        )}
        <div className="detail-head">
          <div className="title-row">
            <h1>{movie.title}</h1>
            <button
              className={`fav-pill${saved?.favorite ? ' active' : ''}`}
              onClick={toggleFavorite}
            >
              {saved?.favorite ? '★ Favorited' : '☆ Favorite'}
            </button>
          </div>
          <p className="detail-meta">
            {[movie.release_date?.slice(0, 4), movie.genres?.map((g) => g.name).slice(0, 2).join(', ')]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {movie.runtime > 0 && <p className="detail-meta">{formatRuntime(movie.runtime)}</p>}
        </div>
      </div>

      <StreamingBar load={() => watchProviders('movie', movie.id)} loadKey={movie.id} />

      <div className="status-row">
        <button className={`btn btn-status${saved?.status === 'watchlist' ? ' active' : ''}`} onClick={() => setStatus('watchlist')}>
          🌠 Want to Watch
        </button>
        <button className={`btn btn-status${saved?.status === 'watched' ? ' active' : ''}`} onClick={() => setStatus('watched')}>
          ✅ Watched
        </button>
      </div>

      <div className="rate-block">
        <span className="rate-label">Your rating</span>
        <RatingStars rating={saved?.rating || 0} onRate={setRating} size="lg" />
      </div>

      {movie.overview && (
        <p className={`detail-summary${expandSummary ? ' expanded' : ''}`} onClick={() => setExpandSummary(!expandSummary)}>
          {movie.overview}
        </p>
      )}

      <NoteBox value={saved?.notes} onSave={saveNote} />
    </div>
  )
}
