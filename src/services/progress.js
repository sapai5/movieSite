const PROGRESS_KEY = 'movieplayer_playback_progress';

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
  } catch (e) {
    console.warn(e);
  }
}

export function getContinueWatchingList() {
  const map = getAllProgress();
  const items = Object.values(map).filter(item => !item.finished && item.currentTime > 20);

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