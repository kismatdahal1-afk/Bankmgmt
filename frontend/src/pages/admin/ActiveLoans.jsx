import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminActiveLoans } from '../../services/loanApplicationService'
import { formatCurrency, formatDate, calculateProgress } from '../../utils/helpers'
import EmptyState from '../../components/common/EmptyState'
import Pagination from '../../components/common/Pagination'

export default function AdminActiveLoans() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [healthFilter, setHealthFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    adminActiveLoans()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loans = (data?.loans || []).filter(l => {
    if (search && !l.loan_number?.toLowerCase().includes(search.toLowerCase()) && !l.customer?.full_name?.toLowerCase().includes(search.toLowerCase())) return false
    if (healthFilter === 'healthy' && (l.is_overdue || l.remaining_emis <= 0)) return false
    if (healthFilter === 'overdue' && !l.is_overdue) return false
    if (healthFilter === 'at_risk' && l.is_overdue) return false
    return true
  })
  const paginatedLoans = useMemo(() => loans.slice((currentPage - 1) * pageSize, currentPage * pageSize), [loans, currentPage, pageSize])

  useEffect(() => { setCurrentPage(1) }, [loans.length])

  if (loading) return <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /></div>
  if (!data) return <div className="empty"><span className="material-symbols-rounded">error</span><div>Failed to load</div></div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Active Loans</div>
          <div className="page-subtitle">Monitor all active loans, payments, and health</div>
        </div>
      </div>

      <div className="grid-stats">
        <div className="card-stat">
          <div className="stat-title">Total Active Loans</div>
          <div className="stat-value">{data.total_active || 0}</div>
        </div>
        <div className="card-stat stat-warning">
          <div className="stat-title">Outstanding Balance</div>
          <div className="stat-value">{formatCurrency(data.outstanding_balance || 0)}</div>
        </div>
        <div className="card-stat">
          <div className="stat-title">Monthly EMI Collection</div>
          <div className="stat-value">{formatCurrency(data.monthly_emi_collection || 0)}</div>
        </div>
        <div className="card-stat">
          <div className="stat-title">Upcoming Payments</div>
          <div className="stat-value">{data.upcoming_payments || 0}</div>
          <div className="stat-sub">Due within 7 days</div>
        </div>
        <div className="card-stat stat-danger">
          <div className="stat-title">Overdue Accounts</div>
          <div className="stat-value">{data.overdue_accounts || 0}</div>
          <div className="stat-sub">Require immediate attention</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="form-control" style={{ maxWidth: 300 }} placeholder="Search by Loan ID or Borrower name..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="filter-tabs" style={{ marginBottom: 0 }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'healthy', label: 'Healthy' },
              { key: 'overdue', label: 'Overdue' },
              { key: 'at_risk', label: 'At Risk' }
            ].map(f => (
              <button key={f.key} className={`btn btn-sm ${healthFilter === f.key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setHealthFilter(f.key)}>{f.label}</button>
            ))}
          </div>
        </div>
      </div>

      {loans.length === 0 ? (
        <EmptyState icon="request_quote" message="No active loans found." />
      ) : (
        <div className="table-container">
          <div className="table-header-bar">
            <span className="table-title">{loans.length} Active Loan{loans.length !== 1 ? 's' : ''}</span>
          </div>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Borrower</th>
                <th>Loan Type</th>
                <th>Outstanding</th>
                <th>EMI</th>
                <th>Remaining</th>
                <th>Last Payment</th>
                <th>Next Payment</th>
                <th>Health</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLoans.map(loan => {
                const paid = parseFloat(loan.total_paid || 0)
                const total = parseFloat(loan.total_payable || 1)
                const outstanding = total - paid
                const progress = calculateProgress(paid, total)
                const nextDue = loan.last_payment_date
                  ? new Date(new Date(loan.last_payment_date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
                  : loan.approved_date
                  ? new Date(new Date(loan.approved_date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
                  : null

                return (
                  <tr key={loan.id} style={loan.is_overdue ? { borderLeft: '3px solid var(--danger)' } : {}}>
                    <td><span className="mono">{loan.loan_number}</span></td>
                    <td style={{ fontWeight: 600 }}>{loan.customer?.full_name || '—'}</td>
                    <td>—</td>
                    <td style={{ fontWeight: 600, color: 'var(--warning)' }}>{formatCurrency(Math.max(0, outstanding))}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(loan.emi)}</td>
                    <td>{loan.remaining_emis || 0} mo</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{loan.last_payment_date ? formatDate(loan.last_payment_date) : '—'}</td>
                    <td style={{ color: loan.is_overdue ? 'var(--danger)' : 'var(--text-secondary)', fontSize: 13 }}>
                      {nextDue ? formatDate(nextDue) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 100 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span style={{ color: loan.is_overdue ? 'var(--danger)' : 'var(--success)' }}>
                            {loan.is_overdue ? 'OVERDUE' : 'ON TIME'}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>{progress}%</span>
                        </div>
                        <div style={{ width: '100%', height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            width: `${progress}%`, height: '100%',
                            background: loan.is_overdue ? 'var(--danger)' : 'var(--success)',
                            borderRadius: 2, transition: 'width 0.3s'
                          }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-primary" onClick={() => navigate(`/admin/emi`, { state: { loanId: loan.id } })}>
                          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>visibility</span>
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/admin/loans/repay/${loan.id}`)}>
                          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>payments</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Pagination currentPage={currentPage} totalItems={loans.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
        </div>
      )}
    </>
  )
}
