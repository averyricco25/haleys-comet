// Trakt export importer: parses the export zip, matches shows to TVMaze and
// movies to TMDB, and produces Comet library docs. Free of Firebase imports so
// it can also run in Node for dry runs.
import JSZip from 'jszip'

const TVMAZE = 'https://api.tvmaze.com'
const TMDB = 'https://api.themoviedb.org/3'
const TMDB_IMG = 'https://image.tmdb.org/t/p'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- Parsing ----------

export async function parseTraktZip(zipInput) {
  const zip = await JSZip.loadAsync(zipInput)
  const readJson = async (file) => JSON.parse(await file.async('string'))
  const filesMatching = (re) =>
    Object.values(zip.files).filter((f) => !f.dir && re.test(f.name.split('/').pop()))

  const showsFile = filesMatching(/^watched-shows\.json$/)[0]
  if (!showsFile) throw new Error("This doesn't look like a Trakt export (no watched-shows.json).")

  const shows = await readJson(showsFile)

  // Episode-level history: map trakt show id -> Set of "season|episode"
  const historyByShow = new Map()
  for (const file of filesMatching(/^watched-history-\d+\.json$/)) {
    const events = await readJson(file)
    for (const ev of events) {
      if (ev.type !== 'episode' || !ev.episode || !ev.show) continue
      const key = ev.show.ids.trakt
      if (!historyByShow.has(key)) historyByShow.set(key, new Set())
      historyByShow.get(key).add(`${ev.episode.season}|${ev.episode.number}`)
    }
  }

  const movies = []
  for (const file of filesMatching(/^watched-movies-\d+\.json$/)) {
    movies.push(...(await readJson(file)))
  }

  let watchlist = []
  const wlFile = filesMatching(/^lists-watchlist\.json$/)[0]
  if (wlFile) watchlist = await readJson(wlFile)

  return { shows, historyByShow, movies, watchlist }
}

// ---------- TVMaze matching (rate-limited: ~2 requests/sec) ----------

let lastTvmazeCall = 0
async function tvmaze(path) {
  const wait = lastTvmazeCall + 550 - Date.now()
  if (wait > 0) await sleep(wait)
  lastTvmazeCall = Date.now()
  const res = await fetch(`${TVMAZE}${path}`)
  if (res.status === 429) {
    await sleep(3000)
    return tvmaze(path)
  }
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`TVMaze ${res.status}`)
  return res.json()
}

async function matchShowToTvmaze(traktShow) {
  const { ids, title } = traktShow
  let show = null
  if (ids.tvdb) show = await tvmaze(`/lookup/shows?thetvdb=${ids.tvdb}`)
  if (!show && ids.imdb) show = await tvmaze(`/lookup/shows?imdb=${ids.imdb}`)
  if (!show) show = await tvmaze(`/singlesearch/shows?q=${encodeURIComponent(title)}`)
  return show
}

function buildShowDoc(tvmazeShow, episodes, watchedKeys, traktEntry, status) {
  const runtimeOf = (ep) => ep.runtime || tvmazeShow.averageRuntime || 40
  const watched = []
  let watchedMinutes = 0
  for (const ep of episodes) {
    if (watchedKeys && watchedKeys.has(`${ep.season}|${ep.number}`)) {
      watched.push(ep.id)
      watchedMinutes += runtimeOf(ep)
    }
  }
  return {
    id: tvmazeShow.id,
    type: 'show',
    name: tvmazeShow.name,
    image: tvmazeShow.image?.medium || null,
    premiered: tvmazeShow.premiered || null,
    network: tvmazeShow.network?.name || tvmazeShow.webChannel?.name || null,
    genres: tvmazeShow.genres || [],
    totalEpisodes: episodes.length,
    averageRuntime: tvmazeShow.averageRuntime || null,
    rating: 0,
    watched,
    watchedMinutes,
    notes: '',
    status,
    updatedAt: traktEntry?.last_watched_at ? Date.parse(traktEntry.last_watched_at) : Date.now(),
  }
}

// ---------- TMDB movie fetch (concurrency pool) ----------

