const KEY = 'movieplayer_library_v1'
export const LIBRARY_EVENT = 'movieplayer_library_updated'

export function mediaType(item) {
  return item.media_type || item.type || (item.first_air_date && !item.release_date ? 'tv' : 'movie')
}

export function libraryKey(item) {
  return `${mediaType(item)}:${item.id}`
}

export function getLibrary() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '{}')
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
    return Object.fromEntries(Object.entries(data).filter(([, item]) => item?.id && ['watchlist', 'watched'].includes(item.status)))
  } catch { return {} }
}

export function setLibraryStatus(item, status) {
  if (!item?.id) return
  const library = getLibrary()
  const key = libraryKey(item)
  if (status) {
    library[key] = {
      id: item.id,
      media_type: mediaType(item),
      title: item.title || item.name || 'Untitled',
      poster_path: item.poster_path || '',
      backdrop_path: item.backdrop_path || '',
      release_date: item.release_date || item.first_air_date || '',
      vote_average: item.vote_average || 0,
      overview: item.overview || '',
      status,
      updatedAt: Date.now(),
    }
  } else delete library[key]
  // Let the caller show a useful error if storage is full or disabled.
  localStorage.setItem(KEY, JSON.stringify(library))
  window.dispatchEvent(new Event(LIBRARY_EVENT))
}

export function subscribeLibrary(callback) {
  const onStorage = (event) => { if (!event.key || event.key === KEY) callback() }
  window.addEventListener(LIBRARY_EVENT, callback)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(LIBRARY_EVENT, callback)
    window.removeEventListener('storage', onStorage)
  }
}
