import React from 'react'
import { formatCurrency, calculateProgress } from '../../utils/helpers'
import StatusBadge from '../common/StatusBadge'

export default function LoansTable({ loans, onApprove, onReject, onRepay, userRole }) {
  return (
    <div className="table-container">
      <div className="table-header-bar">
        <span className="table-title">Loan Contracts ledger</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Contracts: {loans?.length || 0}</span>
      </div>
      <table className="custom-table">
        <thead>
          <tr>
            <th>Loan ID</th>
            <th>Member / Account</th>
            <th>Principal</th>
            <th>Rate / Term</th>
            <th>EMI</th>
            <th>Repayment Progress</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Operations</th>
          </tr>
        </thead>
        <tbody>
          {loans?.length > 0 ? loans.map(loan => {
            const progress = calculateProgress(parseFloat(loan.total_paid), parseFloat(loan.total_payable))
            const activeAccount = loan.customer?.accounts?.find(a => a.status === 'active')
            return (
              <tr key={loan.id}>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <code style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{loan.loan_number}</code>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(loan.applied_date).toLocaleDateString()}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{loan.customer?.full_name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {activeAccount ? `Acc: ${activeAccount.account_number}` : 'No active account'}
                    </span>
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(loan.amount)}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 500, color: '#fff' }}>{loan.interest_rate}% P.A.</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{loan.duration_months} Months</span>
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(loan.emi)}/mo</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>
                      {formatCurrency(loan.total_paid)} / {formatCurrency(loan.total_payable)}
                    </span>
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--success)', transition: 'var(--transition)' }} />
                    </div>
                  </div>
                </td>
                <td><StatusBadge status={loan.status} /></td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '8px' }}>
                    {loan.status === 'pending' && userRole === 'admin' && (
                      <>
                        <button onClick={() => onApprove?.(loan.id)} className="btn btn-success btn-sm" title="Approve & Disburse">
                          <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>check_circle</span>
                        </button>
                        <button onClick={() => onReject?.(loan.id)} className="btn btn-danger btn-sm" title="Reject Application">
                          <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>cancel</span>
                        </button>
                      </>
                    )}
                    {loan.status === 'pending' && userRole !== 'admin' && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Admin Approval Required</span>
                    )}
                    {loan.status === 'approved' && (
                      <button onClick={() => onRepay?.(loan.id)} className="btn btn-primary btn-sm">
                        <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>payments</span>
                        Repay
                      </button>
                    )}
                    {['rejected', 'fully_paid'].includes(loan.status) && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Completed</span>
                    )}
                  </div>
                </td>
              </tr>
            )
          }) : (
            <tr>
              <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>handshake</span>
                No loan accounts exist in the portfolio database.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