async function fetchMovieDoc(tmdbKey, entry, status) {
  const tmdbId = entry.movie.ids.tmdb
  if (!tmdbId) return null
  const res = await fetch(`${TMDB}/movie/${tmdbId}?api_key=${tmdbKey}`)
  if (!res.ok) return null
  const m = await res.json()
  return {
    id: `movie-${tmdbId}`,
    movieId: tmdbId,
    type: 'movie',
    name: m.title || entry.movie.title,
    image: m.poster_path ? `${TMDB_IMG}/w342${m.poster_path}` : null,
    year: (m.release_date || `${entry.movie.year}`).slice(0, 4),
    genre: m.genres?.[0]?.name || null,
    runtime: m.runtime || null,
    rating: 0,
    notes: '',
    status,
    updatedAt: entry.last_watched_at
      ? Date.parse(entry.last_watched_at)
      : entry.listed_at
        ? Date.parse(entry.listed_at)
        : Date.now(),
  }
}

async function pool(items, size, worker) {
  const results = []
  let i = 0
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const idx = i++
        results[idx] = await worker(items[idx], idx)
      }
    })
  )
  return results
}

// ---------- Orchestration ----------

export async function runImport({ parsed, tmdbKey, existingIds, onProgress }) {
  const docs = []
  const unmatched = []
  const skipped = []
  const progress = (phase, done, total) => onProgress && onProgress({ phase, done, total })

  // Shows (watched + watchlist entries)
  const watchlistShows = parsed.watchlist.filter((w) => w.type === 'show')
  const showJobs = [
    ...parsed.shows.map((s) => ({ entry: s, kind: 'watched' })),
    ...watchlistShows.map((s) => ({ entry: s, kind: 'watchlist' })),
  ]
  let done = 0
  for (const job of showJobs) {
    const traktShow = job.entry.show
    progress('Matching shows', done, showJobs.length)
    try {
      const tvmazeShow = await matchShowToTvmaze(traktShow)
      if (!tvmazeShow) {
        unmatched.push(`Show: ${traktShow.title} (${traktShow.year})`)
      } else if (existingIds.has(String(tvmazeShow.id))) {
        skipped.push(traktShow.title)
      } else {
        const withEps = await tvmaze(`/shows/${tvmazeShow.id}?embed=episodes`)
        const episodes = withEps?._embedded?.episodes || []
        if (job.kind === 'watchlist') {
          docs.push(buildShowDoc(tvmazeShow, episodes, null, job.entry, 'watchlist'))
        } else {
          const watchedKeys = parsed.historyByShow.get(traktShow.ids.trakt) || new Set()
          const doc = buildShowDoc(tvmazeShow, episodes, watchedKeys, job.entry, 'watching')
          if (doc.watched.length === 0 && job.entry.plays > 0) {
            // No episode-level history for this show; fall back to play count heuristic
            if (job.entry.plays >= (traktShow.aired_episodes || Infinity)) {
              doc.watched = episodes.map((e) => e.id)
              doc.watchedMinutes = episodes.reduce(
                (sum, e) => sum + (e.runtime || tvmazeShow.averageRuntime || 40),
                0
              )
            }
          }
          doc.status =
            episodes.length > 0 && doc.watched.length >= episodes.length ? 'finished' : 'watching'
          docs.push(doc)
        }
      }
    } catch (err) {
      unmatched.push(`Show: ${traktShow.title} (error: ${err.message})`)
    }
    done++
  }

  // Movies (watched + watchlist)
  const watchlistMovies = parsed.watchlist.filter((w) => w.type === 'movie')
  const movieJobs = [
    ...parsed.movies.map((m) => ({ entry: m, status: 'watched' })),
    ...watchlistMovies.map((m) => ({ entry: m, status: 'watchlist' })),
  ]
  let mDone = 0
  await pool(movieJobs, 8, async (job) => {
    const tmdbId = job.entry.movie.ids.tmdb
    if (tmdbId && existingIds.has(`movie-${tmdbId}`)) {
      skipped.push(job.entry.movie.title)
    } else {
      try {
        const doc = await fetchMovieDoc(tmdbKey, job.entry, job.status)
        if (doc) docs.push(doc)
        else unmatched.push(`Movie: ${job.entry.movie.title} (${job.entry.movie.year})`)
      } catch {
        unmatched.push(`Movie: ${job.entry.movie.title} (${job.entry.movie.year})`)
      }
    }
    mDone++
    progress('Matching movies', mDone, movieJobs.length)
  })

  return { docs, unmatched, skipped }
}
