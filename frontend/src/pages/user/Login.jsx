import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function UserLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(username, password, 'customer')
      navigate('/user/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-logo">
            <span className="material-symbols-rounded">account_balance</span>
          </div>
          <div>
            <div className="brand-name" style={{ fontSize: '18px' }}>Village Bank</div>
            <div className="brand-sub">Customer Portal</div>
          </div>
        </div>

        <div className="login-title">Welcome back</div>
        <div className="login-sub">Sign in to access your accounts and manage your finances.</div>

        {error && (
          <div className="badge badge-danger" style={{ marginBottom: '16px', padding: '10px 14px', display: 'flex', width: '100%', justifyContent: 'flex-start', textTransform: 'none', fontWeight: 500, fontSize: '13px', letterSpacing: '0' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '8px' }}>error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input type="text" id="username" name="username" className="form-control" placeholder="Enter your username" required autoFocus
              value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input type="password" id="password" name="password" className="form-control" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" required
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '8px' }}>
            <span className="material-symbols-rounded">login</span> Sign in
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <Link to="/staff/login" style={{ color: 'var(--accent)' }}>Staff Login</Link> &middot; <Link to="/" style={{ color: 'var(--accent)' }}>Home</Link>
        </div>
      </div>
    </div>
  )
}
