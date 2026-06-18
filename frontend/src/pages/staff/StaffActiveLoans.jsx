import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { formatCurrency, formatDate } from '../../utils/helpers'

export default function StaffActiveLoans() {
  const navigate = useNavigate()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/loans')
      .then(res => setLoans(res.data.loans || []))
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  const activeLoans = loans.filter(l => ['approved', 'active', 'disbursed'].includes(l.status))
  const overdueLoans = loans.filter(l => l.is_overdue)
  const completedLoans = loans.filter(l => l.status === 'fully_paid' || l.status === 'closed')

  if (loading) return <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /></div>

  const renderTable = (rows) => (
    <table className="custom-table">
      <thead>
        <tr>
          <th>Loan ID</th>
          <th>Borrower</th>
          <th>Type</th>
          <th>Approved Amount</th>
          <th>EMI</th>
          <th>Next Due</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(loan => (
          <tr key={loan.id}>
            <td><span className="mono">{loan.loan_number}</span></td>
            <td style={{ fontWeight: 600, color: '#fff' }}>{loan.customer?.full_name || '—'}</td>
            <td>{loan.loan_type || '—'}</td>
            <td style={{ fontWeight: 600 }}>{formatCurrency(loan.amount)}</td>
            <td style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{formatCurrency(loan.emi)}</td>
            <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {loan.next_due_date ? formatDate(loan.next_due_date) : '—'}
            </td>
            <td>
              <span className={`badge ${loan.is_overdue ? 'badge-danger' : loan.status === 'disbursed' ? 'badge-success' : loan.status === 'active' ? 'badge-info' : 'badge-muted'}`}>
                {loan.is_overdue ? 'Overdue' : loan.status === 'disbursed' ? 'Active' : loan.status === 'fully_paid' ? 'Completed' : loan.status}
              </span>
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No loans to display.</td></tr>
        )}
      </tbody>
    </table>
  )

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Active Loans</div>
          <div className="page-subtitle">Monitor approved and disbursed loans — read-only.</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>{activeLoans.length} Active</span>
          {overdueLoans.length > 0 && (
            <span className="badge badge-danger" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>{overdueLoans.length} Overdue</span>
          )}
          <span className="badge badge-muted" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>{completedLoans.length} Completed</span>
        </div>
      </div>

      {overdueLoans.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#ef4444', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>warning</span>
            Overdue Loans
            <span className="badge badge-danger" style={{ fontSize: '0.75rem', padding: '2px 10px' }}>{overdueLoans.length}</span>
          </div>
          <div className="table-container">{renderTable(overdueLoans)}</div>
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#10b981' }}>account_balance</span>
          Active & Disbursed Loans
          <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '2px 10px' }}>{activeLoans.length}</span>
        </div>
        <div className="table-container">{renderTable(activeLoans)}</div>
      </div>

      {completedLoans.length > 0 && (
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#64748b' }}>task_alt</span>
            Completed Loans
            <span className="badge badge-muted" style={{ fontSize: '0.75rem', padding: '2px 10px' }}>{completedLoans.length}</span>
          </div>
          <div className="table-container">{renderTable(completedLoans)}</div>
        </div>
      )}
    </>
  )
}
