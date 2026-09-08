// @vitest-environment jsdom
import React, { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, useNavigate, useSearchParams } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./context/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'test' }, loading: false }) }))
vi.mock('./pages/Search', () => ({ default: function Discover() {
  const [query, setQuery] = useState('')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  return <div data-testid="discover">
    <span>{params.toString()}</span>
    <input value={query} readOnly aria-label="Query" />
    <button onClick={() => setQuery('comet')}>Search fixture</button>
    <div data-testid="carousel" />
    <button onClick={() => navigate('/show/1')}>Open show</button>
    <button onClick={() => navigate('/movie/2')}>Open movie</button>
  </div>
} }))
vi.mock('./pages/ShowDetail', () => ({ default: function Detail() {
  const navigate = useNavigate()
  return <button onClick={() => navigate(-1)}>Back</button>
} }))
vi.mock('./pages/MovieDetail', () => ({ default: function Detail() {
  const navigate = useNavigate()
  return <button onClick={() => navigate(-1)}>Back</button>
} }))
vi.mock('./pages/MyShows', () => ({ default: () => null }))
vi.mock('./pages/Movies', () => ({ default: () => null }))
vi.mock('./pages/Watchlist', () => ({ default: () => null }))
vi.mock('./pages/Profile', () => ({ default: () => null }))
vi.mock('./pages/Import', () => ({ default: () => null }))
vi.mock('./pages/Services', () => ({ default: () => null }))
vi.mock('./pages/Login', () => ({ default: () => null }))
vi.mock('./components/BottomNav', () => ({ default: () => null }))

let container, root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  window.history.scrollRestoration = 'auto'
  Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true })
  window.scrollTo = vi.fn(({ top }) => { window.scrollY = top })
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})
function click(label) {
  act(() => [...container.querySelectorAll('button')].find(b => b.textContent === label).click())
}

it.each(['show', 'movie'])('returns from a %s to the same Discover state and position', (kind) => {
  act(() => root.render(<React.StrictMode><MemoryRouter initialEntries={['/search?mode=movies&genre=comedy']}><App /></MemoryRouter></React.StrictMode>))
  click('Search fixture')
  const discover = container.querySelector('[data-testid="discover"]')
  const carousel = container.querySelector('[data-testid="carousel"]')
  carousel.scrollLeft = 370
  act(() => { window.scrollY = 1250; window.dispatchEvent(new Event('scroll')) })
  click(`Open ${kind}`)
  expect(discover.parentElement.hidden).toBe(true)
  expect(window.scrollY).toBe(0)
  // Scrolling the detail page must not overwrite the Discover position.
  act(() => { window.scrollY = 600; window.dispatchEvent(new Event('scroll')) })
  click('Back')
  expect(discover.parentElement.hidden).toBe(false)
  expect(container.querySelector('[data-testid="discover"]')).toBe(discover)
  expect(container.querySelector('input').value).toBe('comet')
  expect(discover.textContent).toContain('mode=movies&genre=comedy')
  expect(carousel.scrollLeft).toBe(370)
  expect(window.scrollY).toBe(1250)
  click(`Open ${kind}`)
  click('Back')
  expect(window.scrollY).toBe(1250)
})

it('restores the browser scroll setting on unmount', () => {
  act(() => root.render(<MemoryRouter initialEntries={['/search']}><App /></MemoryRouter>))
  expect(window.history.scrollRestoration).toBe('manual')
  act(() => root.render(null))
  expect(window.history.scrollRestoration).toBe('auto')
})
