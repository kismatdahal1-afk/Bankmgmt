import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../../services/api'
import { formatCurrency, calculateProgress, formatDate } from '../../utils/helpers'
import StatusBadge from '../../components/common/StatusBadge'
import EmptyState from '../../components/common/EmptyState'

export default function UserMyLoans() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [payingLoan, setPayingLoan] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  const loadLoans = () => {
    api.get('/customer/loans')
      .then(r => { setLoans(r.data.loans || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadLoans() }, [location.pathname])

  const activeLoans = (loans || []).filter(l => l.status === 'approved' || l.status === 'fully_paid')
  const overdueCount = activeLoans.filter(l => l.is_overdue).length

  const openPayModal = (loan) => {
    setPayingLoan(loan)
    setPayAmount(String(parseFloat(loan.emi)))
    setPayError('')
  }

  const closePayModal = () => {
    setPayingLoan(null)
    setPayAmount('')
    setPayError('')
  }

  const handlePay = async (e) => {
    e.preventDefault()
    setPaying(true)
    setPayError('')
    try {
      await api.post(`/customer/loans/repay/${payingLoan.id}`, { amount: payAmount })
      closePayModal()
      loadLoans()
    } catch (err) {
      setPayError(err.response?.data?.error || 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">My Loans</div>
          <div className="page-subtitle">Track active loans, repayments and history.</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/user/loans/apply')}>
          <span className="material-symbols-rounded">add</span>
          New Loan
        </button>
      </div>

      {loading ? (
        <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>
      ) : loans.length > 0 ? (
        <>
          {overdueCount > 0 && (
            <div className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '0.9rem', textTransform: 'none', letterSpacing: '0', fontWeight: 500, width: 'fit-content' }}>
              <span className="material-symbols-rounded">warning</span>
              You have {overdueCount} overdue loan{overdueCount > 1 ? 's' : ''}. Please make payments immediately.
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '16px', gap: '8px' }}>
            <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>{loans.length} Total</span>
            <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>{activeLoans.length} Active</span>
          </div>

          <div className="grid grid-2">
            {loans.map(loan => {
              const isActive = loan.status === 'approved' || loan.status === 'fully_paid'
              const paid = parseFloat(loan.total_paid)
              const total = parseFloat(loan.total_payable)
              const remaining = total - paid
              const progress = calculateProgress(paid, total)
              const remainingEmis = loan.remaining_emis || (loan.emi > 0 ? Math.ceil(remaining / parseFloat(loan.emi)) : 0)
              const status = loan.is_overdue ? 'overdue' : loan.status
              const canPay = loan.status === 'approved' && remaining > 0

              if (isActive) {
                return (
                  <div className="loan-card" key={loan.id} style={loan.is_overdue ? { borderLeft: '3px solid var(--danger)' } : {}}>
                    <div className="loan-head">
                      <div>
                        <div className="loan-num">{loan.loan_number}</div>
                        <div className="text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                          Principal &middot; {formatCurrency(loan.amount)} &middot; {loan.interest_rate}% p.a.
                        </div>
                      </div>
                      <StatusBadge status={status} />
                    </div>

                    <div className="loan-grid">
                      <div className="loan-stat">
                        <div className="label">EMI</div>
                        <div className="value">{formatCurrency(loan.emi)}/mo</div>
                      </div>
                      <div className="loan-stat">
                        <div className="label">Paid</div>
                        <div className="value">{formatCurrency(paid)}</div>
                      </div>
                      <div className="loan-stat">
                        <div className="label">Remaining</div>
                        <div className="value">{formatCurrency(Math.max(0, remaining))}</div>
                      </div>
                    </div>

                    <div className="loan-progress-meta">
                      <span>Repaid {formatCurrency(paid)} / {formatCurrency(total)}</span>
                      <span><strong>{progress}%</strong> &middot; {remainingEmis} EMIs left</span>
                    </div>
                    <div className="progress">
                      <div className={`progress-bar ${loan.status === 'fully_paid' ? 'success' : ''}`}
                        style={{ width: `${progress}%`, background: loan.is_overdue ? 'var(--danger)' : '' }} />
                    </div>

                    {canPay && (
                      <button className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} onClick={() => openPayModal(loan)}>
                        <span className="material-symbols-rounded">payments</span>
                        Pay EMI
                      </button>
                    )}

                    {loan.repayments?.length > 0 && (
                      <details style={{ marginTop: '12px' }}>
                        <summary style={{ fontSize: '0.8rem', color: 'var(--accent-color)', cursor: 'pointer' }}>
                          View Repayment History ({loan.repayments.length})
                        </summary>
                        <div style={{ marginTop: '8px' }}>
                          {loan.repayments.map(r => (
                            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>EMI-{r.emi_number || '\u2014'}</span>
                              <span style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(r.amount)}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{formatDate(r.repayment_date)}</span>
                              <StatusBadge status={r.status || 'paid'} />
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )
              }

              return (
                <div className="loan-card" key={loan.id}>
                  <div className="loan-head">
                    <div>
                      <div className="loan-num">{loan.loan_number}</div>
                      <div className="text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                        Principal &middot; {formatCurrency(loan.amount)} &middot; {loan.interest_rate}% p.a.
                      </div>
                    </div>
                    <StatusBadge status={loan.status} />
                  </div>
                  <div className="loan-grid">
                    <div className="loan-stat">
                      <div className="label">Interest</div>
                      <div className="value">{loan.interest_rate}%</div>
                    </div>
                    <div className="loan-stat">
                      <div className="label">EMI</div>
                      <div className="value">{formatCurrency(loan.emi)}</div>
                    </div>
                    <div className="loan-stat">
                      <div className="label">Total</div>
                      <div className="value">{formatCurrency(loan.total_payable)}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <EmptyState icon="request_quote" message="You don't have any loans on record." />
      )}

      {payingLoan && (
        <div className="modal-overlay" onClick={closePayModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Pay EMI</h2>
              <button className="modal-close" onClick={closePayModal}><span className="material-symbols-rounded">close</span></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                Loan: <strong style={{ color: '#fff' }}>{payingLoan.loan_number}</strong>
                &nbsp;&middot;&nbsp;Outstanding: <strong style={{ color: '#fff' }}>{formatCurrency(Math.max(0, parseFloat(payingLoan.total_payable) - parseFloat(payingLoan.total_paid)))}</strong>
              </p>
              {payError && (
                <div className="badge badge-danger" style={{ marginBottom: '12px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'none', fontWeight: 500, fontSize: '13px', letterSpacing: '0' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>error</span>
                  {payError}
                </div>
              )}
              <form onSubmit={handlePay}>
                <div className="form-group">
                  <label htmlFor="pay-amount">Amount (NPR)</label>
                  <input type="number" id="pay-amount" className="form-control"
                    step="0.01" min="1" required
                    value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Amount will be deducted from your active account balance.
                </p>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={paying}>
                  <span className="material-symbols-rounded">{paying ? 'sync' : 'check'}</span>
                  {paying ? 'Processing...' : 'Confirm Payment'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .modal {
          background: #151a22; border: 1px solid var(--border-color);
          border-radius: 12px; width: 100%; max-width: 440px; padding: 0;
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 24px; border-bottom: 1px solid var(--border-color);
        }
        .modal-header h2 { margin: 0; font-size: 1.1rem; color: #fff; }
        .modal-close {
          background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px;
        }
        .modal-close:hover { color: #fff; }
        .modal-body { padding: 24px; }
      `}</style>
    </>
  )
}
