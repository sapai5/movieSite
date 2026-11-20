import {
  getMovieRecommendations,
  getTVRecommendations,
  getMoviesByGenre,
  getTopRated,
  getDailyGlobalTrending,
  getInternationalTrending,
} from './tmdb'
import { getInteractionHistory, getTopGenres, getLastInteraction } from './history'

export async function fetchPersonalizedContent() {
  const history = getInteractionHistory();
  const lastItem = getLastInteraction();
  const topGenreIds = getTopGenres(2);

  // Scenario 1: User has viewed/clicked titles
  if (lastItem) {
    try {
      const recFetcher = lastItem.type === 'tv' ? getTVRecommendations : getMovieRecommendations;
      const data = await recFetcher(lastItem.id);
      let results = (data.results || []).map(r => ({
        ...r,
        media_type: r.media_type || lastItem.type
      }));

      // Filter out items already viewed
      const viewedIds = new Set(history.map(h => String(h.id)));
      results = results.filter(r => !viewedIds.has(String(r.id)));

      if (results.length >= 4) {
        return {
          title: `Because You Watched "${lastItem.title}"`,
          subheading: 'Tailored from your recent viewing habits',
          movies: results,
          basedOn: lastItem
        };
      }
    } catch (e) {
      console.warn('Failed to fetch direct recommendations, falling back to genres', e);
    }
  }

  // Scenario 2: User has genre affinities
  if (topGenreIds.length > 0) {
    try {
      const data = await getMoviesByGenre(topGenreIds[0]);
      let results = (data.results || []).map(r => ({ ...r, media_type: 'movie' }));
      const viewedIds = new Set(history.map(h => String(h.id)));
      results = results.filter(r => !viewedIds.has(String(r.id)));

      if (results.length > 0) {
        return {
          title: 'Top Picks For You',
          subheading: 'Curated based on genres you explore most',
          movies: results
        };
      }
    } catch (e) {}
  }

  // Scenario 3: Brand new user - recommend critically acclaimed essentials
  try {
    const topRated = await getTopRated();
    return {
      title: 'Recommended For You',
      subheading: 'Highest-rated crowd favorites to get you started',
      movies: (topRated.results || []).map(r => ({ ...r, media_type: 'movie' }))
    };
  } catch {
    return {
      title: 'Recommended For You',
      subheading: 'Popular selections',
      movies: []
    };
  }
}

export async function fetchGlobalTop10() {
  try {
    const data = await getDailyGlobalTrending();
    const items = (data.results || [])
      .filter(i => (i.media_type === 'movie' || i.media_type === 'tv') && i.poster_path)
      .slice(0, 10);
    return items;
  } catch (err) {
    console.error('Failed to fetch global top 10', err);
    return [];
  }
}

export async function fetchInternationalHits(language = 'us') {
  try {
    const data = await getInternationalTrending(language);
    return (data.results || []).map(m => ({ ...m, media_type: 'movie' }));
  } catch (err) {
    console.error('Failed to fetch international hits', err);
    return [];
  }
}