import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

export default function ApplyAccount() {
  const navigate = useNavigate()
  const [type, setType] = useState('savings')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const res = await api.post('/customer/accounts/apply', { account_type: type })
      if (res.data.error) {
        setError(res.data.error)
      } else {
        setSuccess('Account request submitted! It will be activated after admin approval.')
        setTimeout(() => navigate('/user/my-accounts'), 2000)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">New Account Request</div>
          <div className="page-subtitle">Apply for an additional savings or current account.</div>
        </div>
      </div>

      {error && (
        <div className="badge badge-danger" style={{ marginBottom: '16px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'none', fontWeight: 500, fontSize: '13px', letterSpacing: '0', width: 'fit-content' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>error</span>
          {error}
        </div>
      )}
      {success && (
        <div className="badge badge-success" style={{ marginBottom: '16px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'none', fontWeight: 500, fontSize: '13px', letterSpacing: '0', width: 'fit-content' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>check_circle</span>
          {success}
        </div>
      )}

      <div className="form-card" style={{ maxWidth: '500px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="type">Account Type</label>
            <select id="type" className="form-control" value={type} onChange={e => setType(e.target.value)}>
              <option value="savings">Savings Account</option>
              <option value="current">Current Account</option>
              <option value="fixed_deposit">Fixed Deposit</option>
            </select>
          </div>

          <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: '#fff', marginBottom: '8px', fontSize: '0.95rem' }}>Before you apply:</h4>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>Your request will be reviewed by bank staff.</li>
              <li>You will be notified once the account is activated.</li>
              <li>A valid Government ID is required for account opening.</li>
            </ul>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }} disabled={submitting}>
            <span className="material-symbols-rounded">{submitting ? 'sync' : 'add_card'}</span>
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </>
  )
}
