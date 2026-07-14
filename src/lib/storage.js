// Data layer: Firestore when signed in with Google, localStorage in guest mode.
// A saved show doc looks like:
// { id, name, image, status: 'watchlist'|'watching'|'finished',
//   rating: 0-5, watched: [episodeIds], totalEpisodes, premiered, network, genres, updatedAt }
import { db } from '../firebase'
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore'

const LOCAL_KEY = 'comet-shows'

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

export async function deleteShow(user, showId) {
  if (user.isGuest) {
    const shows = readLocal()
    delete shows[showId]
    writeLocal(shows)
    return
  }
  await deleteDoc(doc(db, 'users', user.uid, 'shows', String(showId)))
}
