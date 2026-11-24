import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  FiSettings,
  FiChevronLeft,
  FiChevronRight,
  FiPlay,
  FiRotateCcw,
  FiClock,
  FiMaximize2,
  FiX,
  FiShield,
} from 'react-icons/fi'
import { FaStar } from 'react-icons/fa'
import { getMovieDetails, getTVDetails, getTVSeasonDetails, getStillUrl } from '../services/tmdb'
import { getPlaybackPosition, savePlaybackPosition, formatTime } from '../services/progress'
import LibraryActions from '../components/LibraryActions'
import ProtectionPanel from '../components/ProtectionPanel'
import PlayerSettings from '../components/PlayerSettings'
import { playerSandbox, playerMessage, PLAYER_PERMISSIONS } from '../services/protection'

// Sandboxing lives in services/protection.js. Every playback starts in Strict
// mode (no popups, top navigation, downloads, forms or modals). Compatibility is
// an explicit per-playback opt-out chosen in the Protection panel:
// - VidLink shows "Please Disable Sandbox" inside any sandbox, so compatibility removes it.
// - VidRift probes window.open() on the first click, so compatibility adds allow-popups.
// seek: 'message' = accepts a postMessage seek, 'url' = only via ?startAt= (reload).
const VIDLINK_OPTS = 'primaryColor=e50914&secondaryColor=a2a2a2&iconColor=ffffff&autoplay=true&nextbutton=true'
const withStart = (url, start) => (start > 0 ? `${url}&startAt=${Math.floor(start)}` : url)
// When VidLink has no stream for a title it navigates its frame to fallback_url.
// We point that at our own page so the Watch page can spot it and switch servers.
const MISSING_PAGE = '/vidlink-missing.html'
const vidlinkFallback = () => `&fallback_url=${encodeURIComponent(window.location.origin + MISSING_PAGE)}`

// The first server is the default. VidRift plays under Strict protection.
// There is no manual server picker: VidLink is offered only when VidRift reports
// that every source failed, and since it refuses any sandbox, accepting that
// offer is the viewer's explicit choice of Compatibility for that playback.
// VidRift source ids for anime: English dub and the original audio with subtitles.
const SUBTITLE_AUTO_KEY = 'movieplayer_subtitle_auto_size'
const DUB_SOURCE = 'animedub'
const SUB_SOURCE = 'anime'

const SERVERS = [
  {
    id: 'vidrift',
    name: 'VidRift (Primary)',
    seek: 'message',
    getMovieUrl: (id, dub) => `https://embed.vidrift.net/embed/movie/${id}?dub=${dub ? '1' : '0'}`,
    getTvUrl: (id, s, e, dub) => `https://embed.vidrift.net/embed/tv/${id}/${s}/${e}?dub=${dub ? '1' : '0'}`,
  },
  {
    id: 'vidlink',
    name: 'VidLink (Backup)',
    seek: 'url',
    getMovieUrl: (id, dub, start) => withStart(`https://vidlink.pro/movie/${id}?${VIDLINK_OPTS}${vidlinkFallback()}`, start),
    getTvUrl: (id, s, e, dub, start) => withStart(`https://vidlink.pro/tv/${id}/${s}/${e}?${VIDLINK_OPTS}${vidlinkFallback()}`, start),
  },
]

