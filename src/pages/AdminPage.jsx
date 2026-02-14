import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminPage() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [flowers, setFlowers] = useState([])
  const [email, setEmail] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginSent, setLoginSent] = useState(false)
  const [tab, setTab] = useState('pending') // 'pending' | 'approved'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      fetchFlowers()
    }
  }, [session, tab])

  async function fetchFlowers() {
    const { data, error } = await supabase
      .from('flowers')
      .select('*')
      .eq('approved', tab === 'approved')
      .order('created_at', { ascending: false })

    if (!error && data) setFlowers(data)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoginLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      alert(error.message)
    } else {
      setLoginSent(true)
    }
    setLoginLoading(false)
  }

  async function handleApprove(id) {
    const { error } = await supabase
      .from('flowers')
      .update({ approved: true })
      .eq('id', id)
    if (!error) fetchFlowers()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this flower permanently?')) return
    const { error } = await supabase.from('flowers').delete().eq('id', id)
    if (!error) fetchFlowers()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setSession(null)
  }

  if (loading) return <div className="loading">Loading...</div>

  // Not logged in — show login form
  if (!session) {
    return (
      <div className="admin-page">
        <div className="admin-login">
          <h1>🔒 Admin Login</h1>
          {loginSent ? (
            <div className="login-sent">
              <p>✉️ Magic link sent to <strong>{email}</strong></p>
              <p>Check your inbox and click the link to sign in.</p>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              <label htmlFor="email">Email (must be on the allowlist)</label>
              <input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="btn btn-primary" type="submit" disabled={loginLoading}>
                {loginLoading ? 'Sending...' : 'Send magic link'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // Logged in — show admin panel
  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>🌼 Admin Panel</h1>
        <div className="admin-user">
          <Link to="/" className="btn btn-secondary btn-sm">View Garden</Link>
          <span>{session.user.email}</span>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <div className="admin-tabs">
        <button
          className={`tab ${tab === 'pending' ? 'active' : ''}`}
          onClick={() => setTab('pending')}
        >
          Pending
        </button>
        <button
          className={`tab ${tab === 'approved' ? 'active' : ''}`}
          onClick={() => setTab('approved')}
        >
          Approved
        </button>
      </div>

      <div className="admin-grid">
        {flowers.length === 0 && (
          <p className="admin-empty">
            No {tab} flowers.
          </p>
        )}
        {flowers.map((flower) => (
          <div key={flower.id} className="admin-card">
            <img src={flower.image_url} alt="Submitted flower" />
            {flower.message && (
              <p className="admin-card-message">"{flower.message}"</p>
            )}
            <p className="admin-card-date">
              {new Date(flower.created_at).toLocaleDateString()}
            </p>
            <div className="admin-card-actions">
              {tab === 'pending' && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleApprove(flower.id)}
                >
                  ✓ Approve
                </button>
              )}
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(flower.id)}
              >
                ✕ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
