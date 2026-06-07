import React, { useState } from 'react'
import { calculateEMI } from '../../utils/helpers'
import { formatCurrency } from '../../utils/helpers'

export default function LoanForm({ customers, onSubmit }) {
  const [principal, setPrincipal] = useState(0)
  const [rate, setRate] = useState(0)
  const [duration, setDuration] = useState(0)
  const estimate = calculateEMI(principal, rate, duration)

  return (
    <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start' }}>
      <div className="form-card" style={{ flex: 1, maxWidth: '550px' }}>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="customer_id">Select Borrower</label>
            <select id="customer_id" name="customer_id" className="form-control" required>
              <option value="" disabled selected>-- Choose Customer --</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="amount">Loan Principal Amount (NPR)</label>
            <input
              type="number" id="amount" name="amount" className="form-control"
              step="0.01" min="1.00" placeholder="0.00" required
              onChange={(e) => setPrincipal(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="interest_rate">Annual Interest Rate (%)</label>
              <input
                type="number" id="interest_rate" name="interest_rate" className="form-control"
                step="0.01" min="0.00" placeholder="e.g. 12.0" required
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="duration_months">Duration Term (Months)</label>
              <input
                type="number" id="duration_months" name="duration_months" className="form-control"
                min="1" max="120" placeholder="e.g. 12" required
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }}>
            <span className="material-symbols-rounded">send</span>
            Submit Application
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
            <span id="est-emi" style={{ fontWeight: 700, color: '#fff', fontSize: '1.2rem' }}>{formatCurrency(estimate.emi)}</span>
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
  )
}
