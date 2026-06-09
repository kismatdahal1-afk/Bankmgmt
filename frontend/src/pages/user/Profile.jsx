import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { getInitials, formatDate, formatCurrency } from '../../utils/helpers'

export default function UserProfile() {
  const { customer } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState([])
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [pwForm, setPwForm] = useState(false)
  const [pwData, setPwData] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  useEffect(() => {
    api.get('/customer/profile')
      .then(r => {
        const c = r.data.customer || r.data
        setProfile(c)
        setFormData({
          email: c.email || '',
          alternate_mobile: c.alternate_mobile || '',
          address: c.address || '',
          permanent_address: c.permanent_address || '',
          temporary_address: c.temporary_address || ''
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
    api.get('/customer/accounts')
      .then(r => setAccounts(r.data.accounts || []))
      .catch(() => {})
  }, [])

  const data = profile
  const initials = getInitials(data?.full_name || customer?.name)

  const handleEditToggle = () => {
    setEditMode(!editMode)
    setMessage('')
  }

  const handleFieldChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const res = await api.post('/customer/profile/update', formData)
      if (res.data.error) { setMessage(`Error: ${res.data.error}`); setSaving(false); return }
      setMessage('Profile updated successfully!')
      setProfile(res.data.customer)
      setEditMode(false)
      setSaving(false)
    } catch (err) {
      setMessage('Failed to update profile')
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    if (!pwData.current_password) {
      setPwError('Current password is required')
      return
    }
    if (pwData.new_password !== pwData.confirm_password) {
      setPwError('Passwords do not match')
      return
    }
    if (pwData.new_password.length < 6) {
      setPwError('Password must be at least 6 characters')
      return
    }
    const hasLetter = /[a-zA-Z]/.test(pwData.new_password)
    const hasDigit = /\d/.test(pwData.new_password)
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwData.new_password)
    if (!(hasLetter && hasDigit && hasSpecial)) {
      setPwError('Password must contain letters, numbers, and special characters')
      return
    }
    try {
      const res = await api.post('/customer/change-password', {
        current_password: pwData.current_password,
        new_password: pwData.new_password
      })
      if (res.data.error) { setPwError(res.data.error); return }
      setPwSuccess('Password updated successfully.')
      setPwData({ current_password: '', new_password: '', confirm_password: '' })
      setPwForm(false)
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to change password'
      setPwError(msg)
    }
  }

  if (loading) return <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">My Profile</div>
          <div className="page-subtitle">Personal and contact information on file.</div>
        </div>
        <button onClick={handleEditToggle} className="btn btn-secondary">
          <span className="material-symbols-rounded">{editMode ? 'close' : 'edit'}</span>
          {editMode ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {message && (
        <div className={`flash-message flash-${message.startsWith('Error') ? 'danger' : 'success'}`} style={{ marginBottom: '16px' }}>
          <span>{message}</span>
        </div>
      )}

      <div className="form-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
          <div className="avatar" style={{ width: '64px', height: '64px', fontSize: '22px' }}>{initials}</div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{data?.full_name}</div>
            <div className="text-muted" style={{ fontSize: '13px', marginTop: '2px' }}>
              {data?.customer_id && <span>Customer ID: {data.customer_id} &middot;</span>}
              Member since {data?.created_at ? new Date(data.created_at).toLocaleDateString() : 'N/A'}
            </div>
            {accounts.length > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {accounts.map(a => (
                  <span key={a.id} style={{ background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: 'var(--accent-color)', fontFamily: 'monospace' }}>
                    {a.account_number} &middot; {formatCurrency(a.balance)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {editMode ? (
          <form onSubmit={handleSaveProfile}>
            <h4 style={{ color: '#fff', marginBottom: '16px' }}>Contact Details</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" name="email" className="form-control" value={formData.email} onChange={handleFieldChange} />
              </div>
              <div className="form-group">
                <label>Alternate Mobile</label>
                <input type="tel" name="alternate_mobile" className="form-control" value={formData.alternate_mobile} onChange={handleFieldChange} />
              </div>
            </div>
            <div className="form-group">
              <label>Permanent Address</label>
              <input type="text" name="address" className="form-control" value={formData.address} onChange={handleFieldChange} />
            </div>
            <div className="form-group">
              <label>Temporary Address</label>
              <input type="text" name="temporary_address" className="form-control" value={formData.temporary_address} onChange={handleFieldChange} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <span className="material-symbols-rounded">{saving ? 'sync' : 'save'}</span>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        ) : (
          <>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Customer ID</label>
                <div className="form-readonly mono">{data?.customer_id || `#${data?.id}`}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <div className="form-readonly">{data?.username}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="form-readonly">{data?.full_name}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Father Name</label>
                <div className="form-readonly">{data?.father_name || 'N/A'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <div className="form-readonly">{data?.gender || 'N/A'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <div className="form-readonly">{data?.dob ? formatDate(data.dob) : 'N/A'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <div className="form-readonly">{data?.phone_number}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="form-readonly">{data?.email || 'N/A'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Government ID</label>
                <div className="form-readonly mono">{data?.citizenship_id}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Occupation</label>
                <div className="form-readonly">{data?.occupation || 'N/A'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Marital Status</label>
                <div className="form-readonly">{data?.marital_status || 'N/A'}</div>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Address</label>
                <div className="form-readonly">{data?.address}</div>
              </div>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '18px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
          {!pwForm ? (
            <button onClick={() => setPwForm(true)} className="btn btn-secondary">
              <span className="material-symbols-rounded">lock</span> Change Password
            </button>
          ) : null}
        </div>

        {pwForm && (
          <div style={{ marginTop: '20px', padding: '20px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <h4 style={{ color: '#fff', marginBottom: '16px' }}>Change Password</h4>
            {pwError && <div className="badge badge-danger" style={{ marginBottom: '12px', padding: '8px 12px', display: 'block' }}>{pwError}</div>}
            {pwSuccess && <div className="badge badge-success" style={{ marginBottom: '12px', padding: '8px 12px', display: 'block' }}>{pwSuccess}</div>}
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" className="form-control" required
                  value={pwData.current_password} onChange={(e) => setPwData({ ...pwData, current_password: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" className="form-control" required
                    value={pwData.new_password} onChange={(e) => setPwData({ ...pwData, new_password: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input type="password" className="form-control" required
                    value={pwData.confirm_password} onChange={(e) => setPwData({ ...pwData, confirm_password: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary">
                  <span className="material-symbols-rounded">lock</span> Update Password
                </button>
                <button type="button" onClick={() => { setPwForm(false); setPwError(''); setPwSuccess('') }} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  )
}
