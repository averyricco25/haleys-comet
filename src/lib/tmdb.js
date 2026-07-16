// TMDB (themoviedb.org) — free API key required, see SETUP.md.
// Movies search stays disabled (with a setup hint) until the key is configured.
const KEY = import.meta.env.VITE_TMDB_API_KEY
const BASE = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p'

export const isTmdbConfigured = Boolean(KEY)

async function get(path, params = {}) {
  const qs = new URLSearchParams({ api_key: KEY, ...params })
  const res = await fetch(`${BASE}${path}?${qs}`)
  if (!res.ok) throw new Error(`TMDB request failed (${res.status})`)
  return res.json()
}

export async function searchMovies(query) {
  const data = await get('/search/movie', { query, include_adult: 'false' })
  return data.results
}

export function lookupMovie(id) {
  return get(`/movie/${id}`)
}

export async function searchTv(query) {
  const data = await get('/search/tv', { query, include_adult: 'false' })
  return data.results
}

export async function movieRecommendations(id) {
  const data = await get(`/movie/${id}/recommendations`)
  return data.results
}

export async function tvRecommendations(id) {
  const data = await get(`/tv/${id}/recommendations`)
  return data.results
}

// mediaType is 'tv' or 'movie'
export async function trending(mediaType) {
  const data = await get(`/trending/${mediaType}/week`)
  return data.results
}

export async function nowPlayingMovies() {
  const data = await get('/movie/now_playing', { region: 'US' })
  return data.results
}

// US streaming availability. mediaType is 'tv' or 'movie'.
export async function watchProviders(mediaType, id) {
  const data = await get(`/${mediaType}/${id}/watch/providers`)
  return data.results?.US || null
}

export async function findTvByImdb(imdbId) {
  const data = await get(`/find/${imdbId}`, { external_source: 'imdb_id' })
  return data.tv_results?.[0] || null
}

export const providerLogo = (path) => (path ? `https://image.tmdb.org/t/p/w92${path}` : null)

export async function discoverMedia(mediaType, { genreId, providers } = {}) {
  const params = { sort_by: 'popularity.desc', include_adult: 'false', watch_region: 'US' }
  if (genreId) params.with_genres = String(genreId)
  if (providers?.length) params.with_watch_providers = providers.join('|')
  const data = await get(`/discover/${mediaType}`, params)
  return data.results
}

export const posterUrl = (path, size = 'w342') => (path ? `${IMG}/${size}${path}` : null)
