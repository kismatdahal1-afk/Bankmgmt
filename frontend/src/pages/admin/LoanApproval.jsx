import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { adminListLoanApplications } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'
import EmptyState from '../../components/common/EmptyState'

const STATUS_MAP = {
  draft:'badge-muted', submitted:'badge-warning', under_review:'badge-info',
  clarification_required:'badge-warning', documents_verified:'badge-info',
  visit_scheduled:'badge-info', final_review:'badge-warning',
  approved:'badge-success', rejected:'badge-danger', disbursed:'badge-success'
}

const FILTERS = [
  { key:'documents_verified', label:'Verified' },
  { key:'visit_scheduled', label:'Visit Scheduled' },
  { key:'final_review', label:'Final Review' },
  { key:'approved', label:'Approved' },
  { key:'rejected', label:'Rejected' }
]

export default function AdminLoanApproval() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(statusParam || 'final_review')

  const fetch = useCallback(() => {
    setLoading(true)
    adminListLoanApplications(filter)
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
          <div className="page-title">Verified Loan Applications</div>
          <div className="page-subtitle">Review and make final decisions</div>
        </div>
      </div>

      <div className="filter-tabs">
        {FILTERS.map(f => (
          <button key={f.key} className={`btn btn-sm ${filter===f.key?'btn-primary':'btn-secondary'}`} onClick={()=>{setFilter(f.key);navigate(`/admin/loan-approval?status=${f.key}`,{replace:true})}}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /></div>
      ) : applications.length === 0 ? (
        <EmptyState icon="verified" message="No applications found for this status." />
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr><th>App ID</th><th>Customer</th><th>Amount</th><th>Loan Type</th><th>Staff</th><th>Appointment</th><th>Status</th><th>Risk</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {applications.map(app => {
                const risk = app.amount > 500000 ? 'high' : app.amount > 100000 ? 'medium' : 'low'
                return (
                  <tr key={app.id}>
                    <td><span className="mono">{app.application_number}</span></td>
                    <td>{app.customer_name}</td>
                    <td>{formatCurrency(app.amount)}</td>
                    <td>{app.loan_type}</td>
                    <td>{app.assigned_staff_name || '—'}</td>
                    <td>{app.appointment_date ? formatDate(app.appointment_date) : '—'}</td>
                    <td><span className={`badge ${STATUS_MAP[app.status]}`}>{app.status.replace(/_/g,' ')}</span></td>
                    <td><span className={`risk-badge ${risk}`}>{risk.toUpperCase()}</span></td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={()=>navigate(`/admin/loan-approval/${app.id}`)}>
                        <span className="material-symbols-rounded" style={{fontSize:'16px'}}>visibility</span> Review
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
