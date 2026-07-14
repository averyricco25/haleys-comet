import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Shows', icon: '📺' },
  { to: '/movies', label: 'Movies', icon: '🎬' },
  { to: '/watchlist', label: 'Watchlist', icon: '🌠' },
  { to: '/search', label: 'Discover', icon: '🔭' },
  { to: '/profile', label: 'Profile', icon: '🪐' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}>
          <span className="nav-icon">{t.icon}</span>
          <span className="nav-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
