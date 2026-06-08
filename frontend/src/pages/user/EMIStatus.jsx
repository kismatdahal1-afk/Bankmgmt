import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { formatCurrency, calculateProgress, formatDate } from '../../utils/helpers'
import StatusBadge from '../../components/common/StatusBadge'

export default function UserEMIStatus() {
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/customer/loans')
      .then(r => { setLoans(r.data.loans || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const activeLoans = (loans || []).filter(l => l.status === 'approved' || l.status === 'fully_paid')
  const overdueCount = activeLoans.filter(l => l.is_overdue).length

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">EMI Status</div>
          <div className="page-subtitle">View your equated monthly installment progress.</div>
        </div>
      </div>

      {loading ? (
        <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>
      ) : activeLoans.length > 0 ? (
        <>
          {overdueCount > 0 && (
            <div className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '0.9rem', textTransform: 'none', letterSpacing: '0', fontWeight: 500 }}>
              <span className="material-symbols-rounded">warning</span>
              You have {overdueCount} overdue loan{overdueCount > 1 ? 's' : ''}. Please make payments immediately.
            </div>
          )}
          <div className="grid grid-2">
            {activeLoans.map(loan => {
              const paid = parseFloat(loan.total_paid)
              const total = parseFloat(loan.total_payable)
              const remaining = total - paid
              const progress = calculateProgress(paid, total)
              const remainingEmis = loan.remaining_emis || (loan.emi > 0 ? Math.ceil(remaining / parseFloat(loan.emi)) : 0)
              const status = loan.is_overdue ? 'overdue' : loan.status
              return (
                <div className="loan-card" key={loan.id} style={loan.is_overdue ? { borderLeft: '3px solid var(--danger)' } : {}}>
                  <div className="loan-head">
                    <div>
                      <div className="loan-num">{loan.loan_number}</div>
                      <div className="text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                        Principal &middot; {formatCurrency(loan.amount)}
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

                  {loan.repayments?.length > 0 && (
                    <details style={{ marginTop: '12px' }}>
                      <summary style={{ fontSize: '0.8rem', color: 'var(--accent-color)', cursor: 'pointer' }}>
                        View Repayment History ({loan.repayments.length})
                      </summary>
                      <div style={{ marginTop: '8px' }}>
                        {loan.repayments.map(r => (
                          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>EMI-{r.emi_number || '—'}</span>
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
            })}
          </div>
        </>
      ) : (
        <div className="empty">
          <span className="material-symbols-rounded" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>calendar_month</span>
          <div>No active loans with EMI schedules.</div>
        </div>
      )}
    </>
  )
}
