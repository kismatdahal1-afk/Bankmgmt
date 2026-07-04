import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminPendingReviews, adminApproveLoan, adminRejectLoan, adminReturnToStaff } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'
import EmptyState from '../../components/common/EmptyState'
import Pagination from '../../components/common/Pagination'

export default function AdminPendingReviews() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)
  const [actionModal, setActionModal] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchData = () => {
    setLoading(true)
    adminPendingReviews()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const apps = data?.applications || []
  const paginatedApps = useMemo(() => apps.slice((currentPage - 1) * pageSize, currentPage * pageSize), [apps, currentPage, pageSize])

  useEffect(() => { setCurrentPage(1) }, [apps.length])

  const handleQuickApprove = async (appId) => {
    setProcessing(appId)
    try {
      await adminApproveLoan(appId)
      fetchData()
    } catch (e) { alert(e.response?.data?.error || 'Failed') }
    finally { setProcessing(null) }
  }

  const handleQuickReject = async (appId) => {
    if (!remarks.trim()) return
    setProcessing(appId)
    try {
      await adminRejectLoan(appId, { reason: remarks })
      setActionModal(null)
      setRemarks('')
      fetchData()
    } catch (e) { alert(e.response?.data?.error || 'Failed') }
    finally { setProcessing(null) }
  }

  const handleQuickReturn = async (appId) => {
    setProcessing(appId)
    try {
      await adminReturnToStaff(appId, { reason: remarks || 'Returned for re-review' })
      setActionModal(null)
      setRemarks('')
      fetchData()
    } catch (e) { alert(e.response?.data?.error || 'Failed') }
    finally { setProcessing(null) }
  }

  if (loading) return <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /></div>
  if (!data) return <div className="empty"><span className="material-symbols-rounded">error</span><div>Failed to load</div></div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Pending Reviews</div>
          <div className="page-subtitle">Applications requiring administrator attention</div>
        </div>
      </div>

      <div className="grid-stats">
        <div className="card-stat stat-warning">
          <div className="stat-title">Pending Count</div>
          <div className="stat-value">{data.total_pending || 0}</div>
        </div>
        <div className="card-stat">
          <div className="stat-title">Average Wait Time</div>
          <div className="stat-value">{data.average_wait_hours || 0}h</div>
        </div>
        <div className="card-stat stat-danger">
          <div className="stat-title">High Priority</div>
          <div className="stat-value">{data.high_priority || 0}</div>
          <div className="stat-sub">Amount &gt; NPR 500,000</div>
        </div>
        <div className="card-stat stat-danger">
          <div className="stat-title">Overdue Reviews</div>
          <div className="stat-value">{data.overdue_reviews || 0}</div>
          <div className="stat-sub">&gt; 48 hours waiting</div>
        </div>
      </div>

      {apps.length === 0 ? (
        <EmptyState icon="rate_review" message="No pending reviews. All applications have been processed." />
      ) : (
        <div className="table-container">
          <div className="table-header-bar">
            <span className="table-title">{apps.length} Application{apps.length !== 1 ? 's' : ''} Pending Review</span>
          </div>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Loan Type</th>
                <th>Amount</th>
                <th>Waiting Since</th>
                <th>Verified By</th>
                <th>Priority</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedApps.map(app => {
                const waiting = app.updated_at ? Math.floor((new Date() - new Date(app.updated_at)) / (1000 * 60 * 60)) : 0
                const isHighPriority = app.amount > 500000
                const isOverdue = waiting > 48
                return (
                  <tr key={app.id} style={isOverdue ? { borderLeft: '3px solid var(--danger)' } : isHighPriority ? { borderLeft: '3px solid var(--warning)' } : {}}>
                    <td style={{ fontWeight: 600 }}>{app.customer_name || '—'}</td>
                    <td>{app.loan_type || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(app.amount)}</td>
                    <td style={{ color: isOverdue ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      {app.updated_at ? formatDate(app.updated_at) : '—'}
                      <div style={{ fontSize: 11, color: isOverdue ? 'var(--danger)' : 'var(--text-muted)' }}>{waiting}h ago</div>
                    </td>
                    <td>{app.assigned_staff_name || '—'}</td>
                    <td>
                      {isHighPriority ? (
                        <span className="risk-badge high">HIGH</span>
                      ) : (
                        <span className="risk-badge" style={{ background: 'rgba(156,163,175,0.15)', color: 'var(--text-muted)' }}>NORMAL</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-sm btn-primary" onClick={() => navigate(`/admin/loan/applications/${app.id}`)}>
                          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>visibility</span> Review
                        </button>
                        <button className="btn btn-sm btn-success"
                          onClick={() => handleQuickApprove(app.id)}
                          disabled={processing === app.id}>
                          {processing === app.id ? '...' : <span className="material-symbols-rounded" style={{ fontSize: 14 }}>check</span>}
                        </button>
                        <button className="btn btn-sm btn-danger"
                          onClick={() => setActionModal({ app, type: 'reject' })}>
                          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>close</span>
                        </button>
                        <button className="btn btn-sm btn-secondary"
                          onClick={() => setActionModal({ app, type: 'return' })}>
                          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>undo</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Pagination currentPage={currentPage} totalItems={apps.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
        </div>
      )}

      {actionModal && (
        <div className="modal-overlay" onClick={() => { setActionModal(null); setRemarks('') }}>
          <div className="modal-content" style={{ maxWidth: 480, width: '100%', padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              {actionModal.type === 'reject' ? 'Reject Loan' : 'Return to Staff'}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
              {actionModal.app.application_number} &mdash; {actionModal.app.customer_name}
            </div>
            <textarea className="form-control" rows={3}
              placeholder={actionModal.type === 'reject' ? 'Rejection reason (required)' : 'Reason for return (optional)'}
              value={remarks} onChange={e => setRemarks(e.target.value)} style={{ marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setActionModal(null); setRemarks('') }}>Cancel</button>
              <button className={`btn ${actionModal.type === 'reject' ? 'btn-danger' : 'btn-primary'}`} style={{ flex: 1 }}
                onClick={() => actionModal.type === 'reject' ? handleQuickReject(actionModal.app.id) : handleQuickReturn(actionModal.app.id)}
                disabled={processing === actionModal.app.id || (actionModal.type === 'reject' && !remarks.trim())}>
                {processing === actionModal.app.id ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
