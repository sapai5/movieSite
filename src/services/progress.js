import { getLibrary, libraryKey, setLibraryStatus } from './library.js';
const PROGRESS_KEY = 'movieplayer_playback_progress';
const DISMISSED_KEY = 'movieplayer_continue_dismissed';

function getDismissed() {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Hide a movie/show from Continue Watching without losing saved positions.
// It reappears automatically if you watch it again later.
export function dismissFromContinueWatching(id, type = 'movie') {
  const dismissed = getDismissed();
  dismissed[`${type}_${id}`] = new Date().toISOString();
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
  } catch (e) {
    console.warn(e);
  }
}

// Mark the given movie/episode as finished and hide it from the row.
export function markAsWatched(id, type = 'movie', season = 1, episode = 1) {
  const map = getAllProgress();
  const key = getProgressKey(id, type, season, episode);
  if (map[key]) {
    // A finished episode does not imply that the entire TV show was watched.
    if (type === 'movie') {
      try { setLibraryStatus(map[key], 'watched'); } catch { /* progress can still be saved */ }
    }
    map[key] = { ...map[key], finished: true, progressPercent: 100 };
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
    } catch (e) {
      console.warn(e);
    }
  }
  dismissFromContinueWatching(id, type);
}

export function getProgressKey(id, type, season = 1, episode = 1) {
  return type === 'tv' ? `tv_${id}_s${season}_e${episode}` : `movie_${id}`;
}

export function getAllProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePlaybackPosition({
  id,
  type = 'movie',
  title = '',
  poster_path = '',
  backdrop_path = '',
  currentTime = 0,
  duration = 0,
  season = 1,
  episode = 1,
  episodeName = ''
}) {
  if (!id) return;
  const map = getAllProgress();
  const key = getProgressKey(id, type, season, episode);

  const effectiveDuration = duration > 0 ? duration : (map[key]?.duration || 5400);
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentTime / effectiveDuration) * 100)));
  const finished = progressPercent >= 95;

  map[key] = {
    id: String(id),
    type,
    title,
    poster_path,
    backdrop_path,
    currentTime: Math.floor(currentTime),
    duration: Math.floor(effectiveDuration),
    progressPercent,
    season: Number(season),
    episode: Number(episode),
    episodeName,
    finished,
    lastWatched: new Date().toISOString()
  };

  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
    if (finished && type === 'movie' && getLibrary()[libraryKey(map[key])]?.status !== 'watched') {
      try { setLibraryStatus(map[key], 'watched'); } catch { /* preserve playback even if library storage fails */ }
    }
    window.dispatchEvent(new Event('movieplayer_progress_updated'));
  } catch (e) {
    console.warn('Failed to save progress to localStorage', e);
  }
}

export function getPlaybackPosition(id, type = 'movie', season = 1, episode = 1) {
  const map = getAllProgress();
  const key = getProgressKey(id, type, season, episode);
  return map[key] || null;
}

export function removePlaybackPosition(id, type = 'movie', season = 1, episode = 1) {
  const map = getAllProgress();
  const key = getProgressKey(id, type, season, episode);
  delete map[key];
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event('movieplayer_progress_updated'));
  } catch (e) {
    console.warn(e);
  }
}

export function getContinueWatchingList() {
  const map = getAllProgress();
  const dismissed = getDismissed();
  const library = getLibrary();
  const items = Object.values(map).filter(item => {
    if (library[libraryKey(item)]?.status === 'watched') return false;
    if (item.finished || item.currentTime <= 20) return false;
    const hiddenAt = dismissed[`${item.type}_${item.id}`];
    // Hidden unless watched again after it was dismissed
    return !hiddenAt || new Date(item.lastWatched) > new Date(hiddenAt);
  });

  // Group by show/movie ID to only show latest episode for TV shows
  const grouped = new Map();
  items.forEach(item => {
    const groupKey = `${item.type}_${item.id}`;
    const existing = grouped.get(groupKey);
    if (!existing || new Date(item.lastWatched) > new Date(existing.lastWatched)) {
      grouped.set(groupKey, item);
    }
  });

  return Array.from(grouped.values()).sort(
    (a, b) => new Date(b.lastWatched) - new Date(a.lastWatched)
  );
}

// Clear every saved position for one movie or show (all episodes).
export function removeTitleProgress(id, type = 'movie') {
  const map = getAllProgress();
  Object.keys(map).forEach((key) => {
    if (map[key]?.type === type && String(map[key].id) === String(id)) delete map[key];
  });
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event('movieplayer_progress_updated'));
  } catch (e) {
    console.warn(e);
  }
}

// Everything started but not finished, for the Library's "In progress" tab.
// Unlike Continue Watching it ignores "hide from row", so nothing in progress is
// ever out of reach. One entry per title (the most recent episode for shows).
export function getInProgressList() {
  const library = getLibrary();
  const grouped = new Map();
  Object.values(getAllProgress()).forEach((item) => {
    if (!item?.id || item.finished || item.currentTime <= 20) return;
    if (item.type === 'movie' && library[libraryKey(item)]?.status === 'watched') return;
    const key = `${item.type}_${item.id}`;
    const existing = grouped.get(key);
    if (!existing || new Date(item.lastWatched) > new Date(existing.lastWatched)) grouped.set(key, item);
  });
  return Array.from(grouped.values()).sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched));
}

export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const sec = Math.floor(seconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function formatRemaining(currentTime, duration) {
  if (!duration || duration <= currentTime) return '';
  const rem = Math.max(0, duration - currentTime);
  const mins = Math.round(rem / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m left`;
  }
  return `${mins}m left`;
}
