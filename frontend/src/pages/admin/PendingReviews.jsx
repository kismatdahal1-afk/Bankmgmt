import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminPendingReviews, adminApproveLoan, adminRejectLoan, adminReturnToStaff, adminRequestClarification } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'
import EmptyState from '../../components/common/EmptyState'
import Pagination from '../../components/common/Pagination'

const LOAN_TYPES = ['personal', 'home', 'education', 'business', 'agriculture', 'vehicle']
const WAITING_RANGES = [
  { value: '', label: 'All Time' },
  { value: 'today', label: 'Today (< 24h)' },
  { value: '1-3', label: '1–3 Days' },
  { value: '4-7', label: '4–7 Days' },
  { value: 'over7', label: 'More than 7 Days' },
]
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'highest_amount', label: 'Highest Amount' },
  { value: 'lowest_amount', label: 'Lowest Amount' },
  { value: 'priority', label: 'Highest Priority' },
]

export default function AdminPendingReviews() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [actionModal, setActionModal] = useState(null)
  const [processing, setProcessing] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [filters, setFilters] = useState({
    search: '', loan_type: '', priority: '', waiting_range: '',
    amount_min: '', amount_max: '', staff: '', date_from: '', date_to: '', sort_by: 'newest',
  })

  const buildParams = () => {
    const p = { page: currentPage, per_page: pageSize, sort_by: filters.sort_by }
    for (const [k, v] of Object.entries(filters)) {
      if (k !== 'sort_by' && v !== '' && v !== null && v !== undefined) p[k] = v
    }
    return p
  }

  const params = useMemo(() => buildParams(), [
    currentPage, pageSize, filters.search, filters.loan_type, filters.priority,
    filters.waiting_range, filters.amount_min, filters.amount_max,
    filters.staff, filters.date_from, filters.date_to, filters.sort_by
  ])

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      adminPendingReviews(params)
        .then(res => setData(res.data))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [params])

  const fetchData = () => {
    setLoading(true)
    adminPendingReviews(buildParams())
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const apps = useMemo(() => data?.applications || [], [data])
  const stats = data || {}

  const handleApprove = async (appId) => {
    setProcessing(appId)
    try { await adminApproveLoan(appId); fetchData() }
    catch (e) { alert(e.response?.data?.error || 'Failed') }
    finally { setProcessing(null) }
  }

  const handleReject = async () => {
    if (!remarks.trim()) return
    setProcessing(actionModal.app.id)
    try {
      await adminRejectLoan(actionModal.app.id, { reason: remarks })
      setActionModal(null); setRemarks(''); fetchData()
    } catch (e) { alert(e.response?.data?.error || 'Failed') }
    finally { setProcessing(null) }
  }

  const handleReturn = async () => {
    setProcessing(actionModal.app.id)
    try {
      await adminReturnToStaff(actionModal.app.id, { reason: remarks || 'Returned for re-review' })
      setActionModal(null); setRemarks(''); fetchData()
    } catch (e) { alert(e.response?.data?.error || 'Failed') }
    finally { setProcessing(null) }
  }

  const handleClarify = async () => {
    if (!remarks.trim()) return
    setProcessing(actionModal.app.id)
    try {
      await adminRequestClarification(actionModal.app.id, { reason: remarks })
      setActionModal(null); setRemarks(''); fetchData()
    } catch (e) { alert(e.response?.data?.error || 'Failed') }
    finally { setProcessing(null) }
  }

  const statCards = [
    { key: 'total_pending', icon: 'rate_review', title: 'Pending Reviews', color: '#3b82f6', subtitle: 'Awaiting admin decision' },
    { key: 'high_priority', icon: 'priority_high', title: 'High Priority', color: '#ef4444', subtitle: 'Need immediate attention' },
    { key: 'overdue_reviews', icon: 'warning', title: 'Overdue Reviews', color: '#ef4444', subtitle: 'Exceeded 48h SLA' },
    { key: 'average_wait_hours', icon: 'schedule', title: 'Avg Waiting Time', color: '#f59e0b', subtitle: 'Average wait duration', suffix: 'h' },
    { key: 'ready_for_approval', icon: 'check_circle', title: 'Ready for Approval', color: '#10b981', subtitle: 'All verifications passed' },
    { key: 'sent_back_to_staff', icon: 'undo', title: 'Sent Back to Staff', color: '#8b5cf6', subtitle: 'Returned for re-verification' },
  ]

  const waitingDisplay = (hours) => {
    if (!hours && hours !== 0) return '—'
    if (hours >= 48) return { text: `${(hours / 24).toFixed(1)}d`, color: 'var(--danger)' }
    if (hours >= 24) return { text: `${(hours / 24).toFixed(1)}d`, color: 'var(--warning)' }
    if (hours >= 1) return { text: `${Math.round(hours)}h`, color: 'var(--text-muted)' }
    return { text: '<1h', color: 'var(--text-muted)' }
  }

  const priorityBadge = (level) => {
    const map = {
      high: { cls: 'badge badge-danger', label: 'High' },
      medium: { cls: 'badge badge-warning', label: 'Medium' },
      normal: { cls: 'badge badge-info', label: 'Low' },
    }
    return <span className={(map[level] || map.normal).cls}>{(map[level] || map.normal).label}</span>
  }

  const docBadge = (verified) => (
    <span className={`badge ${verified ? 'badge-success' : 'badge-muted'}`}>
      {verified ? 'Verified' : 'Pending'}
    </span>
  )

  const statusBadge = (status) => {
    const map = { final_review: { cls: 'badge badge-warning', label: 'Admin Review' } }
    const s = map[status] || { cls: 'badge', label: status }
    return <span className={s.cls}>{s.label}</span>
  }

  if (loading && !data) return (
    <div className="loading-skeleton">
      <div className="page-header"><div className="skeleton-card" style={{ width: 300, height: 32 }} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton-card" style={{ height: 100 }} />)}
      </div>
      <div className="skeleton-card" style={{ height: 48, marginBottom: 12 }} />
      <div className="skeleton-card" style={{ height: 400 }} />
    </div>
  )

  if (!data) return <div className="empty"><span className="material-symbols-rounded">error</span><div>Failed to load pending reviews</div></div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Pending Reviews</div>
          <div className="page-subtitle">Applications forwarded by Staff awaiting your decision</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {statCards.map(s => (
          <div key={s.key} className="card-stat" style={{ '--accent-color': s.color, padding: '16px 18px', minHeight: 0 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1 }}>
              <div className="card-stat-icon" style={{ width: 42, height: 42, minWidth: 42, background: `${s.color}18`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 20 }}>{s.icon}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="stat-title" style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{s.title}</div>
                <div className="stat-value" style={{ fontSize: 24, fontWeight: 700, marginBottom: 1, opacity: 0.95 }}>{stats[s.key] != null ? stats[s.key] + (s.suffix || '') : 0}</div>
              </div>
            </div>
            <div className="stat-sub" style={{ fontSize: 11.5, color: '#fff', opacity: 0.4, marginTop: 'auto' }}>{s.subtitle}</div>
          </div>
        ))}
      </div>

      <div className="table-container" style={{ marginBottom: 16 }}>
        <div style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0, minWidth: 220, flex: 1 }}>
            <label className="filter-label">Search</label>
            <input className="form-control" placeholder="Search by ID, name, phone..."
              value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setCurrentPage(1) }}
              style={{ height: 40, fontSize: 12, padding: '8px 12px' }} />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: 130 }}>
            <label className="filter-label">Loan Type</label>
            <select className="form-control" value={filters.loan_type} onChange={e => { setFilters(f => ({ ...f, loan_type: e.target.value })); setCurrentPage(1) }}
              style={{ height: 40, fontSize: 12, padding: '8px 12px' }}>
              <option value="">All Types</option>
              {LOAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: 120 }}>
            <label className="filter-label">Priority</label>
            <select className="form-control" value={filters.priority} onChange={e => { setFilters(f => ({ ...f, priority: e.target.value })); setCurrentPage(1) }}
              style={{ height: 40, fontSize: 12, padding: '8px 12px' }}>
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="normal">Low</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: 130 }}>
            <label className="filter-label">Staff</label>
            <input className="form-control" placeholder="Staff name"
              value={filters.staff} onChange={e => { setFilters(f => ({ ...f, staff: e.target.value })); setCurrentPage(1) }}
              style={{ height: 40, fontSize: 12, padding: '8px 12px' }} />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: 130 }}>
            <label className="filter-label">Waiting Time</label>
            <select className="form-control" value={filters.waiting_range} onChange={e => { setFilters(f => ({ ...f, waiting_range: e.target.value })); setCurrentPage(1) }}
              style={{ height: 40, fontSize: 12, padding: '8px 12px' }}>
              {WAITING_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: 130 }}>
            <label className="filter-label">Sort By</label>
            <select className="form-control" value={filters.sort_by} onChange={e => { setFilters(f => ({ ...f, sort_by: e.target.value })); setCurrentPage(1) }}
              style={{ height: 40, fontSize: 12, padding: '8px 12px' }}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {apps.length === 0 ? (
        <EmptyState icon="rate_review" message="No pending reviews matching your filters." />
      ) : (
        <div className="table-container">
          <div className="table-header-bar">
            <span className="table-title">{data.total || 0} Application{(data.total || 0) !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ minWidth: 1100 }}>
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Applicant</th>
                  <th>Loan Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Assigned Staff</th>
                  <th>Forwarded Date</th>
                  <th>Waiting</th>
                  <th>Priority</th>
                  <th>Documents</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {apps.map(app => {
                  const wd = waitingDisplay(app.waiting_hours)
                  return (
                    <tr key={app.id}
                      onClick={() => navigate(`/admin/loan/applications/${app.id}?source=pending`)}
                      style={{
                        cursor: 'pointer',
                        borderLeft: app.priority === 'high' ? '3px solid var(--danger)' : app.priority === 'medium' ? '3px solid var(--warning)' : '3px solid var(--accent-color)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td><span className="mono" style={{ fontSize: 12, color: 'var(--accent-color)' }}>{app.application_number}</span></td>
                      <td style={{ fontWeight: 600 }}>{app.customer_name || '—'}</td>
                      <td style={{ textTransform: 'capitalize', fontSize: 13, color: 'var(--text-secondary)' }}>{app.loan_type}</td>
                      <td style={{ fontWeight: 600, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{formatCurrency(app.amount)}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{app.assigned_staff_name || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {app.forwarded_date ? formatDate(app.forwarded_date) : app.updated_at ? formatDate(app.updated_at) : '—'}
                      </td>
                      <td>
                        <span style={{ color: wd.color, fontWeight: 600, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>{wd.text}</span>
                      </td>
                      <td>{priorityBadge(app.priority)}</td>
                      <td>{docBadge(app.documents_verified)}</td>
                      <td>{statusBadge(app.status)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={data.total || 0}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1) }}
          />
        </div>
      )}



      {actionModal && (
        <div className="modal-overlay" onClick={() => { setActionModal(null); setRemarks('') }}>
          <div className="modal-content" style={{ maxWidth: 480, width: '100%', padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
              {actionModal.type === 'reject' ? 'Reject Loan' : actionModal.type === 'return' ? 'Return to Staff' : 'Request Clarification'}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
              {actionModal.app.application_number} &mdash; {actionModal.app.customer_name}
            </div>
            <textarea className="form-control" rows={3}
              placeholder={actionModal.type === 'reject' ? 'Rejection reason (required)' : actionModal.type === 'return' ? 'Reason for return (optional)' : 'Clarification needed (required)'}
              value={remarks} onChange={e => setRemarks(e.target.value)} style={{ marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setActionModal(null); setRemarks('') }}>Cancel</button>
              <button className={`btn ${actionModal.type === 'reject' ? 'btn-danger' : actionModal.type === 'return' ? 'btn-primary' : 'btn-warning'}`} style={{ flex: 1 }}
                onClick={actionModal.type === 'reject' ? handleReject : actionModal.type === 'return' ? handleReturn : handleClarify}
                disabled={processing === actionModal.app.id || ((actionModal.type === 'reject' || actionModal.type === 'clarify') && !remarks.trim())}>
                {processing === actionModal.app.id ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
