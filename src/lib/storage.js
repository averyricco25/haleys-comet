// Data layer: Firestore when signed in with Google, localStorage in guest mode.
// A saved show doc looks like:
// { id, name, image, status: 'watchlist'|'watching'|'finished',
//   rating: 0-5, watched: [episodeIds], totalEpisodes, premiered, network, genres, updatedAt }
import { db } from '../firebase'
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch } from 'firebase/firestore'

const LOCAL_KEY = 'comet-shows'
const PREFS_KEY = 'comet-prefs'

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}
  } catch {
    return {}
  }
}

function writeLocal(shows) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(shows))
}

export async function loadShows(user) {
  if (user.isGuest) return readLocal()
  const snap = await getDocs(collection(db, 'users', user.uid, 'shows'))
  const shows = {}
  snap.forEach((d) => {
    shows[d.id] = d.data()
  })
  return shows
}

export async function persistShow(user, show) {
  if (user.isGuest) {
    const shows = readLocal()
    shows[show.id] = show
    writeLocal(shows)
    return
  }
  await setDoc(doc(db, 'users', user.uid, 'shows', String(show.id)), show)
}

// User preferences (e.g. streaming services). Stored per-user, outside the shows collection.
export async function loadPrefs(user) {
  if (user.isGuest) {
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}
    } catch {
      return {}
    }
  }
  const snap = await getDoc(doc(db, 'users', user.uid, 'settings', 'prefs'))
  return snap.exists() ? snap.data() : {}
}

export async function savePrefs(user, prefs) {
  if (user.isGuest) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    return
  }
  await setDoc(doc(db, 'users', user.uid, 'settings', 'prefs'), prefs)
}

// Bulk write for imports: batches of 400 (Firestore limit is 500 per batch)
export async function persistMany(user, docs, onProgress) {
  if (user.isGuest) {
    const shows = readLocal()
    for (const d of docs) shows[d.id] = d
    writeLocal(shows)
    if (onProgress) onProgress(docs.length, docs.length)
    return
  }
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db)
    for (const d of docs.slice(i, i + 400)) {
      batch.set(doc(db, 'users', user.uid, 'shows', String(d.id)), d)
    }
    await batch.commit()
    if (onProgress) onProgress(Math.min(i + 400, docs.length), docs.length)
  }
}

export async function deleteShow(user, showId) {
  if (user.isGuest) {
    const shows = readLocal()
    delete shows[showId]
    writeLocal(shows)
    return
  }
  await deleteDoc(doc(db, 'users', user.uid, 'shows', String(showId)))
}
