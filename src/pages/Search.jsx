import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { searchShows, singleSearchShow, stripHtml } from '../lib/tvmaze'
import {
  searchMovies,
  posterUrl,
  isTmdbConfigured,
  trending,
  nowPlayingMovies,
  discoverMedia,
} from '../lib/tmdb'
import { getRecommendations } from '../lib/recommend'
import { useShows } from '../context/ShowsContext'
import { useAuth } from '../context/AuthContext'
import { loadPrefs } from '../lib/storage'
import { SERVICES } from '../lib/services'
import RecRow from '../components/RecRow'

const mapTmdbItem = (r) => ({
  id: r.id,
  name: r.title || r.name,
  image: posterUrl(r.poster_path, 'w185'),
  year: (r.release_date || r.first_air_date || '').slice(0, 4),
})

// Genre chips: TMDB's standard genre taxonomy, plus True Crime (Crime AND Documentary)
const GENRE_CHIPS = {
  shows: [
    { key: 'truecrime', emoji: '🔎', name: 'True Crime', genres: '80,99' },
    { key: 'crime', emoji: '🕵️', name: 'Crime', genres: '80' },
    { key: 'drama', emoji: '🎭', name: 'Drama', genres: '18' },
    { key: 'comedy', emoji: '😂', name: 'Comedy', genres: '35' },
    { key: 'mystery', emoji: '❓', name: 'Mystery', genres: '9648' },
    { key: 'reality', emoji: '📸', name: 'Reality', genres: '10764' },
    { key: 'scifi', emoji: '🚀', name: 'Sci-Fi & Fantasy', genres: '10765' },
    { key: 'action', emoji: '🗺️', name: 'Action & Adventure', genres: '10759' },
    { key: 'animation', emoji: '✏️', name: 'Animation', genres: '16' },
    { key: 'documentary', emoji: '🎥', name: 'Documentary', genres: '99' },
    { key: 'family', emoji: '👨‍👩‍👧', name: 'Family', genres: '10751' },
    { key: 'western', emoji: '🤠', name: 'Western', genres: '37' },
  ],
  movies: [
    { key: 'truecrime', emoji: '🔎', name: 'True Crime', genres: '80,99' },
    { key: 'horror', emoji: '👻', name: 'Horror', genres: '27' },
    { key: 'thriller', emoji: '🔪', name: 'Thriller', genres: '53' },
    { key: 'comedy', emoji: '😂', name: 'Comedy', genres: '35' },
    { key: 'action', emoji: '💥', name: 'Action', genres: '28' },
    { key: 'romance', emoji: '💘', name: 'Romance', genres: '10749' },
    { key: 'drama', emoji: '🎭', name: 'Drama', genres: '18' },
    { key: 'mystery', emoji: '❓', name: 'Mystery', genres: '9648' },
    { key: 'scifi', emoji: '🚀', name: 'Science Fiction', genres: '878' },
    { key: 'fantasy', emoji: '🐉', name: 'Fantasy', genres: '14' },
    { key: 'animation', emoji: '✏️', name: 'Animation', genres: '16' },
    { key: 'documentary', emoji: '🎥', name: 'Documentary', genres: '99' },
    { key: 'family', emoji: '👨‍👩‍👧', name: 'Family', genres: '10751' },
    { key: 'history', emoji: '🏛️', name: 'History', genres: '36' },
    { key: 'western', emoji: '🤠', name: 'Western', genres: '37' },
  ],
}

// Default (no genre selected) feed uses a sampler of these
const SAMPLER_KEYS = {
  shows: ['comedy', 'drama', 'crime', 'scifi', 'reality'],
  movies: ['comedy', 'horror', 'action', 'romance', 'thriller'],
}

const feedCache = new Map()

