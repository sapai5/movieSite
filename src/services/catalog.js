import * as tmdb from './tmdb'

const tagged = (loader, type) => async () => {
  const data = await loader()
  return (data.results || []).map((item) => ({ ...item, media_type: type }))
}
const row = (id, title, loader, type = 'movie') => ({ id, title, load: tagged(loader, type) })
const movieGenre = (id, title, genre) => row(id, title, () => tmdb.getMoviesByGenre(genre))
const tvGenre = (id, title, genre) => row(id, title, () => tmdb.getTVByGenre(genre), 'tv')
const G = tmdb.GENRE_IDS
const T = tmdb.TV_GENRE_IDS
export const movieShelves = [
  row('trending-movie', 'Trending Movies', tmdb.getTrending),
  row('popular-movie', 'Popular Movies', tmdb.getPopular),
  row('top-movie', 'Critically Acclaimed Movies', tmdb.getTopRated),
  row('now-movie', 'Now Playing', tmdb.getNowPlaying),
  row('upcoming-movie', 'Coming Soon', tmdb.getUpcoming),
  movieGenre('action-movie', 'Action Blockbusters', G.ACTION),
  movieGenre('comedy-movie', 'Comedies', G.COMEDY),
  movieGenre('horror-movie', 'Chilling Horror', G.HORROR),
  movieGenre('scifi-movie', 'Science Fiction', G.SCIFI),
  movieGenre('animation-movie', 'Animated Favorites', G.ANIMATION),
  movieGenre('documentary-movie', 'Documentaries', G.DOCUMENTARY),
]
export const tvShelves = [
  row('trending-tv', 'Binge-Worthy TV Shows', tmdb.getTrendingTV, 'tv'),
  row('popular-tv', 'Top TV Series', tmdb.getPopularTV, 'tv'),
  row('top-tv', 'Top Rated TV Shows', tmdb.getTopRatedTV, 'tv'),
  row('airing-tv', 'On the Air', tmdb.getOnTheAirTV, 'tv'),
  tvGenre('drama-tv', 'Must-Watch TV Dramas', T.DRAMA),
  tvGenre('scifi-tv', 'Sci-Fi & Fantasy TV', T.SCIFI_FANTASY),
  tvGenre('comedy-tv', 'TV Comedies', T.COMEDY),
  tvGenre('animation-tv', 'Animated Series', T.ANIMATION),
  tvGenre('crime-tv', 'Crime & Mystery', T.CRIME),
]
export const homeShelves = [movieShelves[0], tvShelves[0], movieShelves[1], tvShelves[1], movieShelves[3], movieShelves[2], tvShelves[5], movieShelves[5], tvShelves[4], movieShelves[6], movieShelves[7]]
export const PROVIDERS = [
  { id: 8, name: 'Netflix' }, { id: 9, name: 'Prime Video' },
  { id: 337, name: 'Disney+' }, { id: 1899, name: 'HBO Max' },
  { id: 350, name: 'Apple TV+' }, { id: 15, name: 'Hulu' },
]
export const REGIONS = [['US', 'United States'], ['GB', 'United Kingdom'], ['CA', 'Canada'], ['AU', 'Australia'], ['DE', 'Germany'], ['FR', 'France'], ['IN', 'India'], ['JP', 'Japan'], ['KR', 'South Korea'], ['ES', 'Spain']]
export function defaultRegion() {
  try {
    const saved = localStorage.getItem('movieplayer_streaming_region')
    if (REGIONS.some(([id]) => id === saved)) return saved
    const region = new Intl.Locale(navigator.language).maximize().region
    return REGIONS.some(([id]) => id === region) ? region : 'US'
  } catch { return 'US' }
}
export function streamingShelves(type, region) {
  return PROVIDERS.map((provider) => ({
    id: `provider:${provider.id}:${type}:${region}`,
    title: `${type === 'movie' ? 'Movies on' : type === 'tv' ? 'Shows on' : 'On'} ${provider.name}`,
    load: async () => {
      const types = type === 'all' ? ['movie', 'tv'] : [type]
      const lists = await Promise.all(types.map((media) => tagged(() => tmdb.getStreamingTitles(provider.id, media, region), media)()))
      return lists.flatMap((list, index) => list.map((item, position) => ({ item, order: position * lists.length + index })))
        .sort((a, b) => a.order - b.order).map(({ item }) => item)
    },
  }))
}
