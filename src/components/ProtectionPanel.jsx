import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FiShield, FiX } from 'react-icons/fi'

export default function ProtectionPanel({ strict, server, onStrict, onCompatibility, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])
  // Escape fires `cancel`. Don't listen for `close`: the effect cleanup above
  // fires it too (StrictMode remounts), which would unmount the panel at once.
  return createPortal(<dialog ref={ref} className="protection-dialog" onCancel={(event) => { event.preventDefault(); onClose() }} aria-labelledby="protection-title">
    <button className="protection-close" aria-label="Close protection settings" onClick={onClose}><FiX /></button>
    <FiShield className="protection-symbol" />
    <h2 id="protection-title">Player protection</h2>
    <p className="protection-state">{strict ? 'Strict protection is on' : 'Compatibility mode is on'}</p>
    <p>Strict protection blocks popups, redirects away from this site, downloads, forms, and disruptive prompts from the player.</p>
    <p>If the player refuses to play with these restrictions, compatibility mode can help. Protection never turns itself off.</p>
    <div className="protection-tradeoff"><strong>Compatibility on {server === 'vidlink' ? 'VidLink' : 'VidRift'}</strong>
      <p>{server === 'vidlink'
        ? 'Removes the player sandbox. Popups, redirects, downloads, forms, and prompts may be allowed by your browser.'
        : 'Allows popups, forms, casting, orientation and pointer lock. New windows inherit the sandbox, but external app links may also become available. Top-page web redirects, downloads, and modal prompts stay restricted.'}</p>
      <p>Only for this title, episode, and server. A new playback selection starts in Strict mode. Device permission restrictions stay on.</p>
    </div>
    <p className="protection-limit">This cannot remove ads inside the video or block all tracking inside the provider.</p>
    <div className="protection-dialog-actions">
      <button className="btn btn-play" onClick={onStrict}>{strict ? 'Keep strict protection' : 'Restore strict protection'}</button>
      {strict && <button className="protection-compatibility" onClick={onCompatibility}>Use compatibility for this playback</button>}
    </div>
  </dialog>, document.body)
}
