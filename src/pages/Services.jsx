import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loadPrefs, savePrefs } from '../lib/storage'
import { SERVICES } from '../lib/services'

export default function Services() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    loadPrefs(user).then((p) => setSelected(new Set(p.services || [])))
  }, [user])

  const toggle = (id) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
    savePrefs(user, { services: [...next] })
  }

  if (!selected) return <p className="muted center" style={{ marginTop: '4rem' }}>Loading…</p>

  return (
    <>
      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
      <header className="page-header">
        <h1>My Streaming Services</h1>
        <p className="page-sub">
          Pick what you're subscribed to — Discover will highlight what you can actually watch.
          No sign-ins needed, and you can change this anytime.
        </p>
      </header>
      <div className="svc-grid">
        {SERVICES.map((s) => (
          <button
            key={s.id}
            className={`svc-chip${selected.has(s.id) ? ' active' : ''}`}
            onClick={() => toggle(s.id)}
          >
            <span className="svc-icon">{s.icon}</span>
            <span>{s.name}</span>
            {selected.has(s.id) && <span className="svc-check">✓</span>}
          </button>
        ))}
      </div>
      <p className="import-help" style={{ marginTop: '1.25rem' }}>
        Selections save automatically{user.isGuest ? ' on this device' : ' to your account'}.
      </p>
    </>
  )
}
