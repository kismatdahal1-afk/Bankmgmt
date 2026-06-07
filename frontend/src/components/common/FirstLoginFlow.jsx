import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

export default function FirstLoginFlow() {
  const { customer, refreshCustomer } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('password')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState(customer?.phone_number || '')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/customer/change-password', { current_password: currentPassword, new_password: newPassword })
      const data = res.data
      if (data.error) { setError(data.error); setLoading(false); return }
      setSuccess('Password changed successfully!')
      setLoading(false)
      setTimeout(() => { setStep('contact'); setSuccess('') }, 1000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password')
      setLoading(false)
    }
  }

  const handleConfirmContact = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/customer/confirm-contact', { phone_number: phoneNumber, email })
      const data = res.data
      if (data.error) { setError(data.error); setLoading(false); return }
      setSuccess('Contact information confirmed!')
      setLoading(false)
      if (refreshCustomer) refreshCustomer()
      setTimeout(() => navigate('/user/dashboard'), 1000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm contact')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: '20px'
    }}>
      <div className="form-card" style={{ maxWidth: '480px', width: '100%' }}>
        {step === 'password' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '3rem', color: 'var(--warning)', marginBottom: '12px' }}>lock_reset</span>
              <h2 style={{ color: '#fff', marginBottom: '8px' }}>Change Your Password</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                For security reasons, you must change your temporary password before continuing.
              </p>
            </div>

            {error && (
              <div className="badge badge-danger" style={{ marginBottom: '16px', padding: '10px 14px', display: 'flex', width: '100%' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '8px' }}>error</span>
                {error}
              </div>
            )}

            {success && (
              <div className="badge badge-success" style={{ marginBottom: '16px', padding: '10px 14px', display: 'flex', width: '100%' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '8px' }}>check_circle</span>
                {success}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label htmlFor="current_password">Current Password (Temporary)</label>
                <input type="password" id="current_password" className="form-control" required
                  value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="new_password">New Password</label>
                <input type="password" id="new_password" className="form-control" required
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 4 characters" />
              </div>
              <div className="form-group">
                <label htmlFor="confirm_password">Confirm New Password</label>
                <input type="password" id="confirm_password" className="form-control" required
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                <span className="material-symbols-rounded">{loading ? 'sync' : 'lock'}</span>
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </>
        )}

        {step === 'contact' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '3rem', color: 'var(--success)', marginBottom: '12px' }}>contact_phone</span>
              <h2 style={{ color: '#fff', marginBottom: '8px' }}>Confirm Contact Information</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Please verify your mobile number and email address.
              </p>
            </div>

            {error && (
              <div className="badge badge-danger" style={{ marginBottom: '16px', padding: '10px 14px', display: 'flex', width: '100%' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '8px' }}>error</span>
                {error}
              </div>
            )}

            {success && (
              <div className="badge badge-success" style={{ marginBottom: '16px', padding: '10px 14px', display: 'flex', width: '100%' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '8px' }}>check_circle</span>
                {success}
              </div>
            )}

            <form onSubmit={handleConfirmContact}>
              <div className="form-group">
                <label htmlFor="phone_number_confirm">Mobile Number</label>
                <input type="tel" id="phone_number_confirm" className="form-control" required
                  value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="email_confirm">Email Address</label>
                <input type="email" id="email_confirm" className="form-control"
                  value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
              </div>
              <button type="submit" className="btn btn-success btn-block" disabled={loading}>
                <span className="material-symbols-rounded">{loading ? 'sync' : 'check_circle'}</span>
                {loading ? 'Saving...' : 'Confirm & Continue'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