async function loadFeed(mode, providers, chip) {
  const key = `${mode}|${(providers || []).join(',')}|${chip?.key || 'all'}`
  if (feedCache.has(key)) return feedCache.get(key)
  const mediaType = mode === 'movies' ? 'movie' : 'tv'
  const svc = providers?.length ? ' on your services' : ''
  const jobs = []

  if (chip) {
    // Genre-tailored feed
    const dateSort = mediaType === 'movie' ? 'primary_release_date.desc' : 'first_air_date.desc'
    jobs.push([`⭐ Popular ${chip.name}`, discoverMedia(mediaType, { genres: chip.genres })])
    jobs.push([`🆕 New ${chip.name}`, discoverMedia(mediaType, { genres: chip.genres, sortBy: dateSort, minVotes: 20 })])
    jobs.push([`🏆 Top rated ${chip.name}`, discoverMedia(mediaType, { genres: chip.genres, sortBy: 'vote_average.desc', minVotes: 200 })])
    for (const svcId of providers || []) {
      const service = SERVICES.find((s) => s.id === svcId)
      if (service) {
        jobs.push([`${service.icon} ${chip.name} on ${service.name}`, discoverMedia(mediaType, { genres: chip.genres, providers: [svcId] })])
      }
    }
  } else {
    jobs.push([`🔥 Trending ${mode === 'movies' ? 'movies' : 'shows'} this week`, trending(mediaType)])
    if (mode === 'movies') jobs.push(['🎬 New in theaters', nowPlayingMovies()])
    jobs.push([`⭐ Popular${svc}`, discoverMedia(mediaType, { providers })])
    for (const svcId of providers || []) {
      const service = SERVICES.find((s) => s.id === svcId)
      if (service) {
        jobs.push([`${service.icon} Streaming on ${service.name}`, discoverMedia(mediaType, { providers: [svcId] })])
      }
    }
    for (const k of SAMPLER_KEYS[mode]) {
      const g = GENRE_CHIPS[mode].find((c) => c.key === k)
      jobs.push([`${g.emoji} ${g.name}${svc}`, discoverMedia(mediaType, { genres: g.genres, providers })])
    }
  }

  const settled = await Promise.allSettled(jobs.map((j) => j[1]))
  const rows = settled
    .map((s, i) => ({
      title: jobs[i][0],
      items: s.status === 'fulfilled' ? s.value.slice(0, 12).map(mapTmdbItem) : [],
    }))
    .filter((r) => r.items.length > 0)
  feedCache.set(key, rows)
  return rows
}

export default function Search() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { shows, loaded } = useShows()
  const mode = params.get('mode') === 'movies' ? 'movies' : 'shows'
  const genreKey = params.get('genre')
  const chip = GENRE_CHIPS[mode].find((c) => c.key === genreKey) || null
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)
  const [recs, setRecs] = useState(null)
  const [feed, setFeed] = useState(null)
  const [services, setServices] = useState(null)
  const [resolving, setResolving] = useState(false)
  const debounce = useRef(null)

  useEffect(() => {
    if (!isTmdbConfigured) return
    loadPrefs(user).then((p) => setServices(p.services || []))
  }, [user])

  useEffect(() => {
    if (loaded && isTmdbConfigured) {
      getRecommendations(shows).then(setRecs).catch(() => {})
    }
  }, [loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isTmdbConfigured || services === null) return
    setFeed(null)
    loadFeed(mode, services, chip).then(setFeed).catch(() => setFeed([]))
  }, [mode, services, genreKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const pickGenre = (key) => {
    const next = {}
    if (mode === 'movies') next.mode = 'movies'
    if (key && key !== genreKey) next.genre = key
    setParams(next, { replace: true })
  }

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
  const openItem = mode === 'movies' ? (r) => navigate(`/movie/${r.id}`) : openRecShow

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

  const genreBar = (
    <div className="genre-scroll">
      {GENRE_CHIPS[mode].map((c) => (
        <button
          key={c.key}
          className={`genre-pill${genreKey === c.key ? ' active' : ''}`}
          onClick={() => pickGenre(c.key)}
        >
          {c.emoji} {c.name}
        </button>
      ))}
    </div>
  )

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
      {!results && !searching && isTmdbConfigured && (
        <>
          {genreBar}
          {resolving && <p className="muted center">Opening…</p>}
          {!chip && (
            <RecRow
              title={mode === 'movies' ? '✨ Movies for you' : '✨ Shows for you'}
              items={mode === 'movies' ? recs?.movies : recs?.shows}
              onOpen={openItem}
            />
          )}
          {feed === null && <p className="muted center">Loading Discover…</p>}
          {(feed || []).map((row) => (
            <RecRow key={row.title} title={row.title} items={row.items} onOpen={openItem} />
          ))}
          {services !== null && services.length === 0 && (
            <p className="import-help center">
              💡 <Link to="/services" style={{ color: 'var(--gold)' }}>Pick your streaming services</Link> to
              tailor these rows to what you can watch.
            </p>
          )}
        </>
      )}
      {!results && !searching && !isTmdbConfigured && mode === 'shows' && (
        <div className="empty">
          <span className="empty-icon">🔭</span>
          <p>Search any TV show to see seasons, episodes, and add it to your lists.</p>
        </div>
      )}
      <p className="attribution">
        {mode === 'movies'
          ? 'Movie data from TMDB. This app uses the TMDB API but is not endorsed or certified by TMDB.'
          : 'Show data from TVMaze; discovery rows from TMDB.'}
      </p>
    </>
  )
}
