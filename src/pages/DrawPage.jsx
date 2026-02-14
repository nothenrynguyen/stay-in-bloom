import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import DrawingCanvas from '../components/DrawingCanvas'

export default function DrawPage() {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(dataUrl) {
    setSubmitting(true)

    try {
      // Convert data URL to blob
      const res = await fetch(dataUrl)
      const blob = await res.blob()

      // Generate a unique filename
      const filename = `${crypto.randomUUID()}.png`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('flower-images')
        .upload(filename, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('flower-images')
        .getPublicUrl(filename)

      // Insert flower record
      const { error: insertError } = await supabase.from('flowers').insert({
        image_url: urlData.publicUrl,
        message: message.trim() || null,
        approved: false,
      })

      if (insertError) throw insertError

      setDone(true)
    } catch (err) {
      console.error('Submit error:', err)
      alert('Something went wrong — please try again!')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="draw-page">
        <div className="success-message">
          <h2>🌷 Flower planted!</h2>
          <p>Your flower has been submitted for approval. It will appear in the garden soon!</p>
          <div className="success-actions">
            <button className="btn btn-primary" onClick={() => { setDone(false); setMessage('') }}>
              Draw another
            </button>
            <Link to="/" className="btn btn-secondary">
              Visit the garden
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="draw-page">
      <header className="page-header">
        <Link to="/" className="back-link">← Back to garden</Link>
        <h1>Draw your flower</h1>
        <p>Use your mouse or finger to draw on the canvas below</p>
      </header>

      <DrawingCanvas onSubmit={handleSubmit} submitting={submitting} />

      <div className="message-input">
        <label htmlFor="message">
          Optional message (e.g. "for mom —sarah")
        </label>
        <input
          id="message"
          type="text"
          maxLength={100}
          placeholder="Leave a message with your flower..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
    </div>
  )
}
