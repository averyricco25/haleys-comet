import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useShows } from '../context/ShowsContext'
import { parseTraktZip, runImport } from '../lib/importTrakt'
import { persistMany } from '../lib/storage'

export default function Import() {
  const { user } = useAuth()
  const { shows } = useShows()
  const [parsed, setParsed] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(null)
    setParsed(null)
    setResult(null)
    try {
      setParsed(await parseTraktZip(file))
    } catch (err) {
      setParseError(err.message)
    }
  }

  const start = async () => {
    setRunning(true)
    setResult(null)
    try {
      const existingIds = new Set(Object.keys(shows))
      const { docs, unmatched, skipped } = await runImport({
        parsed,
        tmdbKey: import.meta.env.VITE_TMDB_API_KEY,
        existingIds,
        onProgress: setProgress,
      })
      setProgress({ phase: 'Saving to your library', done: 0, total: docs.length })
      await persistMany(user, docs, (done, total) =>
        setProgress({ phase: 'Saving to your library', done, total })
      )
      setResult({ imported: docs.length, unmatched, skipped })
    } catch (err) {
      setResult({ error: err.message })
    } finally {
      setRunning(false)
      setProgress(null)
    }
  }

  const watchlistCount = parsed?.watchlist?.length || 0
  const pct = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <>
      <header className="page-header">
        <h1>Import</h1>
        <p className="page-sub">Bring your history over from Trakt</p>
      </header>

      <div className="import-card">
        <p className="import-help">
          Select your Trakt export zip (from Trakt → Settings → Data → Export). Watched shows,
          episode history, watched movies, and your watchlist will be added to
          {user.isGuest ? ' this device' : ` ${user.displayName?.split(' ')[0]}'s library`}.
          Items already in the library are left untouched, so it's safe to run again.
        </p>
        <input type="file" accept=".zip" onChange={onFile} disabled={running} />
        {parseError && <p className="error">{parseError}</p>}

        {parsed && !result && (
          <div className="import-summary">
            <p>
              Found <b>{parsed.shows.length}</b> watched shows, <b>{parsed.movies.length}</b>{' '}
              watched movies, and <b>{watchlistCount}</b> watchlist items.
            </p>
            <p className="import-help">
              Importing takes a few minutes — it looks up every show and movie to get episodes,
              posters, and runtimes. Keep this page open.
            </p>
            <button className="btn btn-primary" onClick={start} disabled={running}>
              {running ? 'Importing…' : 'Start import'}
            </button>
          </div>
        )}

        {progress && (
          <div className="import-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="progress-text">
              {progress.phase} — {progress.done} / {progress.total}
            </span>
          </div>
        )}

        {result && !result.error && (
          <div className="import-summary">
            <p>
              ✅ Imported <b>{result.imported}</b> items
              {result.skipped.length > 0 && <> ({result.skipped.length} already in library)</>}.
            </p>
            {result.unmatched.length > 0 && (
              <details>
                <summary>{result.unmatched.length} couldn't be matched</summary>
                <ul className="import-unmatched">
                  {result.unmatched.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              </details>
            )}
            <button className="btn btn-primary" onClick={() => (window.location.href = '/')}>
              Go to My Shows
            </button>
          </div>
        )}
        {result?.error && <p className="error">Import failed: {result.error}</p>}
      </div>
    </>
  )
}
