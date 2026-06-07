import React from 'react'
import { formatCurrency, calculateProgress } from '../../utils/helpers'
import StatusBadge from '../common/StatusBadge'

export default function LoanCard({ loan }) {
  const progress = calculateProgress(parseFloat(loan.total_paid), parseFloat(loan.total_payable))
  const status = loan.is_overdue ? 'overdue' : loan.status

  return (
    <div className="loan-card" style={loan.is_overdue ? { borderLeft: '3px solid var(--danger)' } : {}}>
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

      {loan.status !== 'rejected' && loan.status !== 'pending' && (
        <>
          <div className="loan-progress-meta">
            <span>Repaid {formatCurrency(loan.total_paid)} / {formatCurrency(loan.total_payable)}</span>
            <span><strong>{progress}%</strong></span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${progress}%`, background: loan.is_overdue ? 'var(--danger)' : '' }} />
          </div>
        </>
      )}
    </div>
  )
}
