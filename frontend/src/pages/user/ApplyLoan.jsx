import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { formatCurrency, calculateEMI } from '../../utils/helpers'

export default function UserApplyLoan() {
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [rate, setRate] = useState('')
  const [duration, setDuration] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const p = parseFloat(amount) || 0
  const r = parseFloat(rate) || 0
  const n = parseInt(duration) || 0
  const estimate = calculateEMI(p, r, n)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const res = await api.post('/customer/loans/apply', {
        amount,
        interest_rate: rate,
        duration_months: duration
      })
      if (res.data.error) {
        setError(res.data.error)
      } else {
        setSuccess('Loan application submitted successfully!')
        setTimeout(() => navigate('/user/my-loans'), 1500)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit loan application')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Apply for Loan</div>
          <div className="page-subtitle">Submit a new loan request for approval.</div>
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

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div className="form-card" style={{ flex: 1, maxWidth: '550px' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="amount">Loan Principal Amount (NPR)</label>
              <input type="number" id="amount" name="amount" className="form-control"
                step="0.01" min="1.00" placeholder="0.00" required
                value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="interest_rate">Annual Interest Rate (%)</label>
                <input type="number" id="interest_rate" name="interest_rate" className="form-control"
                  step="0.01" min="0.00" placeholder="e.g. 12.0" required
                  value={rate} onChange={(e) => setRate(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="duration_months">Duration Term (Months)</label>
                <input type="number" id="duration_months" name="duration_months" className="form-control"
                  min="1" max="120" placeholder="e.g. 12" required
                  value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }} disabled={submitting}>
              <span className="material-symbols-rounded">{submitting ? 'sync' : 'send'}</span>
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>

        <div className="form-card" style={{ flex: 1, maxWidth: '400px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderStyle: 'dashed' }}>
          <h3 style={{ marginBottom: '20px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--accent-color)' }}>calculate</span>
            Instalment Estimator
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Estimated Monthly Payment (EMI):</span>
              <span style={{ fontWeight: 700, color: '#fff', fontSize: '1.2rem' }}>{formatCurrency(estimate.emi)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Interest Charges:</span>
              <span style={{ fontWeight: 700, color: 'var(--warning)', fontSize: '1.1rem' }}>{formatCurrency(estimate.totalInterest)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Repayable Value:</span>
              <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '1.2rem' }}>{formatCurrency(estimate.totalPayable)}</span>
            </div>
          </div>
          <p style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            *Calculated values are based on reducing-balance interest compounding formulas. Final contracts disburse funds immediately upon Admin approval.
          </p>
        </div>
      </div>
    </>
  )
}
