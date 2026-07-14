import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
} from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured } from '../firebase'

const AuthContext = createContext(null)
const GUEST_KEY = 'comet-guest'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (localStorage.getItem(GUEST_KEY)) {
      setUser({ uid: 'guest', displayName: 'Guest', isGuest: true })
      setLoading(false)
      return
    }
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u ? { uid: u.uid, displayName: u.displayName, photoURL: u.photoURL, email: u.email } : null)
      setLoading(false)
    })
  }, [])

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      // Popup can be blocked on some mobile browsers; fall back to redirect
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(auth, googleProvider)
      } else if (err.code !== 'auth/popup-closed-by-user') {
        throw err
      }
    }
  }

  const continueAsGuest = () => {
    localStorage.setItem(GUEST_KEY, '1')
    setUser({ uid: 'guest', displayName: 'Guest', isGuest: true })
  }

  const signOut = async () => {
    localStorage.removeItem(GUEST_KEY)
    if (user && !user.isGuest) await fbSignOut(auth)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, continueAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
