import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Garden from '../components/Garden'
import DrawingCanvas from '../components/DrawingCanvas'
import PixelTree from '../components/PixelTree'
import RollingNumber from '../components/RollingNumber'

export default function HomePage() {
  const [flowers, setFlowers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [closing, setClosing] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const modalRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    fetchFlowers()
    // Check if there's an active admin session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session)
    })
  }, [])

  // Lock body scroll + trap focus when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden'

      // Focus trap: keep Tab cycling within the modal
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          closeModal()
          return
        }
        if (e.key !== 'Tab') return
        const modal = modalRef.current
        if (!modal) return
        const focusable = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus() }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus() }
        }
      }
      document.addEventListener('keydown', handleKeyDown)
      // Auto-focus the first interactive element inside the modal
      requestAnimationFrame(() => {
        const modal = modalRef.current
        if (modal) {
          const first = modal.querySelector('button, [href], input, select, textarea')
          first?.focus()
        }
      })
      return () => document.removeEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showModal])

  async function fetchFlowers() {
    const { data, error } = await supabase
      .from('flowers')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setFlowers(data)
    }
    setLoading(false)
  }

  async function handleSubmit() {
    const dataUrl = canvasRef.current.getDataUrl()
    // Verify the canvas isn't blank before uploading
    const img = new Image()
    const isBlank = await new Promise((resolve) => {
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = img.width
        c.height = img.height
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const { data } = ctx.getImageData(0, 0, c.width, c.height)
        // Check if every pixel's alpha channel is 0 (fully transparent)
        resolve(data.every((_, i) => i % 4 !== 3 || data[i] === 0))
      }
      img.src = dataUrl
    })

    if (isBlank) {
      alert('Your canvas is empty — draw something first!')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const filename = `${crypto.randomUUID()}.png`

      const { error: uploadError } = await supabase.storage
        .from('flower-images')
        .upload(filename, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      const { data: urlData } = supabase.storage
        .from('flower-images')
        .getPublicUrl(filename)

      const { error: insertError } = await supabase.from('flowers').insert({
        image_url: urlData.publicUrl,
        message: message.trim() || null,
        approved: false,
      })

      if (insertError) {
        console.error('Insert error:', insertError)
        throw new Error(`Database insert failed: ${insertError.message}`)
      }

      setDone(true)
    } catch (err) {
      console.error('Submit error:', err)
      alert(`Error: ${err.message}\n\nCheck the browser console (F12) for details.`)
    } finally {
      setSubmitting(false)
    }
  }

  function handleDrawAnother() {
    setDone(false)
    setMessage('')
  }

  function closeModal() {
    setClosing(true)
    setTimeout(() => {
      setShowModal(false)
      setClosing(false)
      setDone(false)
      setMessage('')
    }, 220) // matches CSS animation duration
  }

  return (
    <div className="home-page">
      {/* Top bar */}
      <header className="site-header">
        <div className="header-left">
          <svg className="header-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="3" fill="#e8a0b4" />
            <circle cx="8.5" cy="10.5" r="3" fill="#e8a0b4" />
            <circle cx="15.5" cy="10.5" r="3" fill="#e8a0b4" />
            <circle cx="9.5" cy="14" r="3" fill="#e8a0b4" />
            <circle cx="14.5" cy="14" r="3" fill="#e8a0b4" />
            <circle cx="12" cy="11.5" r="2.2" fill="#d4859c" />
          </svg>
          <span className="header-title">STAY IN BLOOM</span>
        </div>
        <div className="header-right">
          {isAdmin && (
            <Link to="/admin" className="admin-badge">Admin</Link>
          )}
          <span className="flower-counter">
            <svg className="counter-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="12" cy="9" rx="2.5" ry="4.5" fill="#e8a0b4" />
              <ellipse cx="12" cy="9" rx="4.5" ry="2.5" fill="#e8a0b4" />
              <circle cx="12" cy="9" r="2" fill="#d4859c" />
              <rect x="11.25" y="13" width="1.5" height="6" rx="0.75" fill="#e8a0b4" />
            </svg>
            {' '}<RollingNumber value={flowers.length} delay={0.3} /> flowers planted{' '}
            <svg className="counter-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="12" cy="9" rx="2.5" ry="4.5" fill="#e8a0b4" />
              <ellipse cx="12" cy="9" rx="4.5" ry="2.5" fill="#e8a0b4" />
              <circle cx="12" cy="9" r="2" fill="#d4859c" />
              <rect x="11.25" y="13" width="1.5" height="6" rx="0.75" fill="#e8a0b4" />
            </svg>
          </span>
        </div>
      </header>

      {/* Center title */}
      <div className="hero-text">
        <p className="hero-subtitle">A COMMUNITY GARDEN</p>
        <h1 className="hero-title">Leave a Flower</h1>
      </div>

      {/* Garden fills the viewport */}
      {loading ? (
        <div className="loading">Growing flowers...</div>
      ) : (
        <Garden flowers={flowers} />
      )}

      {/* Pixel trees along edges */}
      <div className="tree-decorations" aria-hidden="true">
        <PixelTree size={54} style={{ position: 'absolute', left: '3%', bottom: '4%' }} />
        <PixelTree size={70} style={{ position: 'absolute', left: '1%', bottom: '8%' }} />
        <PixelTree size={48} style={{ position: 'absolute', right: '2%', bottom: '5%' }} />
        <PixelTree size={64} style={{ position: 'absolute', right: '5%', bottom: '10%' }} />
        <PixelTree size={40} style={{ position: 'absolute', left: '8%', bottom: '2%' }} />
        <PixelTree size={38} style={{ position: 'absolute', right: '10%', bottom: '3%' }} />
      </div>

      {/* Bottom draw button */}
      <div className="bottom-bar">
        <button className="btn btn-draw" onClick={() => setShowModal(true)}>
          plant a flower!
        </button>
      </div>

      {/* Modal overlay with blur */}
      {showModal && (
        <div className={`modal-overlay ${closing ? 'closing' : ''}`} onClick={closeModal}>
          <div
            ref={modalRef}
            className={`modal-content ${closing ? 'closing' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Draw a flower"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="success-message">
                <h2>🌷 Flower planted!</h2>
                <p>Your flower has been submitted for approval.<br />It will appear in the garden soon!</p>
                <div className="success-actions">
                  <button className="btn btn-primary" onClick={handleDrawAnother}>
                    Draw another
                  </button>
                  <button className="btn btn-secondary" onClick={closeModal}>
                    Back to garden
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="modal-title">draw your flower</h2>
                <p className="modal-subtitle">it'll be planted in the garden!</p>

                <DrawingCanvas ref={canvasRef} onHasDrawnChange={setHasDrawn} />

                <div className="message-input">
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="leave a message with your flower..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={closeModal}>
                    cancel
                  </button>
                  <button
                    className="btn btn-plant"
                    onClick={handleSubmit}
                    disabled={!hasDrawn || submitting}
                  >
                    {submitting ? 'planting...' : 'plant!'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
