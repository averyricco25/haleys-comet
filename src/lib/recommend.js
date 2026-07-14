// "For You" recommendations, seeded from the user's rated/watched library items.
// Both show and movie recs come from TMDB's recommendation engine; show cards are
// resolved back to TVMaze (which powers episode data) when tapped.
import { searchTv, movieRecommendations, tvRecommendations, posterUrl } from './tmdb'

let cache = { signature: null, data: null }

const librarySignature = (items) =>
  items.map((i) => `${i.id}:${i.status}:${i.rating}`).sort().join('|')

function pickSeeds(items, type, count = 4) {
  return items
    .filter((i) => (type === 'movie' ? i.type === 'movie' : i.type !== 'movie'))
    .filter((i) => i.status && i.status !== 'watchlist')
    .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, count)
}

function accumulate(map, results, exclude) {
  for (const r of results.slice(0, 10)) {
    const name = r.title || r.name
    if (!name || exclude.has(name.toLowerCase()) || exclude.has(r.id)) continue
    const entry = map.get(r.id) || {
      id: r.id,
      name,
      image: posterUrl(r.poster_path, 'w185'),
      year: (r.release_date || r.first_air_date || '').slice(0, 4),
      score: 0,
    }
    // Seed overlap counts most; TMDB's own rating breaks ties
    entry.score += 1 + (r.vote_average || 0) / 10
    map.set(r.id, entry)
  }
}

export async function getRecommendations(library) {
  const items = Object.values(library)
  const signature = librarySignature(items)
  if (cache.signature === signature) return cache.data

  const libNames = new Set(items.map((i) => i.name.toLowerCase()))
  const libMovieIds = new Set(items.filter((i) => i.type === 'movie').map((i) => i.movieId))

  const movieMap = new Map()
  const showMap = new Map()

  const movieJobs = pickSeeds(items, 'movie').map(async (seed) => {
    const recs = await movieRecommendations(seed.movieId)
    accumulate(movieMap, recs, new Set([...libNames, ...libMovieIds]))
  })

  const showJobs = pickSeeds(items, 'show').map(async (seed) => {
    const matches = await searchTv(seed.name)
    const tmdbId = matches?.[0]?.id
    if (!tmdbId) return
    const recs = await tvRecommendations(tmdbId)
    accumulate(showMap, recs, libNames)
  })

  await Promise.allSettled([...movieJobs, ...showJobs])

  const rank = (map) => [...map.values()].sort((a, b) => b.score - a.score).slice(0, 10)
  const data = { shows: rank(showMap), movies: rank(movieMap) }
  cache = { signature, data }
  return data
}
