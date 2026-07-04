import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { staffListLoanApplications } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'
import Pagination from '../../components/common/Pagination'

const PRIORITY_MAP = {
  submitted: { label: 'Newly Submitted', color: '#3b82f6' },
  clarification_required: { label: 'Awaiting Review', color: '#f59e0b' }
}

export default function StaffNewApplications() {
  const navigate = useNavigate()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [submitted, clarification] = await Promise.all([
        staffListLoanApplications('submitted'),
        staffListLoanApplications('clarification_required')
      ])
      setApps([
        ...(submitted.data.applications || []).map(a => ({ ...a, _priority: 'submitted' })),
        ...(clarification.data.applications || []).map(a => ({ ...a, _priority: 'clarification_required' }))
      ])
    } catch (_) { }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const paginatedApps = useMemo(() => apps.slice((currentPage - 1) * pageSize, currentPage * pageSize), [apps, currentPage, pageSize])

  useEffect(() => { setCurrentPage(1) }, [apps.length])

  if (loading) return <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /></div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">New Applications</div>
          <div className="page-subtitle">Recently submitted loan applications awaiting staff review.</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
            {apps.filter(a => a._priority === 'submitted').length} New
          </span>
          <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
            {apps.filter(a => a._priority === 'clarification_required').length} Clarification
          </span>
        </div>
      </div>

      {apps.length > 0 ? (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Applicant</th>
                <th>Loan Type</th>
                <th>Amount</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedApps.map(app => (
                <tr key={app.id} className="clickable" onClick={() => navigate(`/staff/loan/review/${app.id}`)}>
                  <td><span className="mono">{app.application_number}</span></td>
                  <td style={{ fontWeight: 600, color: '#fff' }}>{app.customer_name}</td>
                  <td>{app.loan_type}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(app.amount)}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatDate(app.submitted_at)}</td>
                  <td>
                    <span className={`badge ${app._priority === 'submitted' ? 'badge-warning' : 'badge-warning'}`}>
                      {app._priority === 'submitted' ? 'Newly Submitted' : 'Clarification Required'}
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={{
                      background: app._priority === 'submitted' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)',
                      color: app._priority === 'submitted' ? '#3b82f6' : '#f59e0b'
                    }}>
                      {app._priority === 'submitted' ? 'Normal' : 'Urgent'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); navigate(`/staff/loan/review/${app.id}`) }}>
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination currentPage={currentPage} totalItems={apps.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
        </div>
      ) : (
        <div className="empty" style={{ padding: '60px 20px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '48px', color: 'var(--text-muted)' }}>inbox</span>
          <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '12px' }}>No new applications</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>New submissions will appear here.</div>
        </div>
      )}
    </>
  )
}
