import React, { useState, useEffect, useMemo } from 'react'
import { adminDisbursedLoans } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'
import EmptyState from '../../components/common/EmptyState'
import Pagination from '../../components/common/Pagination'

const STATUS_MAP = { approved:'badge-success', disbursed:'badge-success' }

export default function AdminDisbursedLoans() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    adminDisbursedLoans()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loans = (data?.disbursed_loans || []).filter(l =>
    !search || l.customer_name?.toLowerCase().includes(search.toLowerCase()) || l.application_number?.toLowerCase().includes(search.toLowerCase())
  )
  const paginatedLoans = useMemo(() => loans.slice((currentPage - 1) * pageSize, currentPage * pageSize), [loans, currentPage, pageSize])

  useEffect(() => { setCurrentPage(1) }, [loans.length])

  if (loading) return <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /></div>
  if (!data) return <div className="empty"><span className="material-symbols-rounded">error</span><div>Failed to load</div></div>

  if (selectedLoan) {
    const l = selectedLoan
    return (
      <>
        <div className="page-header">
          <div>
            <div className="page-title">Disbursement Detail</div>
            <div className="page-subtitle"><span className="mono">{l.application_number}</span> &mdash; {l.customer_name}</div>
          </div>
          <button className="btn btn-secondary" onClick={() => setSelectedLoan(null)}>
            <span className="material-symbols-rounded">arrow_back</span> Back
          </button>
        </div>
        <div className="grid-stats">
          <div className="card-stat"><div className="stat-title">Disbursed Amount</div><div className="stat-value">{formatCurrency(l.amount)}</div></div>
          <div className="card-stat"><div className="stat-title">Disbursement Date</div><div className="stat-value" style={{ fontSize: '1.2rem' }}>{l.approved_at ? formatDate(l.approved_at) : '—'}</div></div>
          <div className="card-stat stat-success"><div className="stat-title">Status</div><div className="stat-value" style={{ fontSize: '1.2rem', textTransform: 'capitalize' }}>{l.status.replace(/_/g, ' ')}</div></div>
        </div>
        <div className="card">
          <div className="card-title">Approval History</div>
          <div className="timeline-vertical">
            {(l.status_history || []).slice().reverse().map(h => (
              <div key={h.id} className="tlv-item">
                <div className="tlv-dot" style={{
                  background: h.new_status === 'approved' ? 'var(--success)' : h.new_status === 'submitted' ? 'var(--accent-color)' : 'var(--text-muted)'
                }} />
                <div className="tlv-content">
                  <div style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{h.new_status.replace(/_/g, ' ')}</div>
                  {h.remarks && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{h.remarks}</div>}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.changed_by ? `by ${h.changed_by_role || h.changed_by}` : ''} &middot; {h.changed_at ? formatDate(h.changed_at) : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Disbursed Loans</div>
          <div className="page-subtitle">Approved loans where funds have been released</div>
        </div>
        <input className="form-control" style={{ maxWidth: 280 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid-stats">
        <div className="card-stat stat-success">
          <div className="stat-title">Total Disbursed</div>
          <div className="stat-value">{data.total_disbursed || 0}</div>
        </div>
        <div className="card-stat">
          <div className="stat-title">Today's Disbursement</div>
          <div className="stat-value">{data.todays_disbursement || 0}</div>
          <div className="stat-sub">as of today</div>
        </div>
        <div className="card-stat">
          <div className="stat-title">Monthly Total</div>
          <div className="stat-value">{formatCurrency(data.monthly_total || 0)}</div>
        </div>
        <div className="card-stat">
          <div className="stat-title">Average Loan Size</div>
          <div className="stat-value">{formatCurrency(data.average_loan_size || 0)}</div>
        </div>
      </div>

      {loans.length === 0 ? (
        <EmptyState icon="payments" message="No disbursed loans found." />
      ) : (
        <div className="table-container">
          <div className="table-header-bar">
            <span className="table-title">{loans.length} Disbursed Loan{loans.length !== 1 ? 's' : ''}</span>
          </div>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Disbursement Date</th>
                <th>Loan Type</th>
                <th>Processed By</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLoans.map(l => (
                <tr key={l.id}>
                  <td><span className="mono">{l.application_number}</span></td>
                  <td style={{ fontWeight: 600 }}>{l.customer_name || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(l.amount)}</td>
                  <td>{l.approved_at ? formatDate(l.approved_at) : '—'}</td>
                  <td>{l.loan_type || '—'}</td>
                  <td>{l.assigned_staff_name || '—'}</td>
                  <td><span className={`badge ${STATUS_MAP[l.status] || 'badge-muted'}`}>{l.status.replace(/_/g, ' ')}</span></td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => setSelectedLoan(l)}>
                      <span className="material-symbols-rounded" style={{ fontSize: 14 }}>visibility</span> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination currentPage={currentPage} totalItems={loans.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
        </div>
      )}
    </>
  )
}
