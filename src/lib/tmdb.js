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

export const posterUrl = (path, size = 'w342') => (path ? `${IMG}/${size}${path}` : null)
