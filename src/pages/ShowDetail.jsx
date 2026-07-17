import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getShowWithEpisodes, stripHtml, groupBySeason } from '../lib/tvmaze'
import { useShows } from '../context/ShowsContext'
import RatingStars from '../components/RatingStars'
import NoteBox from '../components/NoteBox'
import StreamingBar from '../components/StreamingBar'
import { isTmdbConfigured, searchTv, findTvByImdb, watchProviders } from '../lib/tmdb'

export default function ShowDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { shows, saveShow, removeShow } = useShows()
  const [details, setDetails] = useState(null)
  const [error, setError] = useState(null)
  const [openSeason, setOpenSeason] = useState(null)
  const [expandSummary, setExpandSummary] = useState(false)

  const saved = shows[id]

  useEffect(() => {
    let cancelled = false
    getShowWithEpisodes(id)
      .then((data) => !cancelled && setDetails(data))
      .catch(() => !cancelled && setError("Couldn't load this show. Check your connection."))
    return () => {
      cancelled = true
    }
  }, [id])

  const episodes = details?._embedded?.episodes || []
  const seasons = useMemo(() => groupBySeason(episodes), [episodes])
  const watched = useMemo(() => new Set(saved?.watched || []), [saved])

  if (error) return <p className="error center">{error}</p>
  if (!details) return <p className="muted center" style={{ marginTop: '4rem' }}>Loading…</p>

  const summary = stripHtml(details.summary)

  const loadProviders = async () => {
    if (!isTmdbConfigured) return null
    let tmdbId = null
    if (details.externals?.imdb) {
      tmdbId = (await findTvByImdb(details.externals.imdb))?.id || null
    }
    if (!tmdbId) tmdbId = (await searchTv(details.name))?.[0]?.id || null
    return tmdbId ? watchProviders('tv', tmdbId) : null
  }

  const runtimeOf = (ep) => ep.runtime || details.averageRuntime || 40
  const minutesFor = (watchedList) => {
    const ids = new Set(watchedList)
    return episodes.reduce((sum, ep) => (ids.has(ep.id) ? sum + runtimeOf(ep) : sum), 0)
  }

  const baseDoc = () => ({
    id: details.id,
    type: 'show',
    name: details.name,
    image: details.image?.medium || null,
    premiered: details.premiered || null,
    network: details.network?.name || details.webChannel?.name || null,
    genres: details.genres || [],
    totalEpisodes: episodes.length,
    averageRuntime: details.averageRuntime || null,
    rating: saved?.rating || 0,
    watched: saved?.watched || [],
    watchedMinutes: minutesFor(saved?.watched || []),
    notes: saved?.notes || '',
    favorite: saved?.favorite || false,
    status: saved?.status || null,
  })

  const setStatus = (status) => {
    if (saved?.status === status) {
      const hasProgress = (saved.watched?.length || 0) > 0 || saved.rating > 0
      if (
        !hasProgress ||
        window.confirm(`Remove “${details.name}” from your library? Your episode progress and rating will be deleted.`)
      ) {
        removeShow(details.id)
      }
    } else if (status === 'finished') {
      // Finishing a show checks off every episode so watch time counts fully
      const allIds = episodes.map((e) => e.id)
      saveShow({ ...baseDoc(), status, watched: allIds, watchedMinutes: minutesFor(allIds) })
    } else {
      saveShow({ ...baseDoc(), status })
    }
  }

  const setRating = (rating) => {
    saveShow({ ...baseDoc(), status: saved?.status || 'watching', rating })
  }

  const saveNote = (notes) => {
    saveShow({ ...baseDoc(), status: saved?.status || 'watching', notes })
  }

  const toggleFavorite = () => {
    saveShow({ ...baseDoc(), status: saved?.status || 'watching', favorite: !saved?.favorite })
  }

  const toggleEpisode = (epId) => {
    const next = new Set(watched)
    if (next.has(epId)) next.delete(epId)
    else next.add(epId)
    finishAwareSave([...next])
  }

  const toggleSeason = (eps) => {
    const next = new Set(watched)
    const allWatched = eps.every((e) => next.has(e.id))
    for (const e of eps) {
      if (allWatched) next.delete(e.id)
      else next.add(e.id)
    }
    finishAwareSave([...next])
  }

  // Auto-move between watching/finished as episodes are checked off
  const finishAwareSave = (watchedList) => {
    let status = saved?.status || 'watching'
    if (watchedList.length === episodes.length && episodes.length > 0) status = 'finished'
    else if (status === 'finished') status = 'watching'
    if (status === 'watchlist' && watchedList.length > 0) status = 'watching'
    saveShow({ ...baseDoc(), watched: watchedList, watchedMinutes: minutesFor(watchedList), status })
  }

  const progress = episodes.length ? watched.size / episodes.length : 0

  return (
    <div className="detail">
      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
      <div className="detail-hero">
        {details.image ? (
          <img src={details.image.original || details.image.medium} alt={details.name} className="detail-poster" />
        ) : (
          <div className="detail-poster poster-empty">📺</div>
        )}
        <div className="detail-head">
          <div className="title-row">
            <h1>{details.name}</h1>
            <button
              className={`fav-pill${saved?.favorite ? ' active' : ''}`}
              onClick={toggleFavorite}
            >
              {saved?.favorite ? '★ Favorited' : '☆ Favorite'}
            </button>
          </div>
          <p className="detail-meta">
            {[details.premiered?.slice(0, 4), details.network?.name || details.webChannel?.name, details.status]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="detail-meta">
            {seasons.length} season{seasons.length !== 1 ? 's' : ''} · {episodes.length} episode{episodes.length !== 1 ? 's' : ''}
          </p>
          {details.genres?.length > 0 && (
            <div className="genre-row">
              {details.genres.map((g) => (
                <span key={g} className="genre-chip">{g}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <StreamingBar load={loadProviders} loadKey={details.id} />

      <div className="status-row">
        <button className={`btn btn-status${saved?.status === 'watchlist' ? ' active' : ''}`} onClick={() => setStatus('watchlist')}>
          🌠 Watchlist
        </button>
        <button className={`btn btn-status${saved?.status === 'watching' ? ' active' : ''}`} onClick={() => setStatus('watching')}>
          📺 Watching
        </button>
        <button className={`btn btn-status${saved?.status === 'finished' ? ' active' : ''}`} onClick={() => setStatus('finished')}>
          ✅ Finished
        </button>
      </div>

      <div className="rate-block">
        <span className="rate-label">Your rating</span>
        <RatingStars rating={saved?.rating || 0} onRate={setRating} size="lg" />
      </div>

      {summary && (
        <p className={`detail-summary${expandSummary ? ' expanded' : ''}`} onClick={() => setExpandSummary(!expandSummary)}>
          {summary}
        </p>
      )}

      <NoteBox value={saved?.notes} onSave={saveNote} />

      {saved && episodes.length > 0 && (
        <div className="progress-block">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="progress-text">{watched.size} / {episodes.length} episodes watched</span>
        </div>
      )}

      <h2 className="section-title">Episodes</h2>
      {seasons.map(([seasonNum, eps]) => {
        const seasonWatched = eps.filter((e) => watched.has(e.id)).length
        const open = openSeason === seasonNum
        return (
          <div key={seasonNum} className="season">
            <button className="season-header" onClick={() => setOpenSeason(open ? null : seasonNum)}>
              <span className="season-title">Season {seasonNum}</span>
              <span className="season-count">{seasonWatched}/{eps.length}</span>
              <span className="season-chevron">{open ? '▾' : '▸'}</span>
            </button>
            {open && (
              <div className="episode-list">
                <button className="btn btn-ghost btn-small" onClick={() => toggleSeason(eps)}>
                  {eps.every((e) => watched.has(e.id)) ? 'Unmark season' : 'Mark season watched'}
                </button>
                {eps.map((ep) => (
                  <label key={ep.id} className="episode-row">
                    <input
                      type="checkbox"
                      checked={watched.has(ep.id)}
                      onChange={() => toggleEpisode(ep.id)}
                    />
                    <span className="episode-num">E{ep.number ?? '–'}</span>
                    <span className="episode-name">{ep.name}</span>
                    {ep.airdate && <span className="episode-date">{ep.airdate}</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
