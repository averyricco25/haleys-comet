import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { loadShows, persistShow, deleteShow } from '../lib/storage'

const ShowsContext = createContext(null)

export function ShowsProvider({ children }) {
  const { user } = useAuth()
  const [shows, setShows] = useState({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user) {
      setShows({})
      setLoaded(false)
      return
    }
    let cancelled = false
    loadShows(user).then((data) => {
      if (!cancelled) {
        setShows(data)
        setLoaded(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const saveShow = useCallback(
    (show) => {
      const updated = { ...show, updatedAt: Date.now() }
      setShows((prev) => ({ ...prev, [show.id]: updated }))
      persistShow(user, updated)
    },
    [user]
  )

  const removeShow = useCallback(
    (showId) => {
      setShows((prev) => {
        const next = { ...prev }
        delete next[showId]
        return next
      })
      deleteShow(user, showId)
    },
    [user]
  )

  return (
    <ShowsContext.Provider value={{ shows, loaded, saveShow, removeShow }}>
      {children}
    </ShowsContext.Provider>
  )
}

export const useShows = () => useContext(ShowsContext)
