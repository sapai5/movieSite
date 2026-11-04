import { useState, useEffect } from 'react'
import Hero from '../components/Hero'
import MovieRow from '../components/MovieRow'
import MovieModal from '../components/MovieModal'
import {
  getTrending,
  getTrendingTV,
  getPopular,
  getPopularTV,
  getTopRated,
  getNowPlaying,
  getMoviesByGenre,
  getTVByGenre,
  GENRE_IDS,
  TV_GENRE_IDS,
} from '../services/tmdb'

export default function Home() {
  const [hero, setHero] = useState(null)
  const [rows, setRows] = useState({})
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getTrending(),
      getTrendingTV(),
      getPopular(),
      getPopularTV(),
      getNowPlaying(),
      getTopRated(),
      getMoviesByGenre(GENRE_IDS.ACTION),
      getTVByGenre(TV_GENRE_IDS.SCIFI_FANTASY),
      getMoviesByGenre(GENRE_IDS.COMEDY),
      getTVByGenre(TV_GENRE_IDS.DRAMA),
      getMoviesByGenre(GENRE_IDS.HORROR),
      getMoviesByGenre(GENRE_IDS.SCIFI),
    ]).then(([trending, trendingTV, popular, popularTV, nowPlaying, topRated, action, scifiTV, comedy, dramaTV, horror, scifi]) => {
      const trendingMovies = (trending.results || []).map((m) => ({ ...m, media_type: 'movie' }))
      const trendingShows = (trendingTV.results || []).map((t) => ({ ...t, media_type: 'tv' }))

      // Pick a random highlight for hero
      const heroPool = [...trendingMovies.slice(0, 4), ...trendingShows.slice(0, 3)]
      if (heroPool.length > 0) {
        setHero(heroPool[Math.floor(Math.random() * heroPool.length)])
      }

      setRows({
        trendingMovies,
        trendingTV: trendingShows,
        popularMovies: (popular.results || []).map((m) => ({ ...m, media_type: 'movie' })),
        popularTV: (popularTV.results || []).map((t) => ({ ...t, media_type: 'tv' })),
        nowPlaying: (nowPlaying.results || []).map((m) => ({ ...m, media_type: 'movie' })),
        topRated: (topRated.results || []).map((m) => ({ ...m, media_type: 'movie' })),
        action: (action.results || []).map((m) => ({ ...m, media_type: 'movie' })),
        scifiTV: (scifiTV.results || []).map((t) => ({ ...t, media_type: 'tv' })),
        comedy: (comedy.results || []).map((m) => ({ ...m, media_type: 'movie' })),
        dramaTV: (dramaTV.results || []).map((t) => ({ ...t, media_type: 'tv' })),
        horror: (horror.results || []).map((m) => ({ ...m, media_type: 'movie' })),
        scifi: (scifi.results || []).map((m) => ({ ...m, media_type: 'movie' })),
      })
      setLoading(false)
    }).catch(console.error)
  }, [])

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <>
      <Hero movie={hero} onInfo={setSelected} />
      <MovieRow title="Trending Movies" movies={rows.trendingMovies} onSelect={setSelected} />
      <MovieRow title="Binge-Worthy TV Shows" movies={rows.trendingTV} onSelect={setSelected} />
      <MovieRow title="Popular In Theaters" movies={rows.popularMovies} onSelect={setSelected} />
      <MovieRow title="Top TV Series" movies={rows.popularTV} onSelect={setSelected} />
      <MovieRow title="Now Playing" movies={rows.nowPlaying} onSelect={setSelected} />
      <MovieRow title="Critically Acclaimed Movies" movies={rows.topRated} onSelect={setSelected} />
      <MovieRow title="Sci-Fi &amp; Fantasy TV" movies={rows.scifiTV} onSelect={setSelected} />
      <MovieRow title="Action Blockbusters" movies={rows.action} onSelect={setSelected} />
      <MovieRow title="Must-Watch TV Dramas" movies={rows.dramaTV} onSelect={setSelected} />
      <MovieRow title="Comedies" movies={rows.comedy} onSelect={setSelected} />
      <MovieRow title="Chilling Horror" movies={rows.horror} onSelect={setSelected} />
      <div className="footer">
        Powered by TMDB &amp; VidRift &bull; Movies &amp; TV Series
      </div>
      {selected && <MovieModal movie={selected} onClose={() => setSelected(null)} />}
    </>
  )
}