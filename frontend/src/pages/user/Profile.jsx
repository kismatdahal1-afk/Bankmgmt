import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getInitials } from '../../utils/helpers'

export default function UserProfile() {
  const { customer } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/customer/profile')
      .then(r => r.json())
      .then(d => { setProfile(d.customer || d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const data = profile
  const initials = getInitials(data?.full_name || customer?.name)

  if (loading) return <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">My Profile</div>
          <div className="page-subtitle">Personal and contact information on file.</div>
        </div>
      </div>

      <div className="form-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
          <div className="avatar" style={{ width: '64px', height: '64px', fontSize: '22px' }}>{initials}</div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{data?.full_name}</div>
            <div className="text-muted" style={{ fontSize: '13px', marginTop: '2px' }}>
              Customer ID &middot; #{data?.id}
              <span style={{ margin: '0 8px' }}>&middot;</span>
              Member since {data?.created_at ? new Date(data.created_at).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="form-readonly">{data?.full_name}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <div className="form-readonly">{data?.phone_number}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Government ID</label>
            <div className="form-readonly mono">{data?.citizenship_id}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="form-readonly">{data?.username}</div>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Address</label>
            <div className="form-readonly">{data?.address}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '18px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
          <a href="/user/login" className="btn btn-danger" onClick={(e) => { e.preventDefault(); sessionStorage.clear(); window.location.href = '/user/login' }}>
            <span className="material-symbols-rounded">logout</span> Sign Out
          </a>
        </div>
      </div>
    </>
  )
}
