// Export/import of everything this browser remembers about the viewer:
// playback positions, Continue Watching dismissals and the library.
// Import merges with what is already saved: for each entry the newer copy wins,
// so importing an old backup never erases newer progress.
import { getAllProgress } from './progress.js'
import { getLibrary, LIBRARY_EVENT } from './library.js'

const PROGRESS_KEY = 'movieplayer_playback_progress'
const DISMISSED_KEY = 'movieplayer_continue_dismissed'
const LIBRARY_KEY = 'movieplayer_library_v1'
const FORMAT = 'movieplayer-progress'
const VERSION = 1
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const readObject = (key) => {
  try { const value = JSON.parse(localStorage.getItem(key) || '{}'); return isObject(value) ? value : {} } catch { return {} }
}
const time = (value) => { const t = new Date(value).getTime(); return Number.isFinite(t) ? t : 0 }
const text = (value, max = 500) => (typeof value === 'string' ? value.slice(0, max) : '')
const num = (value, min, max) => (typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : null)
const validId = (value) => (typeof value === 'string' || typeof value === 'number') && /^\d{1,12}$/.test(String(value))

export function buildBackup() {
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    progress: getAllProgress(),
    continueDismissed: readObject(DISMISSED_KEY),
    library: getLibrary(),
  }
}

export function downloadBackup() {
  const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `movieplayer-progress-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Rebuilds each entry from known fields only, so a hand-edited or hostile file
// can't smuggle unexpected data (e.g. script URLs) into storage.
function cleanProgress(entry) {
  if (!isObject(entry) || !validId(entry.id) || !['movie', 'tv'].includes(entry.type)) return null
  const currentTime = num(entry.currentTime, 0, 604800)
  if (currentTime === null) return null
  const season = entry.type === 'tv' ? num(entry.season, 0, 1000) ?? 1 : 1
  const episode = entry.type === 'tv' ? num(entry.episode, 0, 10000) ?? 1 : 1
  const duration = num(entry.duration, 1, 604800) ?? 5400
  return {
    key: entry.type === 'tv' ? `tv_${entry.id}_s${season}_e${episode}` : `movie_${entry.id}`,
    value: {
      id: String(entry.id), type: entry.type, title: text(entry.title, 300),
      poster_path: text(entry.poster_path, 200), backdrop_path: text(entry.backdrop_path, 200),
      currentTime: Math.floor(currentTime), duration: Math.floor(duration),
      progressPercent: num(entry.progressPercent, 0, 100) ?? Math.min(100, Math.round((currentTime / duration) * 100)),
      season, episode, episodeName: text(entry.episodeName, 300), finished: entry.finished === true,
      lastWatched: time(entry.lastWatched) ? new Date(entry.lastWatched).toISOString() : new Date(0).toISOString(),
    },
  }
}

function cleanLibrary(entry) {
  if (!isObject(entry) || !validId(entry.id) || !['movie', 'tv'].includes(entry.media_type) || !['watchlist', 'watched'].includes(entry.status)) return null
  return {
    key: `${entry.media_type}:${entry.id}`,
    value: {
      id: Number(entry.id), media_type: entry.media_type, title: text(entry.title, 300) || 'Untitled',
      poster_path: text(entry.poster_path, 200), backdrop_path: text(entry.backdrop_path, 200),
      release_date: text(entry.release_date, 20), vote_average: num(entry.vote_average, 0, 10) ?? 0,
      overview: text(entry.overview, 2000), status: entry.status, updatedAt: num(entry.updatedAt, 0, 8.64e15) ?? 0,
    },
  }
}

// Returns counts of what was added or updated; throws Error with a readable message.
export function importBackup(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_IMPORT_BYTES) throw new Error('That file is too large to be a progress backup.')
  let data
  try { data = JSON.parse(raw) } catch { throw new Error("That file isn't valid JSON.") }
  if (!isObject(data) || data.format !== FORMAT) throw new Error("That file isn't a MoviePlayer progress backup.")
  if (typeof data.version !== 'number' || data.version > VERSION) throw new Error('This backup was made by a newer version of the site.')

  const progress = getAllProgress()
  let progressCount = 0
  for (const entry of Object.values(isObject(data.progress) ? data.progress : {})) {
    const clean = cleanProgress(entry)
    if (!clean) continue
    const existing = progress[clean.key]
    if (!existing || time(clean.value.lastWatched) > time(existing.lastWatched)) { progress[clean.key] = clean.value; progressCount += 1 }
  }

  const dismissed = readObject(DISMISSED_KEY)
  for (const [key, value] of Object.entries(isObject(data.continueDismissed) ? data.continueDismissed : {})) {
    if (/^(movie|tv)_\d{1,12}$/.test(key) && time(value) && time(value) > time(dismissed[key])) dismissed[key] = new Date(value).toISOString()
  }

  const library = getLibrary()
  let libraryCount = 0
  for (const entry of Object.values(isObject(data.library) ? data.library : {})) {
    const clean = cleanLibrary(entry)
    if (!clean) continue
    const existing = library[clean.key]
    if (!existing || clean.value.updatedAt > (existing.updatedAt || 0)) { library[clean.key] = clean.value; libraryCount += 1 }
  }

  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed))
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library))
  } catch {
    throw new Error("Your browser's storage is full or disabled, so the backup couldn't be saved.")
  }
  window.dispatchEvent(new Event('movieplayer_progress_updated'))
  window.dispatchEvent(new Event(LIBRARY_EVENT))
  return { progress: progressCount, library: libraryCount }
}
