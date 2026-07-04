import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { adminListLoanApplications } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'
import Pagination from '../../components/common/Pagination'

const BADGE_MAP = {
  submitted: 'badge-info', under_review: 'badge-info',
  clarification_required: 'badge-warning', documents_verified: 'badge-success',
  visit_scheduled: 'badge-info', final_review: 'badge-warning',
  approved: 'badge-success', rejected: 'badge-danger',
  disbursed: 'badge-success', draft: 'badge-muted'
}

const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  medium: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  low:    { label: 'Low',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' }
}

const LOAN_TYPES = ['Personal Loan','Business Loan','Home Loan','Vehicle Loan','Education Loan','Agriculture Loan']

const SORT_OPTIONS = [
  { value: 'latest_activity', label: 'Latest Activity' },
  { value: 'application_number', label: 'Loan ID' },
  { value: 'customer_name', label: 'Applicant' },
  { value: 'amount', label: 'Amount' },
  { value: 'status', label: 'Status' }
]

const ACTIVITY_LABELS = {
  submitted: 'Application Submitted', under_review: 'Staff Review Started',
  clarification_required: 'Clarification Requested', documents_verified: 'Documents Verified',
  visit_scheduled: 'Branch Visit Scheduled', final_review: 'Sent to Admin',
  approved: 'Loan Approved', rejected: 'Loan Rejected',
  disbursed: 'Loan Disbursed', draft: 'Draft Created'
}

function getPriority(app) {
  const amt = app.amount || 0
  if (amt > 1000000) return 'high'
  if (amt > 500000) return 'medium'
  return 'low'
}

function statusSortKey(status) {
  const order = ['draft','submitted','under_review','clarification_required','documents_verified','visit_scheduled','final_review','approved','rejected','disbursed']
  const idx = order.indexOf(status)
  return idx >= 0 ? idx : 99
}

function getLatestActivity(app) {
  const history = app.status_history || []
  if (history.length > 0) {
    const sorted = [...history].sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
    return sorted[0]
  }
  return null
}

function getLatestActivityDate(app) {
  const latest = getLatestActivity(app)
  if (latest) return latest.changed_at
  return app.updated_at || app.created_at || app.submitted_at
}

const statusLabel = (s) => {
  const labels = {
    submitted:'Submitted', under_review:'Staff Review', clarification_required:'Clarification Required',
    documents_verified:'Documents Verified', visit_scheduled:'Visit Scheduled', final_review:'Admin Review',
    approved:'Approved', rejected:'Rejected', disbursed:'Disbursed', draft:'Draft'
  }
  return labels[s] || s.replace(/_/g, ' ')
}

