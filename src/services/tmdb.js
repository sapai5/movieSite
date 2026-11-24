const API_KEY = '2dca580c2a14b55200e784d157207b4d'
const BASE_URL = 'https://api.themoviedb.org/3'
const IMG_BASE = 'https://image.tmdb.org/t/p'

export const getImageUrl = (path, size = 'w500') => {
  if (!path) return 'https://via.placeholder.com/500x750?text=No+Image'
  return `${IMG_BASE}/${size}${path}`
}

export const getBackdropUrl = (path, size = 'original') => {
  if (!path) return null
  return `${IMG_BASE}/${size}${path}`
}

export const getStillUrl = (path, size = 'w300') => {
  if (!path) return 'https://via.placeholder.com/300x169?text=No+Preview'
  return `${IMG_BASE}/${size}${path}`
}

async function fetchTMDB(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`)
  url.searchParams.set('api_key', API_KEY)
  url.searchParams.set('language', 'en-US')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TMDB Error: ${res.status}`)
  return res.json()
}

export async function getStreamingTitles(provider, type, region) {
  return fetchTMDB(`/discover/${type}`, {
    with_watch_providers: provider, watch_region: region,
    with_watch_monetization_types: 'flatrate', sort_by: 'popularity.desc',
  })
}

// Movies
export async function getTrending() {
  return fetchTMDB('/trending/movie/week')
}

export async function getPopular(page = 1) {
  return fetchTMDB('/movie/popular', { page })
}

export async function getTopRated(page = 1) {
  return fetchTMDB('/movie/top_rated', { page })
}

export async function getNowPlaying(page = 1) {
  return fetchTMDB('/movie/now_playing', { page })
}

export async function getUpcoming(page = 1) {
  return fetchTMDB('/movie/upcoming', { page })
}

export async function getMoviesByGenre(genreId, page = 1) {
  return fetchTMDB('/discover/movie', {
    with_genres: genreId,
    sort_by: 'popularity.desc',
    page,
  })
}

export async function searchMovies(query, page = 1) {
  return fetchTMDB('/search/movie', { query, page })
}

export async function getMovieDetails(id) {
  return fetchTMDB(`/movie/${id}`, { append_to_response: 'credits,similar,videos' })
}

export async function getMovieRecommendations(id) {
  return fetchTMDB(`/movie/${id}/recommendations`)
}

// TV Shows
export async function getTrendingTV() {
  return fetchTMDB('/trending/tv/week')
}

export async function getPopularTV(page = 1) {
  return fetchTMDB('/tv/popular', { page })
}

export async function getTopRatedTV(page = 1) {
  return fetchTMDB('/tv/top_rated', { page })
}

export async function getOnTheAirTV(page = 1) {
  return fetchTMDB('/tv/on_the_air', { page })
}

export async function getTVByGenre(genreId, page = 1) {
  return fetchTMDB('/discover/tv', {
    with_genres: genreId,
    sort_by: 'popularity.desc',
    page,
  })
}

export async function getTVDetails(id) {
  return fetchTMDB(`/tv/${id}`, { append_to_response: 'credits,similar,videos' })
}

export async function getTVSeasonDetails(tvId, seasonNumber) {
  return fetchTMDB(`/tv/${tvId}/season/${seasonNumber}`)
}

export async function getTVRecommendations(id) {
  return fetchTMDB(`/tv/${id}/recommendations`)
}

// Global & International Trending
export async function getDailyGlobalTrending() {
  return fetchTMDB('/trending/all/day')
}

export async function getInternationalTrending(language = 'ko', page = 1) {
  if (language === 'all') {
    return fetchTMDB('/discover/movie', {
      sort_by: 'popularity.desc',
      'vote_count.gte': 100,
      page,
    })
  }
  return fetchTMDB('/discover/movie', {
    with_original_language: language,
    sort_by: 'popularity.desc',
    page,
  })
}

export async function getInternationalTV(language = 'ko', page = 1) {
  return fetchTMDB('/discover/tv', {
    with_original_language: language,
    sort_by: 'popularity.desc',
    page,
  })
}

// Multi Search (Movies & TV)
export async function searchMulti(query, page = 1) {
  return fetchTMDB('/search/multi', { query, page })
}

export const GENRE_IDS = {
  ACTION: 28,
  COMEDY: 35,
  HORROR: 27,
  ROMANCE: 10749,
  SCIFI: 878,
  THRILLER: 53,
  ANIMATION: 16,
  DOCUMENTARY: 99,
  DRAMA: 18,
}

export const TV_GENRE_IDS = {
  ACTION_ADVENTURE: 10759,
  ANIMATION: 16,
  COMEDY: 35,
  CRIME: 80,
  DOCUMENTARY: 99,
  DRAMA: 18,
  MYSTERY: 9648,
  SCIFI_FANTASY: 10765,
}
