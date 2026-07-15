// Dry run of the Trakt import against a local export zip. No database writes.
// Usage: node scripts/dry-run-import.mjs <path-to-trakt-zip> [movieSampleSize]
import { readFile } from 'node:fs/promises'
import { parseTraktZip, runImport } from '../src/lib/importTrakt.js'

const zipPath = process.argv[2]
const movieSample = Number(process.argv[3] ?? 25)
const envText = await readFile(new URL('../.env', import.meta.url), 'utf8')
const tmdbKey = envText.match(/^VITE_TMDB_API_KEY=(.+)$/m)?.[1]?.trim()

const parsed = await parseTraktZip(await readFile(zipPath))
console.log(
  `Parsed: ${parsed.shows.length} shows, ${parsed.movies.length} movies, ` +
    `${parsed.watchlist.length} watchlist, history for ${parsed.historyByShow.size} shows`
)

if (movieSample >= 0) parsed.movies = parsed.movies.slice(0, movieSample)

let lastLog = 0
const { docs, unmatched, skipped } = await runImport({
  parsed,
  tmdbKey,
  existingIds: new Set(),
  onProgress: ({ phase, done, total }) => {
    if (Date.now() - lastLog > 5000 || done === total) {
      lastLog = Date.now()
      console.log(`${phase}: ${done}/${total}`)
    }
  },
})

const shows = docs.filter((d) => d.type === 'show')
const movies = docs.filter((d) => d.type === 'movie')
const totalEps = shows.reduce((s, d) => s + d.watched.length, 0)
const totalMin =
  shows.reduce((s, d) => s + d.watchedMinutes, 0) +
  movies.filter((m) => m.status === 'watched').reduce((s, m) => s + (m.runtime || 120), 0)

console.log('\n=== RESULT ===')
console.log(`Show docs: ${shows.length} (finished: ${shows.filter((d) => d.status === 'finished').length}, watching: ${shows.filter((d) => d.status === 'watching').length}, watchlist: ${shows.filter((d) => d.status === 'watchlist').length})`)
console.log(`Episodes marked watched: ${totalEps}`)
console.log(`Movie docs: ${movies.length} (sampled)`)
console.log(`Watch time so far: ${Math.floor(totalMin / 1440)}d ${Math.floor((totalMin % 1440) / 60)}h ${totalMin % 60}m`)
console.log(`Skipped: ${skipped.length}`)
console.log(`Unmatched (${unmatched.length}):`)
for (const u of unmatched) console.log('  - ' + u)
console.log('\nSample show doc:', JSON.stringify({ ...shows[0], watched: `[${shows[0]?.watched.length} ids]` }))
console.log('Sample movie doc:', JSON.stringify(movies[0]))