export default function AdminLoanApplications() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const statusParam = searchParams.get('status')

  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState(statusParam || '')
  const [typeFilter, setTypeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [staffFilter, setStaffFilter] = useState('')
  const [sortBy, setSortBy] = useState('latest_activity')
  const [sortDir, setSortDir] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [activeKpi, setActiveKpi] = useState('')
  const searchRef = useRef(null)
  const debounceRef = useRef(null)

  const fetchAll = useCallback(() => {
    setLoading(true)
    const statuses = ['documents_verified','visit_scheduled','final_review','approved','rejected','submitted','under_review','clarification_required','disbursed']
    const promises = statuses.map(s => adminListLoanApplications(s).then(r => r.data.applications || []).catch(() => []))
    Promise.all(promises)
      .then(results => setApplications(results.flat()))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])
  useEffect(() => { if (statusParam) { setFilterStatus(statusParam); setCurrentPage(1) } }, [statusParam])

  const filtered = useMemo(() => {
    let list = [...applications]

    if (activeKpi === 'pending') {
      list = list.filter(a => a.status === 'final_review' || a.status === 'visit_scheduled')
    } else if (activeKpi === 'approved_today') {
      const today = new Date().toISOString().slice(0, 10)
      list = list.filter(a => a.status === 'approved' && a.approved_at && a.approved_at.slice(0, 10) === today)
    } else if (activeKpi === 'clarification') {
      list = list.filter(a => a.status === 'clarification_required')
    }

    if (filterStatus) list = list.filter(a => a.status === filterStatus)
    if (typeFilter) list = list.filter(a => a.loan_type === typeFilter)
    if (priorityFilter) list = list.filter(a => getPriority(a) === priorityFilter)
    if (staffFilter) list = list.filter(a => (a.assigned_staff_name || '').toLowerCase().includes(staffFilter.toLowerCase()))

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        (a.application_number || '').toLowerCase().includes(q) ||
        (a.customer_name || '').toLowerCase().includes(q) ||
        (a.customer_phone || '').toLowerCase().includes(q) ||
        (a.citizenship_number || '').toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'latest_activity') {
        cmp = new Date(getLatestActivityDate(b)) - new Date(getLatestActivityDate(a))
      } else if (sortBy === 'application_number') {
        cmp = (a.application_number || '').localeCompare(b.application_number || '')
      } else if (sortBy === 'customer_name') {
        cmp = (a.customer_name || '').localeCompare(b.customer_name || '')
      } else if (sortBy === 'amount') {
        cmp = (a.amount || 0) - (b.amount || 0)
      } else if (sortBy === 'status') {
        cmp = statusSortKey(a.status) - statusSortKey(b.status)
      }
      return sortDir === 'desc' ? cmp : -cmp
    })

    return list
  }, [applications, filterStatus, typeFilter, priorityFilter, staffFilter, search, sortBy, sortDir, activeKpi])

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const today = new Date().toISOString().slice(0, 10)

  const kpiData = useMemo(() => ({
    total: applications.length,
    pending: applications.filter(a => a.status === 'final_review' || a.status === 'visit_scheduled').length,
    approvedToday: applications.filter(a => a.status === 'approved' && a.approved_at && a.approved_at.slice(0, 10) === today).length,
    clarification: applications.filter(a => a.status === 'clarification_required').length
  }), [applications, today])

  const staffNames = useMemo(() => [...new Set(applications.map(a => a.assigned_staff_name).filter(Boolean))].sort(), [applications])

  const handleKpiClick = (key) => {
    setActiveKpi(prev => prev === key ? '' : key)
    setCurrentPage(1)
  }

  const handleReset = () => {
    setSearch('')
    setFilterStatus('')
    setTypeFilter('')
    setPriorityFilter('')
    setStaffFilter('')
    setSortBy('latest_activity')
    setSortDir('desc')
    setActiveKpi('')
    setCurrentPage(1)
    searchRef.current?.focus()
  }

  const handleSearchChange = (value) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(value)
      setCurrentPage(1)
    }, 250)
  }

  const handleExportCSV = () => {
    const headers = ['Loan ID','Applicant','Loan Type','Amount','Assigned Staff','Last Activity','Status','Priority']
    const rows = filtered.map(a => {
      const latest = getLatestActivity(a)
      const activity = latest ? (ACTIVITY_LABELS[latest.new_status] || latest.new_status) : ''
      const ts = latest ? (latest.changed_at ? formatDate(latest.changed_at) : '') : ''
      return [
        a.application_number, a.customer_name, a.loan_type,
        a.amount, a.assigned_staff_name || 'Not Assigned',
        `${activity} ${ts}`.trim(),
        statusLabel(a.status), getPriority(a)
      ]
    })
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `loan-applications-${today}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <html><head><title>Loan Applications</title>
      <style>body{font-family:sans-serif;padding:40px}
      h1{font-size:22px;margin-bottom:4px}
      p{color:#666;margin-bottom:24px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{padding:8px 10px;text-align:left;border-bottom:1px solid #ddd}
      th{background:#f5f5f5;text-transform:uppercase;font-size:10px;letter-spacing:0.5px}
      tr:nth-child(even){background:#fafafa}
      .mono{font-family:monospace}
      .p{text-align:right;font-weight:700}
      </style></head><body>
      <h1>Loan Applications Report</h1>
      <p>${filtered.length} applications &middot; ${new Date().toLocaleDateString()}</p>
      <table><thead><tr>
        <th>Loan ID</th><th>Applicant</th><th>Loan Type</th><th>Amount</th>
        <th>Assigned Staff</th><th>Last Activity</th><th>Status</th><th>Priority</th>
      </tr></thead><tbody>
      ${filtered.map(a => {
        const latest = getLatestActivity(a)
        const activity = latest ? (ACTIVITY_LABELS[latest.new_status] || latest.new_status) : ''
        const ts = latest ? (latest.changed_at ? formatDate(latest.changed_at) : '') : ''
        return `<tr>
          <td class="mono">${a.application_number}</td>
          <td>${a.customer_name || '---'}</td>
          <td>${a.loan_type || '---'}</td>
          <td class="p">${formatCurrency(a.amount)}</td>
          <td>${a.assigned_staff_name || 'Not Assigned'}</td>
          <td>${activity} ${ts}</td>
          <td>${statusLabel(a.status)}</td>
          <td>${getPriority(a)}</td>
        </tr>`
      }).join('')}
      </tbody></table></body></html>
    `)
    w.document.close()
    w.print()
  }

  return (
    <>
      <style>{`
        .la-table th,
        .la-table td { padding: 10px 14px !important; vertical-align: middle; }
        .la-table th:nth-child(4),
        .la-table td:nth-child(4) { text-align: right; }
        .la-table td:nth-child(1) .mono { font-size: 13px; }
        .la-name { font-weight: 600; font-size: 14px; }
        .la-amount { text-align: right; display: block; font-size: 13px; font-weight: 700; }
        .la-prio {
          display: inline-flex; align-items: center; padding: 2px 8px;
          border-radius: 5px; font-size: 10px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .la-kpi-row { display: flex; gap: 14px; margin-bottom: 18px; }
        .la-kpi-row .card-stat { flex: 1; cursor: pointer; padding: 18px 20px !important; flex-direction: row !important; gap: 14px !important; }
        .la-kpi-row .card-stat.active { border-color: var(--accent-color); box-shadow: 0 0 0 1px var(--accent-color); }
        .la-kpi-row .stat-value { font-size: 1.5rem !important; }
        .la-kpi-icon {
          width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .la-kpi-icon .mat-icon { font-size: 18px; }
        .la-filter-card { margin-bottom: 16px; }
        .la-filter-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; }
        .la-filter-row .form-group { margin: 0; min-width: 0; }
        .la-filter-row .form-control { padding: 7px 10px; font-size: 13px; height: 34px; box-sizing: border-box; }
        .la-filter-search { flex: 1; min-width: 200px; position: relative; }
        .la-filter-search .mat-icon {
          position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
          font-size: 16px; color: var(--text-muted); pointer-events: none;
        }
        .la-filter-search input { padding-left: 32px !important; }
        .la-skeleton-stats { display: flex; gap: 14px; margin-bottom: 18px; }
        .la-skeleton-stats > div { flex: 1; }
        .la-skeleton-filter { margin-bottom: 16px; }
        .la-activity {
          display: flex; flex-direction: column; gap: 1px; line-height: 1.3;
        }
        .la-activity-label { font-size: 13px; color: var(--text-primary); font-weight: 500; }
        .la-activity-date { font-size: 11px; color: var(--text-muted); }
        @media (max-width: 768px) {
          .la-kpi-row { flex-wrap: wrap; }
          .la-kpi-row .card-stat { min-width: calc(50% - 7px); }
          .la-filter-row { flex-direction: column; }
          .la-filter-row .form-group { width: 100%; }
        }
        @media (max-width: 480px) {
          .la-kpi-row .card-stat { min-width: 100%; }
        }
      `}</style>

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <div className="page-title">Loan Applications</div>
          <div className="page-subtitle">Review and manage all loan applications submitted by verified staff.</div>
        </div>
      </div>

      {/* LOADING */}
      {loading ? (
        <>
          <div className="la-skeleton-stats">
            {[1,2,3,4].map(i => <div key={i} className="skeleton-card" style={{ height: '120px' }} />)}
          </div>
          <div className="la-skeleton-filter">
            <div className="skeleton-card" style={{ height: '100px' }} />
          </div>
          <div className="la-skeleton-table">
            <div className="skeleton-card" style={{ height: '400px' }} />
          </div>
        </>
      ) : (
        <>
          {/* KPI CARDS */}
          <div className="la-kpi-row">
            <div className={`card-stat${activeKpi === '' ? ' active' : ''}`} onClick={() => handleKpiClick('')}>
              <div className="la-kpi-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <span className="material-symbols-rounded mat-icon">description</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span className="stat-title">Total Applications</span>
                <span className="stat-value">{kpiData.total}</span>
                <span className="stat-sub">All applications</span>
              </div>
            </div>
            <div className={`card-stat stat-warning${activeKpi === 'pending' ? ' active' : ''}`} onClick={() => handleKpiClick('pending')}>
              <div className="la-kpi-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <span className="material-symbols-rounded mat-icon">rate_review</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span className="stat-title">Pending Review</span>
                <span className="stat-value">{kpiData.pending}</span>
                <span className="stat-sub">Awaiting decision</span>
              </div>
            </div>
            <div className={`card-stat stat-success${activeKpi === 'approved_today' ? ' active' : ''}`} onClick={() => handleKpiClick('approved_today')}>
              <div className="la-kpi-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <span className="material-symbols-rounded mat-icon">check_circle</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span className="stat-title">Approved Today</span>
                <span className="stat-value">{kpiData.approvedToday}</span>
                <span className="stat-sub">Approved today</span>
              </div>
            </div>
            <div className={`card-stat${activeKpi === 'clarification' ? ' active' : ''}`} onClick={() => handleKpiClick('clarification')}>
              <div className="la-kpi-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <span className="material-symbols-rounded mat-icon">feedback</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span className="stat-title">Clarification Required</span>
                <span className="stat-value">{kpiData.clarification}</span>
                <span className="stat-sub">Awaiting response</span>
              </div>
            </div>
          </div>

          {/* FILTER TOOLBAR */}
          <div className="table-container la-filter-card">
            <div className="table-header-bar" style={{ padding: '14px 20px' }}>
              <span className="table-title">Search &amp; Filters</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }} onClick={handleExportPDF}>
                  <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>picture_as_pdf</span>
                  PDF
                </button>
                <button className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }} onClick={handleExportCSV}>
                  <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>file_download</span>
                  CSV
                </button>
              </div>
            </div>
            <div style={{ padding: '12px 20px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="la-filter-row">
                <div className="form-group la-filter-search">
                  <span className="material-symbols-rounded mat-icon">search</span>
                  <input ref={searchRef} type="text" className="form-control"
                    placeholder="Search by Loan ID, Applicant, Phone, or Citizenship..."
                    defaultValue={search} onChange={e => handleSearchChange(e.target.value)} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Status</label>
                  <select className="form-control" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1) }}>
                    <option value="">All Statuses</option>
                    {Object.entries({
                      submitted:'Submitted', under_review:'Staff Review', clarification_required:'Clarification Required',
                      documents_verified:'Documents Verified', visit_scheduled:'Visit Scheduled', final_review:'Admin Review',
                      approved:'Approved', rejected:'Rejected', disbursed:'Disbursed', draft:'Draft'
                    }).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Loan Type</label>
                  <select className="form-control" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1) }}>
                    <option value="">All Types</option>
                    {LOAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Priority</label>
                  <select className="form-control" value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setCurrentPage(1) }}>
                    <option value="">All</option>
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Staff</label>
                  <select className="form-control" value={staffFilter} onChange={e => { setStaffFilter(e.target.value); setCurrentPage(1) }}>
                    <option value="">All Staff</option>
                    {staffNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Sort</label>
                  <select className="form-control" value={`${sortBy}-${sortDir}`} onChange={e => { const [f, d] = e.target.value.split('-'); setSortBy(f); setSortDir(d); setCurrentPage(1) }}>
                    {SORT_OPTIONS.reduce((acc, o) => {
                      acc.push(<option key={`${o.value}-desc`} value={`${o.value}-desc`}>{o.label} (Newest)</option>)
                      acc.push(<option key={`${o.value}-asc`} value={`${o.value}-asc`}>{o.label} (Oldest)</option>)
                      return acc
                    }, [])}
                  </select>
                </div>
                <div className="form-group" style={{ alignSelf: 'flex-end' }}>
                  <button className="btn btn-sm" onClick={handleReset} style={{ whiteSpace: 'nowrap', background: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>clear</span>
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE */}
          {filtered.length === 0 ? (
            <div className="table-container">
              <div className="empty">
                <span className="material-symbols-rounded">search_off</span>
                <div style={{ marginTop: '8px', fontSize: '15px', color: 'var(--text-secondary)' }}>No Loan Applications Found</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Try adjusting your search or filter criteria</div>
              </div>
            </div>
          ) : (
            <div className="table-container">
              <div className="table-header-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="table-title">{filtered.length} Application{filtered.length !== 1 ? 's' : ''}</span>
                  {filtered.length !== applications.length && (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>(filtered from {applications.length})</span>
                  )}
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sorted by latest activity</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table la-table">
                  <thead>
                    <tr>
                      <th>Loan ID</th>
                      <th>Applicant</th>
                      <th>Loan Type</th>
                      <th>Requested Amount</th>
                      <th>Assigned Staff</th>
                      <th>Last Activity</th>
                      <th>Priority</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(app => {
                      const prio = getPriority(app)
                      const pc = PRIORITY_CONFIG[prio]
                      const latest = getLatestActivity(app)
                      const activityLabel = latest ? (ACTIVITY_LABELS[latest.new_status] || latest.new_status) : '\u2014'
                      const activityDate = latest ? (latest.changed_at ? formatDate(latest.changed_at) : '') : ''
                      return (
                        <tr key={app.id} onClick={() => navigate(`/admin/loan/applications/${app.id}`)} style={{ cursor: 'pointer' }}>
                          <td><span className="mono">{app.application_number}</span></td>
                          <td><span className="la-name">{app.customer_name || '\u2014'}</span></td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{app.loan_type || '\u2014'}</td>
                          <td><span className="la-amount">{formatCurrency(app.amount)}</span></td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{app.assigned_staff_name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not Assigned</span>}</td>
                          <td>
                            <div className="la-activity">
                              <span className="la-activity-label">{activityLabel}</span>
                              {activityDate && <span className="la-activity-date">{activityDate}</span>}
                            </div>
                          </td>
                          <td><span className="la-prio" style={{ background: pc.bg, color: pc.color }}>{pc.label}</span></td>
                          <td><span className={`badge ${BADGE_MAP[app.status] || 'badge-muted'}`}>{statusLabel(app.status)}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
            </div>
          )}
        </>
      )}
    </>
  )
}
