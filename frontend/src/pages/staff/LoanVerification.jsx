import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { staffListLoanApplications } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'
import EmptyState from '../../components/common/EmptyState'

const STATUS_MAP = {
  draft:'badge-muted', submitted:'badge-warning', under_review:'badge-info',
  clarification_required:'badge-warning', documents_verified:'badge-success',
  visit_scheduled:'badge-info', final_review:'badge-warning',
  approved:'badge-success', rejected:'badge-danger', disbursed:'badge-success'
}

const FILTERS = [
  { key: 'submitted', label: 'Pending' },
  { key: 'clarification_required', label: 'Clarification' },
  { key: 'documents_verified', label: 'Verified' },
  { key: 'visit_scheduled', label: 'Visits' },
  { key: 'final_review', label: 'Final Review' }
]

export default function StaffLoanVerification() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(statusParam || 'submitted')

  const fetch = useCallback(() => {
    setLoading(true)
    staffListLoanApplications(filter)
      .then(res => setApplications(res.data.applications || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { fetch() }, [fetch])
  useEffect(() => { if (statusParam) setFilter(statusParam) }, [statusParam])



  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Loan Applications</div>
          <div className="page-subtitle">Review and verify customer applications</div>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/staff/loan-verification')}>
          <span className="material-symbols-rounded">dashboard</span> All
        </button>
      </div>

      <div className="filter-tabs">
        {FILTERS.map(f => (
          <button key={f.key} className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setFilter(f.key); navigate(`/staff/loan-verification?status=${f.key}`, { replace: true }) }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /></div>
      ) : applications.length === 0 ? (
        <EmptyState icon="fact_check" message="No loan applications found for this status." />
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>App ID</th>
                <th>Customer</th>
                <th>Loan Type</th>
                <th>Amount</th>
                <th>Submitted</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(app => {
                const daysOld = app.submitted_at ? Math.floor((new Date() - new Date(app.submitted_at)) / (1000*60*60*24)) : 0
                const priority = daysOld > 7 ? 'high' : daysOld > 3 ? 'medium' : 'low'
                return (
                  <tr key={app.id} className={priority === 'high' ? 'priority-high' : priority === 'medium' ? 'priority-medium' : ''}>
                    <td><span className="mono">{app.application_number}</span></td>
                    <td>{app.customer_name}</td>
                    <td>{app.loan_type}</td>
                    <td>{formatCurrency(app.amount)}</td>
                    <td>{formatDate(app.submitted_at)}</td>
                    <td>
                      <span className={`priority-badge ${priority}`}>
                        {priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢'} {daysOld}d
                      </span>
                    </td>
                    <td><span className={`badge ${STATUS_MAP[app.status] || 'badge-muted'}`}>{app.status.replace(/_/g, ' ')}</span></td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => navigate(`/staff/loan-verification/${app.id}`)}>
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>visibility</span> Review
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
