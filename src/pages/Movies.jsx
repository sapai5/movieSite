import { useState, useEffect } from 'react'
import Hero from '../components/Hero'
import MovieRow from '../components/MovieRow'
import MovieModal from '../components/MovieModal'
import {
  getTrending,
  getPopular,
  getTopRated,
  getNowPlaying,
  getUpcoming,
  getMoviesByGenre,
  GENRE_IDS,
} from '../services/tmdb'

export default function Movies() {
  const [hero, setHero] = useState(null)
  const [rows, setRows] = useState({})
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getTrending(),
      getPopular(),
      getTopRated(),
      getNowPlaying(),
      getUpcoming(),
      getMoviesByGenre(GENRE_IDS.ACTION),
      getMoviesByGenre(GENRE_IDS.COMEDY),
      getMoviesByGenre(GENRE_IDS.HORROR),
      getMoviesByGenre(GENRE_IDS.SCIFI),
      getMoviesByGenre(GENRE_IDS.ANIMATION),
      getMoviesByGenre(GENRE_IDS.DOCUMENTARY),
    ]).then(([trending, popular, topRated, nowPlaying, upcoming, action, comedy, horror, scifi, animation, docs]) => {
      const tagMovie = (arr) => (arr || []).map((m) => ({ ...m, media_type: 'movie' }))
      const trendingMovies = tagMovie(trending.results)
      if (trendingMovies.length > 0) {
        setHero(trendingMovies[Math.floor(Math.random() * Math.min(5, trendingMovies.length))])
      }
      setRows({
        trending: trendingMovies,
        popular: tagMovie(popular.results),
        topRated: tagMovie(topRated.results),
        nowPlaying: tagMovie(nowPlaying.results),
        upcoming: tagMovie(upcoming.results),
        action: tagMovie(action.results),
        comedy: tagMovie(comedy.results),
        horror: tagMovie(horror.results),
        scifi: tagMovie(scifi.results),
        animation: tagMovie(animation.results),
        docs: tagMovie(docs.results),
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
      <MovieRow title="Trending Movies" movies={rows.trending} onSelect={setSelected} />
      <MovieRow title="Popular Movies" movies={rows.popular} onSelect={setSelected} />
      <MovieRow title="In Theaters Now" movies={rows.nowPlaying} onSelect={setSelected} />
      <MovieRow title="Top Rated Classics" movies={rows.topRated} onSelect={setSelected} />
      <MovieRow title="Upcoming Releases" movies={rows.upcoming} onSelect={setSelected} />
      <MovieRow title="Action Packed" movies={rows.action} onSelect={setSelected} />
      <MovieRow title="Laugh Out Loud Comedies" movies={rows.comedy} onSelect={setSelected} />
      <MovieRow title="Horror &amp; Thrillers" movies={rows.horror} onSelect={setSelected} />
      <MovieRow title="Sci-Fi Journeys" movies={rows.scifi} onSelect={setSelected} />
      <MovieRow title="Animated Adventures" movies={rows.animation} onSelect={setSelected} />
      <MovieRow title="Documentaries" movies={rows.docs} onSelect={setSelected} />
      <div className="footer">
        Powered by TMDB &amp; VidRift &bull; All Movies
      </div>
      {selected && <MovieModal movie={selected} onClose={() => setSelected(null)} />}
    </>
  )
}