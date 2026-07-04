import React, { useState, useEffect, useMemo } from 'react'
import { adminClosedLoans } from '../../services/loanApplicationService'
import { formatCurrency, formatDate, calculateProgress } from '../../utils/helpers'
import EmptyState from '../../components/common/EmptyState'
import Pagination from '../../components/common/Pagination'

export default function AdminClosedLoans() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    adminClosedLoans()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loans = (data?.loans || []).filter(l =>
    !search || l.loan_number?.toLowerCase().includes(search.toLowerCase()) || l.customer?.full_name?.toLowerCase().includes(search.toLowerCase())
  )
  const paginatedLoans = useMemo(() => loans.slice((currentPage - 1) * pageSize, currentPage * pageSize), [loans, currentPage, pageSize])

  useEffect(() => { setCurrentPage(1) }, [loans.length])

  if (loading) return <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /></div>
  if (!data) return <div className="empty"><span className="material-symbols-rounded">error</span><div>Failed to load</div></div>

  if (selectedLoan) {
    const l = selectedLoan
    const paid = parseFloat(l.total_paid || 0)
    const total = parseFloat(l.total_payable || 1)
    const progress = calculateProgress(paid, total)
    return (
      <>
        <div className="page-header">
          <div>
            <div className="page-title">Closed Loan Detail</div>
            <div className="page-subtitle"><span className="mono">{l.loan_number}</span></div>
          </div>
          <button className="btn btn-secondary" onClick={() => setSelectedLoan(null)}>
            <span className="material-symbols-rounded">arrow_back</span> Back
          </button>
        </div>
        <div className="grid-stats">
          <div className="card-stat"><div className="stat-title">Original Amount</div><div className="stat-value">{formatCurrency(l.amount)}</div></div>
          <div className="card-stat"><div className="stat-title">Total Paid</div><div className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(paid)}</div></div>
          <div className="card-stat"><div className="stat-title">Loan Duration</div><div className="stat-value">{l.duration_months} mo</div></div>
          <div className="card-stat stat-success"><div className="stat-title">Closing Date</div><div className="stat-value" style={{ fontSize: '1.2rem' }}>{l.last_payment_date ? formatDate(l.last_payment_date) : '—'}</div></div>
        </div>
        <div className="card">
          <div className="card-title">Repayment Summary</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Repayment Progress</span>
            <span style={{ fontWeight: 700, color: 'var(--success)' }}>{progress}%</span>
          </div>
          <div style={{ width: '100%', height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--success)', borderRadius: 4 }} />
          </div>
          <div className="review-item" style={{ marginTop: 16 }}><span>Total Paid</span><span style={{ color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(paid)}</span></div>
          <div className="review-item"><span>Total Payable</span><span>{formatCurrency(total)}</span></div>
          <div className="review-item"><span>Interest Rate</span><span>{l.interest_rate}%</span></div>
          <div className="review-item"><span>EMI</span><span>{formatCurrency(l.emi)}</span></div>
        </div>
        <div className="card">
          <div className="card-title">Payment History</div>
          <table className="custom-table">
            <thead>
              <tr><th>EMI #</th><th>Amount</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {(l.repayments || []).length > 0 ? l.repayments.map(r => (
                <tr key={r.id}>
                  <td><code>EMI-{r.emi_number || '—'}</code></td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(r.amount)}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{formatDate(r.repayment_date)}</td>
                  <td><span className="badge badge-success">Paid</span></td>
                </tr>
              )) : (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No repayment records.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Closed Loans</div>
          <div className="page-subtitle">Archive of fully paid and completed loans</div>
        </div>
        <input className="form-control" style={{ maxWidth: 280 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid-stats">
        <div className="card-stat stat-success">
          <div className="stat-title">Closed This Month</div>
          <div className="stat-value">{data.closed_this_month || 0}</div>
        </div>
        <div className="card-stat">
          <div className="stat-title">Total Closed</div>
          <div className="stat-value">{data.total_closed || 0}</div>
        </div>
        <div className="card-stat">
          <div className="stat-title">Early Closed</div>
          <div className="stat-value">{data.early_closed || 0}</div>
          <div className="stat-sub">Before full term</div>
        </div>
        <div className="card-stat">
          <div className="stat-title">Total Amount Paid</div>
          <div className="stat-value">{formatCurrency(data.total_paid_amount || 0)}</div>
        </div>
      </div>

      {loans.length === 0 ? (
        <EmptyState icon="folder" message="No closed loans found." />
      ) : (
        <div className="table-container">
          <div className="table-header-bar">
            <span className="table-title">{loans.length} Closed Loan{loans.length !== 1 ? 's' : ''}</span>
          </div>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Borrower</th>
                <th>Original Amount</th>
                <th>Closing Date</th>
                <th>Total Paid</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLoans.map(l => {
                const paid = parseFloat(l.total_paid || 0)
                return (
                  <tr key={l.id}>
                    <td><span className="mono">{l.loan_number}</span></td>
                    <td style={{ fontWeight: 600 }}>{l.customer?.full_name || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(l.amount)}</td>
                    <td>{l.last_payment_date ? formatDate(l.last_payment_date) : '—'}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(paid)}</td>
                    <td>{l.duration_months} mo</td>
                    <td><span className="badge badge-success">Closed</span></td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => setSelectedLoan(l)}>
                        <span className="material-symbols-rounded" style={{ fontSize: 14 }}>visibility</span> View
                      </button>
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