export default function Watch({ params, docked, onExpand, onClose }) {
  const navigate = useNavigate()
  const iframeRef = useRef(null)

  const isTVRoute = params.type === 'tv'
  const mediaId = params.id
  const currentSeason = params.season ? Number(params.season) : 1
  const currentEpisode = params.episode ? Number(params.episode) : 1

  const [details, setDetails] = useState(null)
  const [detailsError, setDetailsError] = useState(false)
  const [seasonData, setSeasonData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [englishDefault, setEnglishDefault] = useState(true)
  const [selectedServer, setSelectedServer] = useState(SERVERS[0].id)

  // Playback Progress & Resume state
  const [resumePrompt, setResumePrompt] = useState(null)
  // Only true once the player says it is playing; guessing "playing" saved fake progress
  const [isPlaying, setIsPlaying] = useState(false)
  const lastRealTimeAtRef = useRef(0)
  const secondsRef = useRef(0)
  const durationRef = useRef(5400)

  // Ad-hijack guard: the sandbox stops ads from redirecting this page, so ad
  // scripts navigate the player frame itself instead. The player only loads
  // once; any later load of the frame is an ad taking it over, so put the
  // player back (and seek to where we were).
  const [playerNonce, setPlayerNonce] = useState(0)
  const frameLoadsRef = useRef(0)
  const frameCreatedAtRef = useRef(Date.now())
  const restoreTimesRef = useRef([])
  const seekAfterRestoreRef = useRef(0)
  const [notice, setNotice] = useState('')
  const noticeTimerRef = useRef(null)
  const showNotice = useCallback((text, ms = 3000) => {
    clearTimeout(noticeTimerRef.current)
    setNotice(text)
    noticeTimerRef.current = setTimeout(() => setNotice(''), ms)
  }, [])
  // True when we moved off a server automatically, so the next title tries the default again
  const autoSwitchedRef = useRef(false)
  // VidRift reported that none of its sources has this title
  const [unavailable, setUnavailable] = useState(false)
  // VidRift's latest source list: { list: [{ value, state }], current }
  const [sources, setSources] = useState(null)
  // VidRift's full player state (vidrift:state), which our settings panel is drawn from
  const [playerState, setPlayerState] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsNotice, setSettingsNotice] = useState('')

  // Servers without a seek message (VidLink) start at this time; changing it reloads the player
  const [startAt, setStartAt] = useState(0)

  // 1. Fetch metadata
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setDetailsError(false)
    setDetails(null)
    const fetchFn = isTVRoute ? getTVDetails : getMovieDetails
    fetchFn(mediaId)
      .then((data) => {
        if (cancelled) return
        setDetails(data)
        const dur = (data.runtime ? data.runtime * 60 : 5400)
        durationRef.current = dur
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error(err)
        setDetailsError(true)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [mediaId, isTVRoute])

  // 2. Fetch TV season if applicable
  useEffect(() => {
    let cancelled = false
    setSeasonData(null)
    if (isTVRoute && mediaId) {
      getTVSeasonDetails(mediaId, currentSeason)
        .then((data) => {
          if (cancelled) return
          setSeasonData(data)
          const ep = data?.episodes?.find((e) => e.episode_number === currentEpisode)
          if (ep?.runtime) {
            const epDur = ep.runtime * 60
            durationRef.current = epDur
          }
        })
        .catch(console.error)
    }
    return () => { cancelled = true }
  }, [isTVRoute, mediaId, currentSeason, currentEpisode])

  // 3. Check for saved playback position on mount or episode change
  useEffect(() => {
    setStartAt(0)
    setIsPlaying(false)
    lastRealTimeAtRef.current = 0
    if (autoSwitchedRef.current) {
      autoSwitchedRef.current = false
      setSelectedServer(SERVERS[0].id)
    }
    const saved = getPlaybackPosition(mediaId, isTVRoute ? 'tv' : 'movie', currentSeason, currentEpisode)
    if (saved && saved.currentTime > 20 && !saved.finished) {
      setResumePrompt({
        time: saved.currentTime,
        formatted: formatTime(saved.currentTime)
      })
      secondsRef.current = saved.currentTime
    } else {
      setResumePrompt(null)
      secondsRef.current = 0
    }
  }, [mediaId, isTVRoute, currentSeason, currentEpisode])

  // Helper to persist current position
  const persistProgress = useCallback((sec) => {
    if (!details || sec <= 10) return
    const title = details.title || details.name || 'Untitled'
    const epData = seasonData?.episodes?.find((e) => e.episode_number === currentEpisode)

    savePlaybackPosition({
      id: mediaId,
      type: isTVRoute ? 'tv' : 'movie',
      title,
      poster_path: details.poster_path,
      backdrop_path: details.backdrop_path,
      currentTime: sec,
      duration: durationRef.current,
      season: currentSeason,
      episode: currentEpisode,
      episodeName: epData?.name || `Episode ${currentEpisode}`
    })
  }, [details, mediaId, isTVRoute, currentSeason, currentEpisode, seasonData])

  // 4. Listen to postMessage events from iframe
  useEffect(() => {
    const handleMessage = (e) => {
      // Accepts only well-formed events from the active provider's own frame.
      const msg = playerMessage(e, iframeRef.current, selectedServer)
      if (!msg) return
      if (msg.sources) {
        setSources({ list: msg.sources, current: msg.current })
        if (msg.unavailable) setUnavailable(true)
        return
      }
      if (msg.state) {
        setPlayerState(msg.state)
        if (msg.state.servers.length) setSources({ list: msg.state.servers, current: msg.state.server })
        return
      }
      if (msg.commandError) {
        // VidRift ignores commands from a sandboxing host until the viewer has
        // clicked inside the player once (its popup check needs that click).
        setSettingsNotice(msg.commandError.reason === 'click-required'
          ? 'Tap the video once, then try that setting again.'
          : "That setting isn't available for this title.")
        return
      }
      if (msg.progress && msg.time > 0) {
        secondsRef.current = Math.floor(msg.time)
        lastRealTimeAtRef.current = Date.now()
        setIsPlaying(true)
      }
      if (msg.progress && msg.duration) {
        durationRef.current = Math.floor(msg.duration)
      }
      if (msg.playing) setIsPlaying(true)
      else if (msg.paused) setIsPlaying(false)
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [selectedServer])

  // 5. Automatic Heartbeat Progress Saver (tracks elapsed time and auto-saves)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPlaying) return
      // The player is reporting real times: just save them
      if (Date.now() - lastRealTimeAtRef.current < 10000) {
        persistProgress(secondsRef.current)
        return
      }
      // Player said "play" but sends no times: estimate
      if (secondsRef.current < durationRef.current) {
        secondsRef.current += 3
        persistProgress(secondsRef.current)
      }
    }, 3000)

    return () => {
      clearInterval(interval)
    }
  }, [isPlaying, persistProgress])

  // Commands to VidRift's parent control API (vidrift:set / get-state / resume)
  const sendToPlayer = useCallback((message) => {
    if (selectedServer !== 'vidrift') return
    try { iframeRef.current?.contentWindow?.postMessage(message, 'https://embed.vidrift.net') } catch { /* frame gone */ }
  }, [selectedServer])

  // Settings change: update the panel right away, then tell the player. The
  // player answers with a fresh vidrift:state (or vidrift:command-error).
  const applySetting = useCallback((patch) => {
    setSettingsNotice('')
    setPlayerState((current) => current && ({
      ...current,
      ...patch,
      subtitleStyle: patch.subtitleStyle ? { ...current.subtitleStyle, ...patch.subtitleStyle } : current.subtitleStyle,
    }))
    sendToPlayer({ type: 'vidrift:set', ...patch })
  }, [sendToPlayer])

  // Auto subtitle size. VidRift draws captions at a fixed 17px × size%, whatever
  // the video's size, so on a phone's ~220px-tall player they cover too much.
  // Auto targets ~6.5% of the video height on touch screens (60–100% inline, up
  // to 150% fullscreen) and 100% on desktop. Moving the size slider turns it off.
  const playerBoxRef = useRef(null)
  const [subtitleAuto, setSubtitleAuto] = useState(() => {
    try { return localStorage.getItem(SUBTITLE_AUTO_KEY) !== 'off' } catch { return true }
  })
  const [autoSize, setAutoSize] = useState(100)
  useEffect(() => {
    const box = playerBoxRef.current
    if (!box) return
    const measure = () => {
      const fullscreen = document.fullscreenElement === iframeRef.current
      const touch = window.matchMedia('(pointer: coarse)').matches
      const { width, height } = fullscreen ? { width: window.innerWidth, height: window.innerHeight } : box.getBoundingClientRect()
      if (!height) return
      if (!touch && width > 768) return setAutoSize(100)
      const percent = Math.round((height * 0.065) / 17 * 10) * 10
      setAutoSize(Math.max(60, Math.min(fullscreen ? 150 : 100, percent)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    document.addEventListener('fullscreenchange', measure)
    return () => { observer.disconnect(); document.removeEventListener('fullscreenchange', measure) }
  }, [])
  useEffect(() => {
    const current = playerState?.subtitleStyle?.size
    if (!subtitleAuto || current == null || current === autoSize) return
    applySetting({ subtitleStyle: { size: autoSize } })
  }, [subtitleAuto, autoSize, playerState?.subtitleStyle?.size, applySetting])
  const chooseSubtitleAuto = (on) => {
    setSubtitleAuto(on)
    try { localStorage.setItem(SUBTITLE_AUTO_KEY, on ? 'on' : 'off') } catch { /* session only */ }
  }
  // Settings from the panel: a manual size switches auto sizing off.
  const applyPanelSetting = (patch) => {
    if (patch.subtitleStyle && 'size' in patch.subtitleStyle) chooseSubtitleAuto(false)
    applySetting(patch)
  }

  const currentServerObj = SERVERS.find((s) => s.id === selectedServer) || SERVERS[0]

  // Compatibility is remembered only for the exact playback it was chosen for,
  // so a new title, episode or server always starts in Strict mode.
  const keyFor = (server) => `${isTVRoute ? 'tv' : 'movie'}:${mediaId}:${currentSeason}:${currentEpisode}:${server}`
  const playbackKey = keyFor(selectedServer)
  const [compatibilityFor, setCompatibilityFor] = useState(null)

  // Explicit opt-in from the "not available" prompt: VidLink with Compatibility
  // for this playback only (it shows "Please Disable Sandbox" otherwise).
  const tryBackupServer = () => {
    autoSwitchedRef.current = true
    setStartAt(secondsRef.current)
    setCompatibilityFor(keyFor('vidlink'))
    setSelectedServer('vidlink')
  }
  const strict = compatibilityFor !== playbackKey
  const [protectionOpen, setProtectionOpen] = useState(false)
  const [navigationStopped, setNavigationStopped] = useState(false)

  // Jump the player to a time: by message where supported, otherwise reload at ?startAt=
  const seekPlayer = useCallback((time) => {
    if (currentServerObj.seek === 'message') {
      try {
        iframeRef.current?.contentWindow?.postMessage({ type: 'vidrift:resume', currentTime: time }, 'https://embed.vidrift.net')
      } catch { /* ignore */ }
      return
    }
    setStartAt(time)
    setPlayerNonce((n) => n + 1)
  }, [currentServerObj])

  useEffect(() => () => clearTimeout(noticeTimerRef.current), [])

  const handleIframeLoad = () => {
    // VidLink had nothing for this title and opened our fallback page
    // (same-origin, so its location is readable). Switch to the backup server.
    let framePath = ''
    try { framePath = iframeRef.current?.contentWindow?.location?.pathname || '' } catch { /* cross-origin */ }
    if (framePath === MISSING_PAGE) {
      // Already came here because VidRift had nothing: don't bounce back.
      if (autoSwitchedRef.current) {
        showNotice("This title isn't available on any server right now.", 6000)
        return
      }
      const backup = SERVERS.find((s) => s.id !== selectedServer)
      if (backup) {
        autoSwitchedRef.current = true
        setStartAt(secondsRef.current)
        setSelectedServer(backup.id)
        showNotice(`Not available on ${currentServerObj.name.split(' ')[0]}, switched to ${backup.name.split(' ')[0]}`, 4000)
      }
      return
    }

    frameLoadsRef.current += 1
    const sinceCreated = Date.now() - frameCreatedAtRef.current

    // A second load well after start-up means the frame was navigated away
    // from the player (ad hijack). Quick start-up redirects are allowed.
    if (frameLoadsRef.current > 1 && sinceCreated > 5000) {
      const now = Date.now()
      restoreTimesRef.current = restoreTimesRef.current.filter((t) => now - t < 60000)
      // Stop condition: if something keeps navigating the frame, stop reloading
      // it (a reload loop is worse than the ad) and tell the viewer what to do.
      if (restoreTimesRef.current.length >= 5) {
        setNavigationStopped(true)
        return
      }
      restoreTimesRef.current.push(now)
      seekAfterRestoreRef.current = secondsRef.current
      persistProgress(secondsRef.current)
      setResumePrompt(null)
      showNotice('Blocked an ad, restoring your player…')
      if (currentServerObj.seek === 'url') {
        seekAfterRestoreRef.current = 0
        setStartAt(secondsRef.current)
      }
      setPlayerNonce((n) => n + 1)
      return
    }

    if (selectedServer === 'vidrift') {
      // Ask for the player's state (it keeps sending updates after this). Repeat a
      // couple of times in case its listener isn't ready the moment the page loads.
      const askState = () => sendToPlayer({ type: 'vidrift:get-state' })
      askState()
      setTimeout(askState, 1500)
      setTimeout(askState, 4000)

      // Restored after an ad hijack: jump back to where we were
      const seekTo = seekAfterRestoreRef.current
      if (seekTo > 0 && frameLoadsRef.current === 1) {
        seekAfterRestoreRef.current = 0
        const seek = () => {
          try {
            iframeRef.current?.contentWindow?.postMessage({ type: 'vidrift:resume', currentTime: seekTo }, 'https://embed.vidrift.net')
          } catch { /* ignore */ }
        }
        setTimeout(seek, 1500)
        setTimeout(seek, 3500)
      }
    }
  }

  // Handle Resume action
  const handleResumePlayback = () => {
    if (resumePrompt?.time) seekPlayer(resumePrompt.time)
    setResumePrompt(null)
  }

  const handleRestartPlayback = () => {
    secondsRef.current = 0
    persistProgress(0)
    seekPlayer(0)
    setResumePrompt(null)
  }

  // Episode navigation helpers
  const totalEpisodesInSeason = seasonData?.episodes?.length || 0
  const hasNextEp = currentEpisode < totalEpisodesInSeason
  const hasPrevEp = currentEpisode > 1

  const goToEpisode = (s, e) => {
    persistProgress(secondsRef.current)
    navigate(`/watch/tv/${mediaId}/${s}/${e}`)
  }

  // VidRift ignores its ?dub= parameter (verified), so the URL always asks for the
  // dub and the audio toggle switches VidRift's source by message instead. That
  // also means toggling doesn't reload the player.
  const playerSrc = isTVRoute
    ? currentServerObj.getTvUrl(mediaId, currentSeason, currentEpisode, true, startAt)
    : currentServerObj.getMovieUrl(mediaId, true, startAt)

  // Sandbox flags only apply when a frame loads, so the mode is part of the key.
  const playerKey = `${playerSrc}-${selectedServer}-${strict ? 'strict' : 'compat'}-${playerNonce}`
  useEffect(() => {
    frameLoadsRef.current = 0
    frameCreatedAtRef.current = Date.now()
    setSources(null)
    setPlayerState(null)
    setSettingsNotice('')
  }, [playerKey])

  // Audio: for anime VidRift offers an English-dub source ("animedub") and a
  // subbed source ("anime"). English is the default; when the dub exists and
  // hasn't failed, make sure it is the one playing. Movies and non-anime shows
  // come as a single audio track, so there is nothing to choose for them.
  const hasSource = (value) => sources?.list.some((s) => s.value === value && s.state !== 'failed')
  const dubChoice = selectedServer === 'vidrift' && hasSource(DUB_SOURCE) && hasSource(SUB_SOURCE)
  const requestedSourceRef = useRef('')
  useEffect(() => {
    if (!dubChoice) return
    const wanted = englishDefault ? DUB_SOURCE : SUB_SOURCE
    const request = `${playerKey}:${wanted}`
    if (sources.current === wanted || requestedSourceRef.current === request) return
    requestedSourceRef.current = request
    const frame = iframeRef.current?.contentWindow
    const at = secondsRef.current
    try {
      frame?.postMessage({ type: 'vidrift:set', server: wanted }, 'https://embed.vidrift.net')
      // Switching source can restart the episode; put the viewer back where they were.
      if (at > 5) setTimeout(() => {
        try { iframeRef.current?.contentWindow?.postMessage({ type: 'vidrift:resume', currentTime: at }, 'https://embed.vidrift.net') } catch { /* ignore */ }
      }, 2500)
    } catch { /* ignore */ }
  }, [dubChoice, englishDefault, sources, playerKey])

  // Subtitles: prefer English ("en" first, then any track labelled English).
  const lastSubtitleRef = useRef('')
  const englishSubtitle = (state) => {
    const subs = state?.subtitles.filter((s) => s.value !== 'off') || []
    return subs.find((s) => s.value === 'en') || subs.find((s) => /^english/i.test(s.label)) || subs[0] || null
  }
  const subtitlesOn = Boolean(playerState?.subtitle && playerState.subtitle !== 'off')
  const toggleSubtitles = () => {
    if (!playerState) return
    if (subtitlesOn) {
      lastSubtitleRef.current = playerState.subtitle
      applySetting({ subtitle: 'off' })
    } else {
      const pick = playerState.subtitles.find((s) => s.value === lastSubtitleRef.current) || englishSubtitle(playerState)
      if (pick) applySetting({ subtitle: pick.value })
    }
  }
  // Original audio for anime means Japanese: turn English subtitles on once if they're off.
  const autoSubsRef = useRef('')
  useEffect(() => {
    if (englishDefault || !playerState || playerState.server !== SUB_SOURCE || playerState.subtitle !== 'off') return
    if (autoSubsRef.current === playerKey) return
    const pick = englishSubtitle(playerState)
    if (!pick) return
    autoSubsRef.current = playerKey
    applySetting({ subtitle: pick.value })
  }, [englishDefault, playerState, playerKey, applySetting])

  useEffect(() => {
    restoreTimesRef.current = []
    setNavigationStopped(false)
    setUnavailable(false)
  }, [playbackKey, strict])

  const title = details?.title || details?.name || 'Now Playing'
  const year = (details?.release_date || details?.first_air_date) ? new Date(details.release_date || details.first_air_date).getFullYear() : ''
  const rating = details?.vote_average ? details.vote_average.toFixed(1) : ''
  const currentEpData = seasonData?.episodes?.find((ep) => ep.episode_number === currentEpisode)
  const seasons = details?.seasons?.filter((s) => s.season_number > 0) || []

  return (
    <div className={`watch-page${docked ? ' corner-player' : ''}`} role={docked ? 'region' : undefined} aria-label={docked ? 'Mini player' : undefined}>
      <div className="corner-player-bar">
        <button className="corner-player-title" onClick={onExpand} title="Return to full player">
          <span className="corner-live-dot" aria-hidden="true" /><span>{title}{isTVRoute ? ` · S${currentSeason} E${currentEpisode}` : ''}</span>
        </button>
        <button onClick={onExpand} aria-label="Expand player" title="Expand player"><FiMaximize2 /></button>
        <button onClick={() => { persistProgress(secondsRef.current); onClose() }} aria-label="Close player" title="Close player"><FiX /></button>
      </div>
      <header className="watch-top-bar">
        <div className="watch-top-left">
          {/* Leaving the watch route docks the player into the mini player (see App.jsx) */}
          <Link to="/" className="watch-brand-link" onClick={() => persistProgress(secondsRef.current)}>MOVIEPLAYER</Link>
        </div>

        <div className="watch-controls-group">
          {/* Strict is the normal state, so nothing is shown for it. The badge only
              appears after the viewer opted into the backup server, as a warning
              and a way back to full protection. */}
          {!strict && (
            <button
              className="control-btn protection-toggle compat"
              onClick={() => setProtectionOpen(true)}
              aria-haspopup="dialog"
              title="Player protection is reduced for this playback"
            >
              <FiShield /> Reduced protection
            </button>
          )}
        </div>
      </header>

      {/* Main Video Player Container */}
      <div className="player-container" ref={playerBoxRef}>
        {loading && <div className="player-loading-label" role="status">Loading title…</div>}
        {/* Resume Banner Prompt */}
        {resumePrompt && (
          <div className="resume-floating-banner">
            <div className="resume-banner-text">
              <FiClock size={18} />
              <span>Resume playback from <strong>{resumePrompt.formatted}</strong>?</span>
            </div>
            <div className="resume-banner-actions">
              <button className="btn-resume-confirm" onClick={handleResumePlayback}>
                <FiPlay size={14} /> Resume ({resumePrompt.formatted})
              </button>
              <button className="btn-resume-restart" onClick={handleRestartPlayback}>
                <FiRotateCcw size={14} /> Start Over
              </button>
            </div>
          </div>
        )}

        {notice && <div className="ad-blocked-toast" role="status">{notice}</div>}
        {unavailable && selectedServer === 'vidrift' && (
          <div className="unavailable-prompt" role="alert">
            <strong>This title isn't available on VidRift right now.</strong>
            <p>The backup server plays without the player sandbox, so popups and redirects may get through.</p>
            <div className="unavailable-actions">
              <button className="btn btn-play" onClick={tryBackupServer}>Try backup server</button>
              <button className="protection-compatibility" onClick={() => setUnavailable(false)}>Dismiss</button>
            </div>
          </div>
        )}
        {navigationStopped && !notice && (
          <div className="ad-blocked-toast" role="status">
            This player keeps opening other pages, so restoring is paused. Reload the page to try again.
          </div>
        )}

        <iframe
          ref={iframeRef}
          key={playerKey}
          src={playerSrc}
          onLoad={handleIframeLoad}
          allowFullScreen
          allow={PLAYER_PERMISSIONS}
          // Strict: scripts + provider storage only. Compatibility: see services/protection.js
          sandbox={playerSandbox(selectedServer, strict)}
          referrerPolicy="origin"
          title={title}
        />
      </div>

      {/* Toolbar under the video: episode navigation, quick subtitles, settings */}
      <div className="player-toolbar">
        {/* Episode navigation */}
        {isTVRoute && seasons.length > 0 && (
          <div className="tv-nav-bar">
            <select
              className="season-select compact"
              value={currentSeason}
              onChange={(e) => goToEpisode(Number(e.target.value), 1)}
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.season_number}>
                  {s.name || `Season ${s.season_number}`}
                </option>
              ))}
            </select>

            <div className="episode-stepper">
              <button
                className="ep-step-btn"
                disabled={!hasPrevEp}
                onClick={() => goToEpisode(currentSeason, currentEpisode - 1)}
                title="Previous episode"
                aria-label="Previous episode"
              >
                <FiChevronLeft /> <span className="ep-step-label">Prev</span>
              </button>
              <span className="ep-badge">
                <span className="ep-word">Ep </span>{currentEpisode}{totalEpisodesInSeason ? ` / ${totalEpisodesInSeason}` : ''}
              </span>
              <button
                className="ep-step-btn"
                disabled={!hasNextEp}
                onClick={() => goToEpisode(currentSeason, currentEpisode + 1)}
                title="Next episode"
                aria-label="Next episode"
              >
                <span className="ep-step-label">Next</span> <FiChevronRight />
              </button>
            </div>
          </div>
        )}

        <div className="player-toolbar-actions">
          {selectedServer === 'vidrift' && (
            <>
              <button className={`toolbar-btn cc-btn${subtitlesOn ? ' active' : ''}`} onClick={toggleSubtitles}
                disabled={!playerState || playerState.subtitles.length < 2}
                aria-pressed={subtitlesOn} aria-label="Subtitles" title="Subtitles">
                <span className="cc-glyph" aria-hidden="true">CC</span>
              </button>
              <button className="toolbar-btn" onClick={() => setSettingsOpen(true)} aria-haspopup="dialog" aria-label="Player settings" title="Player settings">
                <FiSettings aria-hidden="true" /> <span className="toolbar-btn-label">Settings</span>
              </button>
            </>
          )}
        </div>
      </div>

      {settingsOpen && (
        <PlayerSettings
          state={playerState}
          dubChoice={dubChoice}
          englishDefault={englishDefault}
          onAudioChoice={setEnglishDefault}
          onSet={applyPanelSetting}
          subtitleAuto={subtitleAuto}
          onSubtitleAuto={() => chooseSubtitleAuto(true)}
          notice={settingsNotice}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {protectionOpen && (
        <ProtectionPanel
          strict={strict}
          server={selectedServer}
          onStrict={() => { setCompatibilityFor(null); setProtectionOpen(false) }}
          onCompatibility={() => { setCompatibilityFor(playbackKey); setProtectionOpen(false) }}
          onClose={() => setProtectionOpen(false)}
        />
      )}

      {/* Details & Episode List */}
      <div className="watch-info">
        {detailsError && <p role="status">Title details couldn't load. You can still try the player.</p>}
        <h1 className="watch-title">
          {title} {isTVRoute && <span className="watch-ep-heading"><span className="watch-ep-sep" aria-hidden="true">• </span>S{currentSeason} E{currentEpisode}: {currentEpData?.name || `Episode ${currentEpisode}`}</span>}
        </h1>

        <div className="watch-meta">
          {rating && (
            <span style={{ color: '#ffd700', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FaStar /> {rating}
            </span>
          )}
          {year && <span>{year}</span>}
          {details?.genres?.map((g) => g.name).join(', ')}
          <span className="type-badge">{isTVRoute ? 'TV SERIES' : 'MOVIE'}</span>
        </div>

        <p className="watch-overview">{currentEpData?.overview || details?.overview}</p>
        {details && <LibraryActions movie={{ ...details, media_type: isTVRoute ? 'tv' : 'movie' }} />}

        {/* TV Episodes Grid */}
        {isTVRoute && seasonData?.episodes && seasonData.episodes.length > 0 && (
          <div className="watch-episodes-section">
            <div className="episodes-header" style={{ marginTop: '36px' }}>
              <h2 className="modal-section-title">Season {currentSeason} Episodes</h2>
            </div>
            <div className="episodes-grid-compact">
              {seasonData.episodes.map((ep) => (
                <div
                  key={ep.id}
                  className={`episode-card ${ep.episode_number === currentEpisode ? 'active' : ''}`}
                  onClick={() => goToEpisode(currentSeason, ep.episode_number)}
                >
                  <div className="ep-card-thumb-box">
                    <img
                      src={getStillUrl(ep.still_path)}
                      alt={ep.name}
                      className="ep-card-thumb"
                      loading="lazy"
                    />
                    <div className="ep-card-play"><FiPlay /></div>
                  </div>
                  <div className="ep-card-body">
                    <div className="ep-card-title">
                      {ep.episode_number}. {ep.name}
                    </div>
                    {ep.runtime && <span className="ep-card-runtime">{ep.runtime}m</span>}
                    <p className="ep-card-overview">{ep.overview || 'No synopsis'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
