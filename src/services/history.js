const HISTORY_KEY = 'movieplayer_view_history';
const GENRES_WEIGHT_KEY = 'movieplayer_genre_weights';

export function recordInteraction(item) {
  if (!item || !item.id) return;
  const isTV = item.media_type === 'tv' || Boolean(item.first_air_date && !item.release_date);
  const title = item.title || item.name || 'Untitled';

  const entry = {
    id: String(item.id),
    type: isTV ? 'tv' : 'movie',
    title,
    poster_path: item.poster_path || '',
    backdrop_path: item.backdrop_path || '',
    genre_ids: item.genre_ids || (item.genres ? item.genres.map(g => g.id) : []),
    timestamp: Date.now()
  };

  // 1. Update history list (keep last 30 distinct items)
  try {
    let history = [];
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) history = JSON.parse(raw);

    // Remove existing if duplicate, then prepend
    history = history.filter(h => !(h.id === entry.id && h.type === entry.type));
    history.unshift(entry);
    if (history.length > 30) history = history.slice(0, 30);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    // 2. Update genre affinity weights
    if (entry.genre_ids && entry.genre_ids.length > 0) {
      let weights = {};
      const rawWeights = localStorage.getItem(GENRES_WEIGHT_KEY);
      if (rawWeights) weights = JSON.parse(rawWeights);

      entry.genre_ids.forEach(gid => {
        weights[gid] = (weights[gid] || 0) + 1;
      });
      localStorage.setItem(GENRES_WEIGHT_KEY, JSON.stringify(weights));
    }

    // Dispatch event so active components update dynamically
    window.dispatchEvent(new CustomEvent('movieplayer_taste_updated', { detail: entry }));
  } catch (err) {
    console.warn('Failed to record interaction', err);
  }
}

export function getInteractionHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getTopGenres(limit = 3) {
  try {
    const raw = localStorage.getItem(GENRES_WEIGHT_KEY);
    if (!raw) return [];
    const weights = JSON.parse(raw);
    return Object.entries(weights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(entry => Number(entry[0]));
  } catch {
    return [];
  }
}

export function getLastInteraction() {
  const list = getInteractionHistory();
  return list.length > 0 ? list[0] : null;
}