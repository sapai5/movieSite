import { useState, useEffect } from 'react'
import Hero from '../components/Hero'
import MovieRow from '../components/MovieRow'
import MovieModal from '../components/MovieModal'
import {
  getTrendingTV,
  getPopularTV,
  getTopRatedTV,
  getOnTheAirTV,
  getTVByGenre,
  TV_GENRE_IDS,
} from '../services/tmdb'

export default function TVShows() {
  const [hero, setHero] = useState(null)
  const [rows, setRows] = useState({})
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getTrendingTV(),
      getPopularTV(),
      getTopRatedTV(),
      getOnTheAirTV(),
      getTVByGenre(TV_GENRE_IDS.DRAMA),
      getTVByGenre(TV_GENRE_IDS.SCIFI_FANTASY),
      getTVByGenre(TV_GENRE_IDS.COMEDY),
      getTVByGenre(TV_GENRE_IDS.ANIMATION),
      getTVByGenre(TV_GENRE_IDS.CRIME),
    ])
      .then(([trending, popular, topRated, onAir, drama, scifi, comedy, animation, crime]) => {
        const trendingShows = (trending.results || []).map((t) => ({ ...t, media_type: 'tv' }))
        if (trendingShows.length > 0) {
          setHero(trendingShows[Math.floor(Math.random() * Math.min(5, trendingShows.length))])
        }

        const tagTV = (arr) => (arr || []).map((item) => ({ ...item, media_type: 'tv' }))

        setRows({
          trending: trendingShows,
          popular: tagTV(popular.results),
          topRated: tagTV(topRated.results),
          onAir: tagTV(onAir.results),
          drama: tagTV(drama.results),
          scifi: tagTV(scifi.results),
          comedy: tagTV(comedy.results),
          animation: tagTV(animation.results),
          crime: tagTV(crime.results),
        })
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
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
      <MovieRow title="Trending TV Shows" movies={rows.trending} onSelect={setSelected} />
      <MovieRow title="Popular TV Series" movies={rows.popular} onSelect={setSelected} />
      <MovieRow title="Critically Acclaimed Shows" movies={rows.topRated} onSelect={setSelected} />
      <MovieRow title="Currently Airing" movies={rows.onAir} onSelect={setSelected} />
      <MovieRow title="Sci-Fi &amp; Fantasy Series" movies={rows.scifi} onSelect={setSelected} />
      <MovieRow title="Engrossing Dramas" movies={rows.drama} onSelect={setSelected} />
      <MovieRow title="Comedy Series" movies={rows.comedy} onSelect={setSelected} />
      <MovieRow title="Crime &amp; Mystery" movies={rows.crime} onSelect={setSelected} />
      <MovieRow title="Animated Series" movies={rows.animation} onSelect={setSelected} />
      <div className="footer">
        Powered by TMDB &amp; VidRift &bull; TV &amp; Movies Experience
      </div>
      {selected && <MovieModal movie={selected} onClose={() => setSelected(null)} />}
    </>
  )
}