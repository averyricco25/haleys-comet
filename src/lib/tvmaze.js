// TVMaze API — free, no API key required. https://www.tvmaze.com/api
const BASE = 'https://api.tvmaze.com'

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`TVMaze request failed (${res.status})`)
  return res.json()
}

export function searchShows(query) {
  return get(`/search/shows?q=${encodeURIComponent(query)}`)
}

export function getShowWithEpisodes(id) {
  return get(`/shows/${id}?embed=episodes`)
}

export function singleSearchShow(query) {
  return get(`/singlesearch/shows?q=${encodeURIComponent(query)}`)
}

export function stripHtml(html) {
  if (!html) return ''
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || ''
}

// Group an episode list into { seasonNumber: [episodes] }
export function groupBySeason(episodes) {
  const seasons = new Map()
  for (const ep of episodes) {
    if (!seasons.has(ep.season)) seasons.set(ep.season, [])
    seasons.get(ep.season).push(ep)
  }
  return [...seasons.entries()].sort((a, b) => a[0] - b[0])
}
