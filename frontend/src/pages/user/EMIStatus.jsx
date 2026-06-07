import React, { useState, useEffect } from 'react'
import { formatCurrency, calculateProgress } from '../../utils/helpers'
import StatusBadge from '../../components/common/StatusBadge'

export default function UserEMIStatus() {
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/customer/loans')
      .then(r => r.json())
      .then(d => { setLoans(d.loans || d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const activeLoans = (loans || []).filter(l => l.status === 'approved' || l.status === 'fully_paid')

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
        <div className="grid grid-2">
          {activeLoans.map(loan => {
            const paid = parseFloat(loan.total_paid)
            const total = parseFloat(loan.total_payable)
            const remaining = total - paid
            const progress = calculateProgress(paid, total)
            const remainingEmis = loan.emi > 0 ? Math.ceil(remaining / parseFloat(loan.emi)) : 0
            return (
              <div className="loan-card" key={loan.id}>
                <div className="loan-head">
                  <div>
                    <div className="loan-num">{loan.loan_number}</div>
                    <div className="text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                      Principal &middot; {formatCurrency(loan.amount)}
                    </div>
                  </div>
                  <StatusBadge status={loan.status} />
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

                {loan.status !== 'rejected' && loan.status !== 'pending' && (
                  <>
                    <div className="loan-progress-meta">
                      <span>Repaid {formatCurrency(paid)} / {formatCurrency(total)}</span>
                      <span><strong>{progress}%</strong> &middot; ~{remainingEmis} EMIs left</span>
                    </div>
                    <div className="progress">
                      <div className={`progress-bar ${loan.status === 'fully_paid' ? 'success' : ''}`} style={{ width: `${progress}%` }} />
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty">
          <span className="material-symbols-rounded" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>calendar_month</span>
          <div>No active loans with EMI schedules.</div>
        </div>
      )}
    </>
  )
}
