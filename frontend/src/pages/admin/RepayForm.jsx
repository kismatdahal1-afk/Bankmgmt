import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { formatCurrency } from '../../utils/helpers'
import PaymentStatusBadge from '../../components/common/PaymentStatusBadge'

export default function AdminRepayForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loan, setLoan] = useState(null)
  const [activeAccount, setActiveAccount] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/loans/${id}`)
      .then(r => r.json())
      .then(d => {
        setLoan(d.loan || d)
        setLoading(false)
        if (d.loan?.customer?.accounts) {
          const aa = d.loan.customer.accounts.find(a => a.status === 'active')
          setActiveAccount(aa || null)
        }
      })
      .catch(() => setLoading(false))
  }, [id])

  const remainingBalance = loan ? parseFloat(loan.total_payable) - parseFloat(loan.total_paid) : 0
  const emiVal = parseFloat(loan?.emi || 0)
  const overdueDays = loan?.overdue_days || 0
  const overdueEmis = loan?.overdue_emis_count || 0
  const latePenalty = loan?.late_penalty || 0
  const totalPayable = emiVal + latePenalty
  const paymentStatus = loan?.payment_status || 'current'
  const minAmount = Math.max(emiVal, totalPayable)
  const defaultAmount = latePenalty > 0 ? totalPayable : Math.min(emiVal, remainingBalance)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    try {
      const res = await fetch(`/api/loans/repay/${id}`, { method: 'POST', body: new URLSearchParams(formData) })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      navigate('/admin/loans')
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>Record Loan Repayment</h1>
          <p>Process credit instalment payments against active contracts</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
        <Link to="/admin/loans" className="btn btn-secondary">
          <span className="material-symbols-rounded">arrow_back</span>
          Back to Loans
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div className="form-card" style={{ flex: 1, maxWidth: '500px' }}>
          <form onSubmit={handleSubmit}>
            <h3 style={{ marginBottom: '20px', color: '#fff' }}>Record Payment Details</h3>

            {paymentStatus === 'overdue' && (
              <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '10px', background: overdueDays <= 7 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${overdueDays <= 7 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <PaymentStatusBadge status="overdue" overdueDays={overdueDays} showDetail />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{overdueEmis} overdue installment{overdueEmis > 1 ? 's' : ''}</span>
                </div>
                {overdueDays <= 7 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--warning)' }}>Grace period active — no late penalty charged. Pay only the EMI amount.</div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>Late penalty of <strong>{formatCurrency(latePenalty)}</strong> applied (5% of EMI). This penalty has been applied once and will not increase.</div>
                )}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="amount">Repayment Amount (NPR)</label>
              <input type="number" id="amount" name="amount" className="form-control"
                step="0.01" min={minAmount.toFixed(2)} max={remainingBalance.toFixed(2)}
                defaultValue={defaultAmount.toFixed(2)} required />
            </div>

            <div className="form-group">
              <label>Payment Method</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <input type="radio" name="payment_method" value="cash" defaultChecked style={{ accentColor: 'var(--accent-color)' }} />
                  Cash Repayment (Physical ledger deposit)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <input type="radio" name="payment_method" value="account" disabled={!activeAccount} style={{ accentColor: 'var(--accent-color)' }} />
                  Debit Savings Account
                  {activeAccount ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      (Acc: {activeAccount.account_number} - Bal: {formatCurrency(activeAccount.balance)})
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>
                      (No active savings account registered)
                    </span>
                  )}
                </label>
              </div>
            </div>
            <button type="submit" className="btn btn-success" style={{ width: '100%', marginTop: '20px' }}>
              <span className="material-symbols-rounded">payments</span>
              Record Repayment
            </button>
          </form>
        </div>

        <div className="form-card" style={{ flex: 1, maxWidth: '400px', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <h3 style={{ marginBottom: '20px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--warning)' }}>info</span>
            Payment Summary
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Contract ID:</span>
              <code style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fff' }}>{loan?.application_number || loan?.loan_number}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Borrower:</span>
              <span style={{ fontWeight: 600, color: '#fff' }}>{loan?.customer?.full_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Payment Status:</span>
              <PaymentStatusBadge status={paymentStatus} overdueDays={overdueDays} showDetail />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Monthly EMI:</span>
              <span style={{ fontWeight: 700, color: '#fff' }}>{formatCurrency(emiVal)}</span>
            </div>
            {latePenalty > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Late Penalty (5%):</span>
                <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{formatCurrency(latePenalty)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--accent-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Payable:</span>
              <span style={{ fontWeight: 800, color: 'var(--accent-color)', fontSize: '1.1rem' }}>{formatCurrency(totalPayable)}</span>
            </div>
            {loan?.overdue_days > 7 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                * Late penalty of 5% applied once per overdue installment after 7-day grace period. Penalty does not compound daily.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
