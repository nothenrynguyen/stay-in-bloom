import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Garden from '../components/Garden'
import DrawingCanvas from '../components/DrawingCanvas'
import PixelTree from '../components/PixelTree'

export default function HomePage() {
  const [flowers, setFlowers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [closing, setClosing] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetchFlowers()
    // Check if there's an active admin session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session)
    })
  }, [])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden'
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

  async function handleSubmit(dataUrl) {
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
          <span className="header-icon">🌸</span>
          <span className="header-title">STAY IN BLOOM</span>
        </div>
        <div className="header-right">
          {isAdmin && (
            <Link to="/admin" className="admin-badge">Admin</Link>
          )}
          <span className="flower-counter">🌼 {flowers.length} flowers planted 🌼</span>
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
          plant a flower
        </button>
      </div>

      {/* Modal overlay with blur */}
      {showModal && (
        <div className={`modal-overlay ${closing ? 'closing' : ''}`} onClick={closeModal}>
          <div className={`modal-content ${closing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
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

                <DrawingCanvas onSubmit={handleSubmit} submitting={submitting} />

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
                    Cancel
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
