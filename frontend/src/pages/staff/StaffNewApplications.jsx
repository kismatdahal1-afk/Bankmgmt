import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { staffListLoanApplications } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'
import Pagination from '../../components/common/Pagination'

const BADGE_MAP = {
  submitted: 'badge-info',
  clarification_required: 'badge-warning'
}

const PRIORITY_CONFIG = {
  submitted: { label: 'Normal', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  clarification_required: { label: 'Urgent', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
}

const LOAN_TYPES = ['Personal Loan','Business Loan','Home Loan','Vehicle Loan','Education Loan','Agriculture Loan']

const SORT_OPTIONS = [
  { value: 'latest_activity', label: 'Latest Activity' },
  { value: 'application_number', label: 'Loan ID' },
  { value: 'customer_name', label: 'Applicant' },
  { value: 'amount', label: 'Amount' },
  { value: 'status', label: 'Status' }
]

const STATUS_LABELS = {
  submitted: 'Newly Submitted',
  clarification_required: 'Clarification Required'
}

const ACTIVITY_LABELS = {
  submitted: 'Application Submitted',
  clarification_required: 'Clarification Required'
}

function getLatestActivityDate(app) {
  return app.submitted_at || app.created_at || app.updated_at
}

function getLatestActivity(app) {
  return { new_status: app._priority, changed_at: app.submitted_at || app.created_at }
}

function statusSortKey(status) {
  const order = ['submitted', 'clarification_required']
  const idx = order.indexOf(status)
  return idx >= 0 ? idx : 99
}

const statusLabel = (s) => STATUS_LABELS[s] || s.replace(/_/g, ' ')

export default function StaffNewApplications() {
  const navigate = useNavigate()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [sortBy, setSortBy] = useState('latest_activity')
  const [sortDir, setSortDir] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [activeKpi, setActiveKpi] = useState('')
  const searchRef = useRef(null)
  const debounceRef = useRef(null)

  const fetchAll = useCallback(async () => {
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
    } catch (_) {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filtered = useMemo(() => {
    let list = [...apps]

    if (activeKpi === 'submitted') {
      list = list.filter(a => a._priority === 'submitted')
    } else if (activeKpi === 'clarification') {
      list = list.filter(a => a._priority === 'clarification_required')
    }

    if (filterStatus) list = list.filter(a => a._priority === filterStatus)
    if (typeFilter) list = list.filter(a => a.loan_type === typeFilter)
    if (priorityFilter) list = list.filter(a => a._priority === priorityFilter)

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
        cmp = statusSortKey(a._priority) - statusSortKey(b._priority)
      }
      return sortDir === 'desc' ? cmp : -cmp
    })

    return list
  }, [apps, filterStatus, typeFilter, priorityFilter, search, sortBy, sortDir, activeKpi])

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const today = new Date().toISOString().slice(0, 10)

  const kpiData = useMemo(() => ({
    total: apps.length,
    submitted: apps.filter(a => a._priority === 'submitted').length,
    clarification: apps.filter(a => a._priority === 'clarification_required').length
  }), [apps])

  const handleKpiClick = (key) => {
    setActiveKpi(prev => prev === key ? '' : key)
    setCurrentPage(1)
  }

  const handleReset = () => {
    setSearch('')
    setFilterStatus('')
    setTypeFilter('')
    setPriorityFilter('')
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
    const headers = ['Loan ID','Applicant','Loan Type','Amount','Submitted','Status','Priority']
    const rows = filtered.map(a => [
      a.application_number, a.customer_name, a.loan_type,
      a.amount, formatDate(a.submitted_at),
      statusLabel(a._priority), PRIORITY_CONFIG[a._priority].label
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a')
    el.href = url; el.download = `staff-new-applications-${today}.csv`
    el.click(); URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <html><head><title>New Applications</title>
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
      <h1>Staff New Applications Report</h1>
      <p>${filtered.length} applications &middot; ${new Date().toLocaleDateString()}</p>
      <table><thead><tr>
        <th>Loan ID</th><th>Applicant</th><th>Loan Type</th><th>Amount</th>
        <th>Submitted</th><th>Status</th><th>Priority</th>
      </tr></thead><tbody>
      ${filtered.map(a => `<tr>
        <td class="mono">${a.application_number}</td>
        <td>${a.customer_name || '---'}</td>
        <td>${a.loan_type || '---'}</td>
        <td class="p">${formatCurrency(a.amount)}</td>
        <td>${formatDate(a.submitted_at)}</td>
        <td>${statusLabel(a._priority)}</td>
        <td>${PRIORITY_CONFIG[a._priority].label}</td>
      </tr>`).join('')}
      </tbody></table></body></html>
    `)
    w.document.close()
    w.print()
  }

  return (
    <>
      <style>{`
        .sna-table th,
        .sna-table td { padding: 10px 14px !important; vertical-align: middle; }
        .sna-table th:nth-child(4),
        .sna-table td:nth-child(4) { text-align: right; }
        .sna-table td:nth-child(1) .mono { font-size: 13px; }
        .sna-name { font-weight: 600; font-size: 14px; }
        .sna-amount { text-align: right; display: block; font-size: 13px; font-weight: 700; }
        .sna-prio {
          display: inline-flex; align-items: center; padding: 2px 8px;
          border-radius: 5px; font-size: 10px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .sna-kpi-row { display: flex; gap: 14px; margin-bottom: 18px; }
        .sna-kpi-row .card-stat { flex: 1; cursor: pointer; padding: 18px 20px !important; flex-direction: row !important; gap: 14px !important; }
        .sna-kpi-row .card-stat.active { border-color: var(--accent-color); box-shadow: 0 0 0 1px var(--accent-color); }
        .sna-kpi-row .stat-value { font-size: 1.5rem !important; }
        .sna-kpi-icon {
          width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .sna-kpi-icon .mat-icon { font-size: 18px; }
        .sna-filter-card { margin-bottom: 16px; }
        .sna-filter-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; }
        .sna-filter-row .form-group { margin: 0; min-width: 0; }
        .sna-filter-row .form-control { padding: 7px 10px; font-size: 13px; height: 34px; box-sizing: border-box; }
        .sna-filter-search { flex: 1; min-width: 200px; position: relative; }
        .sna-filter-search .mat-icon {
          position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
          font-size: 16px; color: var(--text-muted); pointer-events: none;
        }
        .sna-filter-search input { padding-left: 32px !important; }
        .sna-skeleton-stats { display: flex; gap: 14px; margin-bottom: 18px; }
        .sna-skeleton-stats > div { flex: 1; }
        .sna-skeleton-filter { margin-bottom: 16px; }
        .sna-activity {
          display: flex; flex-direction: column; gap: 1px; line-height: 1.3;
        }
        .sna-activity-label { font-size: 13px; color: var(--text-primary); font-weight: 500; }
        .sna-activity-date { font-size: 11px; color: var(--text-muted); }
        .sna-action-btn {
          white-space: nowrap;
        }
        @media (max-width: 768px) {
          .sna-kpi-row { flex-wrap: wrap; }
          .sna-kpi-row .card-stat { min-width: calc(50% - 7px); }
          .sna-filter-row { flex-direction: column; }
          .sna-filter-row .form-group { width: 100%; }
        }
        @media (max-width: 480px) {
          .sna-kpi-row .card-stat { min-width: 100%; }
        }
      `}</style>

      <div className="page-header">
        <div>
          <div className="page-title">New Applications</div>
          <div className="page-subtitle">Recently submitted loan applications awaiting staff review.</div>
        </div>
      </div>

      {loading ? (
        <>
          <div className="sna-skeleton-stats">
            {[1,2,3].map(i => <div key={i} className="skeleton-card" style={{ height: '120px' }} />)}
          </div>
          <div className="sna-skeleton-filter">
            <div className="skeleton-card" style={{ height: '100px' }} />
          </div>
          <div className="sna-skeleton-table">
            <div className="skeleton-card" style={{ height: '400px' }} />
          </div>
        </>
      ) : (
        <>
          <div className="sna-kpi-row">
            <div className={`card-stat${activeKpi === '' ? ' active' : ''}`} onClick={() => handleKpiClick('')}>
              <div className="sna-kpi-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <span className="material-symbols-rounded mat-icon">description</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span className="stat-title">Total Applications</span>
                <span className="stat-value">{kpiData.total}</span>
                <span className="stat-sub">All new applications</span>
              </div>
            </div>
            <div className={`card-stat stat-success${activeKpi === 'submitted' ? ' active' : ''}`} onClick={() => handleKpiClick('submitted')}>
              <div className="sna-kpi-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <span className="material-symbols-rounded mat-icon">rate_review</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span className="stat-title">Newly Submitted</span>
                <span className="stat-value">{kpiData.submitted}</span>
                <span className="stat-sub">Awaiting review</span>
              </div>
            </div>
            <div className={`card-stat${activeKpi === 'clarification' ? ' active' : ''}`} onClick={() => handleKpiClick('clarification')}>
              <div className="sna-kpi-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <span className="material-symbols-rounded mat-icon">feedback</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span className="stat-title">Clarification Required</span>
                <span className="stat-value">{kpiData.clarification}</span>
                <span className="stat-sub">Awaiting response</span>
              </div>
            </div>
          </div>

          <div className="table-container sna-filter-card">
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
              <div className="sna-filter-row">
                <div className="form-group sna-filter-search">
                  <span className="material-symbols-rounded mat-icon">search</span>
                  <input ref={searchRef} type="text" className="form-control"
                    placeholder="Search by Loan ID, Applicant, Phone, or Citizenship..."
                    defaultValue={search} onChange={e => handleSearchChange(e.target.value)} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Status</label>
                  <select className="form-control" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1) }}>
                    <option value="">All Statuses</option>
                    <option value="submitted">Newly Submitted</option>
                    <option value="clarification_required">Clarification Required</option>
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

          {filtered.length === 0 ? (
            <div className="table-container">
              <div className="empty">
                <span className="material-symbols-rounded">search_off</span>
                <div style={{ marginTop: '8px', fontSize: '15px', color: 'var(--text-secondary)' }}>No New Applications Found</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Try adjusting your search or filter criteria</div>
              </div>
            </div>
          ) : (
            <div className="table-container">
              <div className="table-header-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="table-title">{filtered.length} Application{filtered.length !== 1 ? 's' : ''}</span>
                  {filtered.length !== apps.length && (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>(filtered from {apps.length})</span>
                  )}
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sorted by latest activity</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table sna-table">
                  <thead>
                    <tr>
                      <th>Loan ID</th>
                      <th>Applicant</th>
                      <th>Loan Type</th>
                      <th>Requested Amount</th>
                      <th>Submitted</th>
                      <th>Last Activity</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(app => {
                      const pc = PRIORITY_CONFIG[app._priority]
                      const latest = getLatestActivity(app)
                      const activityLabel = ACTIVITY_LABELS[latest.new_status] || '\u2014'
                      const activityDate = latest.changed_at ? formatDate(latest.changed_at) : ''
                      return (
                        <tr key={app.id} onClick={() => navigate(`/staff/loan/review/${app.id}`)} style={{ cursor: 'pointer' }}>
                          <td><span className="mono">{app.application_number}</span></td>
                          <td><span className="sna-name">{app.customer_name || '\u2014'}</span></td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{app.loan_type || '\u2014'}</td>
                          <td><span className="sna-amount">{formatCurrency(app.amount)}</span></td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{formatDate(app.submitted_at)}</td>
                          <td>
                            <div className="sna-activity">
                              <span className="sna-activity-label">{activityLabel}</span>
                              {activityDate && <span className="sna-activity-date">{activityDate}</span>}
                            </div>
                          </td>
                          <td><span className="sna-prio" style={{ background: pc.bg, color: pc.color }}>{pc.label}</span></td>
                          <td><span className={`badge ${BADGE_MAP[app._priority] || 'badge-muted'}`}>{statusLabel(app._priority)}</span></td>
                          <td>
                            <button className="btn btn-sm btn-primary sna-action-btn" onClick={(e) => { e.stopPropagation(); navigate(`/staff/loan/review/${app.id}`) }}>
                              Review
                            </button>
                          </td>
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
