import { useEffect, useState } from 'react'
import { providerLogo } from '../lib/tmdb'
import { useAuth } from '../context/AuthContext'
import { loadPrefs } from '../lib/storage'

// Renders "Streaming on …" chips. `load` is an async fn returning the TMDB
// US watch-provider object (or null); called once per mount.
export default function StreamingBar({ load, loadKey }) {
  const { user } = useAuth()
  const [providers, setProviders] = useState(null)
  const [mine, setMine] = useState(new Set())

  useEffect(() => {
    loadPrefs(user).then((p) => setMine(new Set(p.services || [])))
  }, [user])

  useEffect(() => {
    let cancelled = false
    setProviders(null)
    load()
      .then((us) => !cancelled && setProviders(us?.flatrate?.slice(0, 6) || []))
      .catch(() => !cancelled && setProviders([]))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadKey])

  if (!providers || providers.length === 0) return null

  return (
    <div className="provider-bar">
      <span className="provider-label">▶ Streaming on</span>
      {providers.map((p) => (
        <span key={p.provider_id} className={`provider-chip${mine.has(p.provider_id) ? ' subscribed' : ''}`}>
          {p.logo_path && <img src={providerLogo(p.logo_path)} alt="" className="provider-logo" />}
          {p.provider_name}
          {mine.has(p.provider_id) && ' ✓'}
        </span>
      ))}
    </div>
  )
}
