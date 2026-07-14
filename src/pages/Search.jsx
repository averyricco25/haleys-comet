import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { searchShows, singleSearchShow, stripHtml } from '../lib/tvmaze'
import { searchMovies, posterUrl, isTmdbConfigured } from '../lib/tmdb'
import { getRecommendations } from '../lib/recommend'
import { useShows } from '../context/ShowsContext'

function RecRow({ title, items, onOpen }) {
  if (!items || items.length === 0) return null
  return (
    <div className="rec-section">
      <h2 className="section-title">{title}</h2>
      <div className="rec-row">
        {items.map((r) => (
          <button key={r.id} className="rec-card" onClick={() => onOpen(r)}>
            {r.image ? (
              <img src={r.image} alt={r.name} className="rec-poster" loading="lazy" />
            ) : (
              <div className="rec-poster poster-empty">📺</div>
            )}
            <span className="rec-name">{r.name}</span>
            {r.year && <span className="rec-year">{r.year}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Search() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { shows, loaded } = useShows()
  const [recs, setRecs] = useState(null)
  const [resolving, setResolving] = useState(false)
  const mode = params.get('mode') === 'movies' ? 'movies' : 'shows'
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)
  const debounce = useRef(null)

  useEffect(() => {
    if (loaded && isTmdbConfigured) {
      getRecommendations(shows).then(setRecs).catch(() => {})
    }
  }, [loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  const openRecShow = async (rec) => {
    setResolving(true)
    try {
      const show = await singleSearchShow(rec.name)
      navigate(`/show/${show.id}`)
    } catch {
      setError(`Couldn't find "${rec.name}" in the shows database.`)
    } finally {
      setResolving(false)
    }
  }

  const runSearch = async (q, m) => {
    if (!q.trim()) {
      setResults(null)
      return
    }
    setSearching(true)
    setError(null)
    try {
      if (m === 'movies') {
        const data = await searchMovies(q)
        setResults(
          data.map((mv) => ({
            key: `movie-${mv.id}`,
            to: `/movie/${mv.id}`,
            image: posterUrl(mv.poster_path, 'w154'),
            name: mv.title,
            meta: mv.release_date ? mv.release_date.slice(0, 4) : '',
            summary: (mv.overview || '').slice(0, 120),
            emptyIcon: '🎬',
          }))
        )
      } else {
        const data = await searchShows(q)
        setResults(
          data.map(({ show }) => ({
            key: `show-${show.id}`,
            to: `/show/${show.id}`,
            image: show.image?.medium,
            name: show.name,
            meta: [show.premiered?.slice(0, 4), show.network?.name || show.webChannel?.name, show.status]
              .filter(Boolean)
              .join(' · '),
            summary: stripHtml(show.summary).slice(0, 120),
            emptyIcon: '📺',
          }))
        )
      }
    } catch {
      setError("Couldn't reach the search service. Check your connection and try again.")
    } finally {
      setSearching(false)
    }
  }

  const onChange = (e) => {
    const q = e.target.value
    setQuery(q)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => runSearch(q, mode), 400)
  }

  const switchMode = (m) => {
    setParams(m === 'movies' ? { mode: 'movies' } : {}, { replace: true })
    clearTimeout(debounce.current)
    runSearch(query, m)
  }

  return (
    <>
      <header className="page-header">
        <h1>Discover</h1>
      </header>
      <div className="tabs">
        <button className={`tab${mode === 'shows' ? ' active' : ''}`} onClick={() => switchMode('shows')}>
          📺 Shows
        </button>
        <button className={`tab${mode === 'movies' ? ' active' : ''}`} onClick={() => switchMode('movies')}>
          🎬 Movies
        </button>
      </div>
      {mode === 'movies' && !isTmdbConfigured && (
        <div className="empty">
          <span className="empty-icon">🎬</span>
          <p>
            Movie search needs a free TMDB API key — see the "Movies" section in SETUP.md.
            Show search works without it.
          </p>
        </div>
      )}
      <div className="search-bar" style={mode === 'movies' && !isTmdbConfigured ? { display: 'none' } : undefined}>
        <span className="search-icon">🔭</span>
        <input
          type="search"
          placeholder={mode === 'movies' ? 'Search for a movie…' : 'Search for a show…'}
          value={query}
          onChange={onChange}
          autoFocus
        />
      </div>
      {error && <p className="error">{error}</p>}
      {searching && <p className="muted center">Searching…</p>}
      {results && !searching && results.length === 0 && (
        <p className="muted center">Nothing found for “{query}”.</p>
      )}
      <ul className="result-list">
        {(results || []).map((r) => (
          <li key={r.key}>
            <Link to={r.to} className="result-row">
              {r.image ? (
                <img src={r.image} alt="" className="result-poster" loading="lazy" />
              ) : (
                <div className="result-poster poster-empty">{r.emptyIcon}</div>
              )}
              <div className="result-info">
                <span className="result-name">{r.name}</span>
                <span className="result-meta">{r.meta}</span>
                <span className="result-summary">{r.summary}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {!results && !searching && (
        <>
          {resolving && <p className="muted center">Opening…</p>}
          {mode === 'shows' ? (
            <RecRow title="✨ Shows for you" items={recs?.shows} onOpen={openRecShow} />
          ) : (
            <RecRow title="✨ Movies for you" items={recs?.movies} onOpen={(r) => navigate(`/movie/${r.id}`)} />
          )}
          {(!recs || (mode === 'shows' ? recs.shows : recs.movies)?.length === 0) && (
            <div className="empty">
              <span className="empty-icon">🔭</span>
              <p>
                {mode === 'movies'
                  ? 'Search any movie to rate it and add it to your lists.'
                  : 'Search any TV show to see seasons, episodes, and add it to your lists.'}
              </p>
            </div>
          )}
        </>
      )}
      <p className="attribution">
        {mode === 'movies'
          ? 'Movie data from TMDB. This app uses the TMDB API but is not endorsed or certified by TMDB.'
          : 'Show data from TVMaze.'}
      </p>
    </>
  )
}
