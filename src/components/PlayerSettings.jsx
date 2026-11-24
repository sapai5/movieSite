import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FiX, FiAlertCircle } from 'react-icons/fi'

// Player settings, drawn by this site from VidRift's own state (vidrift:state),
// so it lists exactly the choices the player has for this title. Changes go back
// as vidrift:set messages. A bottom sheet on phones, a side panel on desktop.

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]
const COLORS = [['#ffffff', 'White'], ['#ffe14d', 'Yellow'], ['#7fe7ff', 'Cyan']]

function Segments({ label, value, options, onChange }) {
  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      <div className="control-pill-group settings-segments" role="group" aria-label={label}>
        {options.map(([optionValue, text]) => (
          <button key={String(optionValue)} className={`control-btn${value === optionValue ? ' active' : ''}`}
            aria-pressed={value === optionValue} onClick={() => onChange(optionValue)}>{text}</button>
        ))}
      </div>
    </div>
  )
}

export default function PlayerSettings({ state, dubChoice, englishDefault, onAudioChoice, onSet, subtitleAuto, onSubtitleAuto, notice, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  const style = state?.subtitleStyle
  const subtitlesOn = state && state.subtitle && state.subtitle !== 'off'
  const setStyle = (patch) => onSet({ subtitleStyle: patch })

  return createPortal(
    // Escape fires `cancel`. `close` is deliberately not handled (see ProtectionPanel).
    <dialog ref={ref} className="player-settings" aria-labelledby="player-settings-title"
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === ref.current) onClose() }}>
      <div className="player-settings-inner">
        <div className="player-settings-head">
          <span className="sheet-grabber" aria-hidden="true" />
          <h2 id="player-settings-title">Player settings</h2>
          <button className="protection-close" aria-label="Close player settings" onClick={onClose}><FiX /></button>
        </div>

        {notice && <p className="settings-notice" role="status"><FiAlertCircle /> {notice}</p>}
        {!state && <p className="settings-empty">Settings appear once the player has loaded.</p>}

        {state && (
          <>
            {(dubChoice || state.audios.length > 1 || state.qualities.length > 1) && (
              <section className="settings-section" aria-label="Picture and sound">
                <h3>Picture &amp; sound</h3>
                {dubChoice && (
                  <Segments label="Audio" value={englishDefault ? 'dub' : 'original'}
                    options={[['dub', 'English dub'], ['original', 'Original']]}
                    onChange={(choice) => onAudioChoice(choice === 'dub')} />
                )}
                {!dubChoice && state.audios.length > 1 && (
                  <label className="settings-row">
                    <span className="settings-label">Audio track</span>
                    <select className="season-select compact" value={state.audio ?? ''} onChange={(e) => onSet({ audio: e.target.value })}>
                      {state.audios.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </label>
                )}
                {state.qualities.length > 1 && (
                  <Segments label="Quality" value={state.quality}
                    options={state.qualities.map((q) => [q.value, q.label])}
                    onChange={(quality) => onSet({ quality })} />
                )}
              </section>
            )}

            <section className="settings-section" aria-label="Subtitles">
              <h3>Subtitles</h3>
              {state.subtitles.length > 1 ? (
                <label className="settings-row">
                  <span className="settings-label">Language</span>
                  <select className="season-select compact" value={state.subtitle ?? 'off'} onChange={(e) => onSet({ subtitle: e.target.value })}>
                    {state.subtitles.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
              ) : <p className="settings-empty">No subtitles for this title.</p>}

              {subtitlesOn && style && (
                <>
                  <div className="settings-row settings-range">
                    <span className="settings-label">
                      <span>Size</span>
                      <span className="settings-size-value">
                        <button className={`settings-auto-chip${subtitleAuto ? ' active' : ''}`} aria-pressed={subtitleAuto}
                          onClick={onSubtitleAuto} aria-label="Auto subtitle size" title="Fit subtitles to the player size">Auto</button>
                        <output htmlFor="subtitle-size">{style.size}%</output>
                      </span>
                    </span>
                    <input id="subtitle-size" type="range" min="50" max="200" step="10" value={style.size} aria-label="Subtitle size"
                      onChange={(e) => setStyle({ size: Number(e.target.value) })} />
                  </div>
                  <label className="settings-row settings-range">
                    <span className="settings-label">Raise <output>{style.position}</output></span>
                    <input type="range" min="0" max="40" step="2" value={style.position}
                      onChange={(e) => setStyle({ position: Number(e.target.value) })} />
                  </label>
                  <Segments label="Background" value={style.background}
                    options={[['shadow', 'Shadow'], ['box', 'Box']]}
                    onChange={(background) => setStyle({ background })} />
                  <div className="settings-row">
                    <span className="settings-label">Color</span>
                    <div className="settings-swatches" role="group" aria-label="Subtitle color">
                      {COLORS.map(([hex, name]) => (
                        <button key={hex} className={`swatch${style.color.toLowerCase() === hex ? ' active' : ''}`} style={{ '--swatch': hex }}
                          aria-label={name} aria-pressed={style.color.toLowerCase() === hex} onClick={() => setStyle({ color: hex })} />
                      ))}
                    </div>
                  </div>
                  <div className="settings-row">
                    <span className="settings-label">Sync</span>
                    <div className="control-pill-group settings-stepper" role="group" aria-label="Subtitle sync">
                      <button className="control-btn" aria-label="Show subtitles earlier" onClick={() => onSet({ subtitleOffset: Math.round((state.subtitleOffset - 0.5) * 10) / 10 })}>−0.5s</button>
                      <output aria-live="polite">{state.subtitleOffset > 0 ? '+' : ''}{state.subtitleOffset.toFixed(1)}s</output>
                      <button className="control-btn" aria-label="Show subtitles later" onClick={() => onSet({ subtitleOffset: Math.round((state.subtitleOffset + 0.5) * 10) / 10 })}>+0.5s</button>
                    </div>
                  </div>
                </>
              )}
            </section>

            <section className="settings-section" aria-label="Playback">
              <h3>Playback</h3>
              <Segments label="Speed" value={state.speed}
                options={SPEEDS.map((s) => [s, s === 1 ? 'Normal' : `${s}×`])}
                onChange={(speed) => onSet({ speed })} />
            </section>
          </>
        )}
      </div>
    </dialog>,
    document.body,
  )
}
