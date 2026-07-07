import { useState, useEffect, useMemo, useRef } from 'react'
import { staffDisbursedLoans } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'
import Pagination from '../../components/common/Pagination'
import { Line, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler)

const LOAN_TYPES_FILTER = ['All Loan Types', 'Personal Loan', 'Home Loan', 'Business Loan', 'Agriculture Loan', 'Education Loan', 'Vehicle Loan', 'Gold Loan']
const PIE_VIEWS = [
  { value: 'type', label: 'Loan Type Distribution' },
  { value: 'branch', label: 'Branch-wise Distribution' },
  { value: 'staff', label: 'Staff-wise Distribution' },
  { value: 'customer_category', label: 'Customer Category' },
  { value: 'employment_type', label: 'Employment Type' },
  { value: 'purpose', label: 'Loan Purpose' },
]
const SORT_OPTS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'amount_desc', label: 'Highest Amount' },
  { value: 'amount_asc', label: 'Lowest Amount' },
  { value: 'rate_asc', label: 'Lowest Rate' },
  { value: 'rate_desc', label: 'Highest Rate' },
]

const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#6366f1', '#ec4899', '#84cc16', '#06b6d4', '#d946ef']

function AnimatedValue({ value }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!value) { setDisplay(0); return }
    const duration = 800; const steps = 30
    const target = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0
    const increment = target / steps; let current = 0; let step = 0
    const timer = setInterval(() => { step++; current += increment; if (step >= steps) { setDisplay(target); clearInterval(timer) } else setDisplay(current) }, duration / steps)
    return () => clearInterval(timer)
  }, [value])
  if (typeof value === 'string') return <>{value}</>
  return <>{display.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
}

function KPICard({ icon, title, value, subtitle, color }) {
  return (
    <div className="kpi-card" style={{ '--kpi-color': color || 'var(--accent-color)', borderLeft: `3px solid ${color || 'var(--accent-color)'}` }}>
      <div className="kpi-icon" style={{ background: `${color || 'var(--accent-color)'}1a`, color: color || 'var(--accent-color)' }}>
        <span className="material-symbols-rounded">{icon}</span>
      </div>
      <div className="kpi-body">
        <div className="kpi-value"><AnimatedValue value={value} /></div>
        <div className="kpi-title">{title}</div>
        {subtitle && <div style={{ marginTop: 2 }}><span className="kpi-subtitle">{subtitle}</span></div>}
      </div>
    </div>
  )
}

function DetailSection({ loan, onBack }) {
  const [activeTab, setActiveTab] = useState('info')
  const l = loan.loan || {}
  const totalPaid = parseFloat(l.total_paid || 0)
  const totalPayable = parseFloat(l.total_payable || 1)
  const progress = Math.min(100, Math.round((totalPaid / totalPayable) * 100))
  const remaining = Math.max(0, totalPayable - totalPaid)
  const tabs = [
    { key: 'info', label: 'Loan Info', icon: 'info' },
    { key: 'financial', label: 'Financial', icon: 'account_balance' },
    { key: 'repayment', label: 'Repayment', icon: 'trending_up' },
    { key: 'timeline', label: 'Timeline', icon: 'timeline' },
    { key: 'emi', label: 'EMI History', icon: 'payments' },
    { key: 'documents', label: 'Documents', icon: 'description' },
    { key: 'activities', label: 'Activities', icon: 'history' },
  ]
  const statusHistory = (loan.status_history || []).slice().reverse()
  return (
    <div className="loan-detail-container">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={onBack}><span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_back</span> Back</button>
          <div>
            <div className="page-title" style={{ fontSize: 20, margin: 0 }}>Disbursement Detail</div>
            <div className="page-subtitle"><span className="mono">{loan.application_number}</span> &mdash; {loan.customer_name}</div>
          </div>
        </div>
      </div>
      <div className="detail-tabs" style={{ marginBottom: 16, overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {tabs.map(t => (
          <button key={t.key} className={`detail-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>
      {activeTab === 'info' && (
        <div className="detail-grid">
          <div className="detail-main">
            <div className="detail-section-card">
              <div className="detail-section-title"><span className="material-symbols-rounded" style={{ fontSize: 20 }}>assignment</span> Loan Information</div>
              <div className="detail-info-grid">
                <div><label>Loan ID</label><span className="mono">{loan.application_number}</span></div>
                <div><label>Borrower</label><span>{loan.customer_name}</span></div>
                <div><label>Loan Type</label><span>{loan.loan_type}</span></div>
                <div><label>Purpose</label><span>{loan.purpose || '—'}</span></div>
                <div><label>Approved Amount</label><span style={{ fontWeight: 700 }}>{formatCurrency(loan.amount)}</span></div>
                <div><label>Interest Rate</label><span>{loan.interest_rate}%</span></div>
                <div><label>Assigned Staff</label><span>{loan.assigned_staff_name || '—'}</span></div>
                <div><label>Disbursement Date</label><span>{loan.approved_at ? formatDate(loan.approved_at) : '—'}</span></div>
              </div>
            </div>
          </div>
          <div className="detail-sidebar">
            <div className="detail-sidebar-card">
              <div className="detail-section-title" style={{ fontSize: 13 }}>Quick Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}><span className="material-symbols-rounded" style={{ fontSize: 16 }}>person</span> View Customer Profile</button>
                <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}><span className="material-symbols-rounded" style={{ fontSize: 16 }}>file_download</span> Export PDF</button>
                <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}><span className="material-symbols-rounded" style={{ fontSize: 16 }}>download</span> Export CSV</button>
                <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}><span className="material-symbols-rounded" style={{ fontSize: 16 }}>print</span> Print Loan Summary</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'financial' && (
        <div className="detail-section-card">
          <div className="detail-section-title"><span className="material-symbols-rounded" style={{ fontSize: 20 }}>account_balance</span> Financial Summary</div>
          <div className="detail-info-grid">
            <div><label>Approved Amount</label><span style={{ fontWeight: 700 }}>{formatCurrency(loan.amount)}</span></div>
            <div><label>Disbursed Amount</label><span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(loan.amount)}</span></div>
            <div><label>Interest Rate</label><span>{loan.interest_rate}%</span></div>
            <div><label>Monthly EMI</label><span style={{ fontWeight: 700, color: 'var(--accent-color)' }}>{formatCurrency(l.emi)}</span></div>
            <div><label>Outstanding Balance</label><span style={{ fontWeight: 700, color: 'var(--warning)' }}>{formatCurrency(remaining)}</span></div>
            <div><label>Remaining Term</label><span>{l.remaining_emis || 0} / {l.duration_months || '—'} months</span></div>
            <div><label>Next EMI Date</label><span>{l.next_due_date ? formatDate(l.next_due_date) : '—'}</span></div>
          </div>
        </div>
      )}
      {activeTab === 'repayment' && (
        <div>
          <div className="detail-section-card" style={{ marginBottom: 16 }}>
            <div className="detail-section-title"><span className="material-symbols-rounded" style={{ fontSize: 20 }}>trending_up</span> Repayment Progress</div>
            <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
              <div><div className="stat-sub">Total Paid</div><div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(totalPaid)}</div></div>
              <div><div className="stat-sub">Remaining</div><div style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning)' }}>{formatCurrency(remaining)}</div></div>
              <div><div className="stat-sub">Progress</div><div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-color)' }}>{progress}%</div></div>
            </div>
            <div style={{ width: '100%', height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${progress}%`, height: '100%', background: progress >= 80 ? 'var(--success)' : progress >= 50 ? '#f59e0b' : 'var(--danger)', borderRadius: 3 }} />
            </div>
          </div>
        </div>
      )}
      {activeTab === 'timeline' && (
        <div className="detail-section-card">
          <div className="detail-section-title"><span className="material-symbols-rounded" style={{ fontSize: 20 }}>timeline</span> Loan Timeline</div>
          <div className="timeline-vertical" style={{ marginTop: 8 }}>
            {statusHistory.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No timeline data available</div>
            : statusHistory.map((h, i) => (
              <div key={h.id || i} className="tlv-item">
                <div className="tlv-dot" style={{ background: h.new_status === 'approved' || h.new_status === 'disbursed' ? 'var(--success)' : h.new_status === 'rejected' ? 'var(--danger)' : h.new_status === 'submitted' ? 'var(--accent-color)' : 'var(--text-muted)' }} />
                <div className="tlv-content">
                  <div style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{h.new_status?.replace(/_/g, ' ') || '—'}</div>
                  {h.remarks && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{h.remarks}</div>}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.changed_by ? `by ${h.changed_by}` : ''}{h.changed_at ? ` · ${formatDate(h.changed_at)}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'emi' && (
        <div className="detail-section-card">
          <div className="detail-section-title"><span className="material-symbols-rounded" style={{ fontSize: 20 }}>payments</span> EMI History</div>
          <div className="table-container" style={{ marginTop: 8 }}>
            <table className="custom-table" style={{ minWidth: 700 }}>
              <thead><tr><th>#</th><th>Due Date</th><th>Paid Date</th><th>Amount</th><th>Status</th><th>Reference</th></tr></thead>
              <tbody>{(l.repayments || []).length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No EMI records</td></tr>
                : (l.repayments || []).map(r => (
                  <tr key={r.id}>
                    <td>{r.emi_number || '—'}</td>
                    <td>{r.due_date ? formatDate(r.due_date) : '—'}</td>
                    <td>{r.repayment_date ? formatDate(r.repayment_date) : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(r.amount)}</td>
                    <td><span className={`badge ${r.status === 'paid' ? 'badge-success' : r.status === 'overdue' ? 'badge-danger' : 'badge-muted'}`}>{r.status === 'paid' ? 'Paid' : r.status === 'overdue' ? 'Overdue' : 'Upcoming'}</span></td>
                    <td><span className="mono" style={{ fontSize: 11 }}>TXN-{r.id || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'documents' && (
        <div className="detail-section-card">
          <div className="detail-section-title"><span className="material-symbols-rounded" style={{ fontSize: 20 }}>description</span> Documents</div>
          {(!loan.documents || loan.documents.length === 0) ? (
            <div className="empty" style={{ padding: 40 }}><span className="material-symbols-rounded" style={{ fontSize: 40, color: 'var(--text-muted)' }}>description</span><div style={{ color: 'var(--text-muted)' }}>No documents uploaded</div></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 12 }}>
              {loan.documents.map(d => (
                <div key={d.id} className="card-stat" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 28, color: 'var(--accent-color)' }}>description</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{d.document_type || 'Document'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.file_name || ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-sm btn-secondary" title="View"><span className="material-symbols-rounded" style={{ fontSize: 16 }}>visibility</span></button>
                    <button className="btn btn-sm btn-secondary" title="Download"><span className="material-symbols-rounded" style={{ fontSize: 16 }}>download</span></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {activeTab === 'activities' && (
        <div className="detail-section-card">
          <div className="detail-section-title"><span className="material-symbols-rounded" style={{ fontSize: 20 }}>history</span> Recent Activities</div>
          <div className="timeline-vertical" style={{ marginTop: 8 }}>
            {statusHistory.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No activity records</div>
            : statusHistory.map((h, i) => (
              <div key={h.id || i} className="tlv-item">
                <div className="tlv-dot" style={{ background: h.new_status === 'approved' || h.new_status === 'disbursed' ? 'var(--success)' : h.new_status === 'rejected' ? 'var(--danger)' : 'var(--accent-color)' }} />
                <div className="tlv-content">
                  <div style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{h.new_status?.replace(/_/g, ' ') || '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{h.changed_at ? formatDate(h.changed_at) : ''}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.changed_by ? `by ${h.changed_by}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function exportCSV(loans, filename) {
  const headers = ['Loan ID', 'Borrower', 'Loan Type', 'Approved Amount', 'Disbursed Amount', 'Disbursement Date', 'Interest Rate', 'Approved By', 'Processed By', 'Status']
  const rows = loans.map(l => [
    l.application_number, l.customer_name || '', l.loan_type || '', l.amount, l.amount,
    l.approved_at ? formatDate(l.approved_at) : '', l.interest_rate + '%',
    '', l.assigned_staff_name || '', l.status || ''
  ])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename || 'disbursed-loans.csv'; a.click()
  URL.revokeObjectURL(a.href)
}

function exportPDF(loans) {
  const w = window.open('', '_blank')
  if (!w) return
  const rows = loans.map(l => `<tr><td>${l.application_number}</td><td>${l.customer_name || ''}</td><td>${l.loan_type || ''}</td><td style="text-align:right">${formatCurrency(l.amount)}</td><td style="text-align:right">${formatCurrency(l.amount)}</td><td>${l.approved_at ? formatDate(l.approved_at) : ''}</td><td>${l.interest_rate}%</td><td>${l.assigned_staff_name || ''}</td><td>${(l.status || '').replace(/_/g, ' ')}</td></tr>`).join('')
  w.document.write(`<html><head><title>Disbursed Loans</title><style>body{font-family:Arial,sans-serif;padding:20px}h2{color:#1e293b}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#f1f5f9;padding:8px 10px;text-align:left;font-size:12px;font-weight:600;text-transform:uppercase;color:#64748b}td{padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px}.mono{font-family:monospace}</style></head><body><h2>Disbursed Loans Report</h2><p>${new Date().toLocaleDateString()}</p><table><thead><tr><th>Loan ID</th><th>Borrower</th><th>Loan Type</th><th>Approved Amount</th><th>Disbursed Amount</th><th>Date</th><th>Rate</th><th>Processed By</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><p style="margin-top:20px;color:#94a3b8;font-size:12px">Total Loans: ${loans.length}</p></body></html>`)
  w.document.close()
}

export default function StaffDisbursedLoans() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [filters, setFilters] = useState({ search: '', loanType: '', branch: '', disbursementDate: '', amountRange: '', staffName: '', sort: 'newest' })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [trendPeriod, setTrendPeriod] = useState('monthly')
  const [trendLoanType, setTrendLoanType] = useState('All Loan Types')
  const [pieView, setPieView] = useState('type')
  const containerRef = useRef(null)

  useEffect(() => {
    staffDisbursedLoans()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const d = data || {}

  const loans = useMemo(() => {
    let list = [...(d.disbursed_loans || [])]
    const q = filters.search.toLowerCase()
    if (q) list = list.filter(l => l.application_number?.toLowerCase().includes(q) || l.customer_name?.toLowerCase().includes(q) || l.customer_phone?.includes(q))
    if (filters.loanType) list = list.filter(l => l.loan_type === filters.loanType)
    if (filters.branch) list = list.filter(l => { const c = l.customer; if (!c) return false; const addr = c.address || ''; const parts = addr.split(',').map(p => p.trim()); return parts.some(p => p.toLowerCase().includes(filters.branch.toLowerCase())) })
    if (filters.staffName) list = list.filter(l => (l.assigned_staff_name || '').toLowerCase().includes(filters.staffName.toLowerCase()))
    if (filters.amountRange) {
      const [min, max] = filters.amountRange.split('-').map(Number)
      list = list.filter(l => { const amt = parseFloat(l.amount); return max ? (amt >= min && amt <= max) : amt >= min })
    }
    if (filters.disbursementDate) {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      if (filters.disbursementDate === 'today') list = list.filter(l => { if (!l.approved_at) return false; const d = new Date(l.approved_at.slice(0, 10)); return d.getTime() === today.getTime() })
      else if (filters.disbursementDate === 'this_week') { const start = new Date(today); start.setDate(start.getDate() - start.getDay()); list = list.filter(l => { if (!l.approved_at) return false; const d = new Date(l.approved_at.slice(0, 10)); return d >= start && d <= today }) }
      else if (filters.disbursementDate === 'this_month') list = list.filter(l => { if (!l.approved_at) return false; const d = new Date(l.approved_at.slice(0, 10)); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() })
      else if (filters.disbursementDate === 'last_month') { const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1); const lastDay = new Date(today.getFullYear(), today.getMonth(), 0); list = list.filter(l => { if (!l.approved_at) return false; const d = new Date(l.approved_at.slice(0, 10)); return d >= firstDay && d <= lastDay }) }
    }
    const sortMap = { newest: (a, b) => new Date(b.approved_at || 0) - new Date(a.approved_at || 0), oldest: (a, b) => new Date(a.approved_at || 0) - new Date(b.approved_at || 0), amount_desc: (a, b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0), amount_asc: (a, b) => parseFloat(a.amount || 0) - parseFloat(b.amount || 0), rate_asc: (a, b) => parseFloat(a.interest_rate || 0) - parseFloat(b.interest_rate || 0), rate_desc: (a, b) => parseFloat(b.interest_rate || 0) - parseFloat(a.interest_rate || 0) }
    list.sort(sortMap[filters.sort] || sortMap.newest)
    return list
  }, [d.disbursed_loans, filters])

  const paginatedLoans = loans.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const hasActiveFilters = filters.search || filters.loanType || filters.branch || filters.disbursementDate || filters.amountRange || filters.staffName
  const clearFilters = () => setFilters({ search: '', loanType: '', branch: '', disbursementDate: '', amountRange: '', staffName: '', sort: 'newest' })

  const trendData = useMemo(() => {
    const allApps = d.disbursed_loans || []
    let filtered = allApps
    if (trendLoanType !== 'All Loan Types') filtered = allApps.filter(a => a.loan_type === trendLoanType)

    if (trendPeriod === 'daily') {
      if (trendLoanType === 'All Loan Types') {
        const raw = d.daily_trend || []
        return { labels: raw.map(t => t.label), amounts: raw.map(t => t.disbursed_amount), counts: raw.map(t => t.loan_count), fullLabels: raw.map(t => t.full_label) }
      }
      const result = []; const today = new Date(); today.setHours(0, 0, 0, 0)
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i)
        const ds = d.toISOString().slice(0, 10)
        const dayApps = filtered.filter(a => a.approved_at && a.approved_at.slice(0, 10) === ds)
        result.push({ label: d.toLocaleDateString('en', { weekday: 'short' }), disbursed_amount: dayApps.reduce((s, a) => s + parseFloat(a.amount || 0), 0), loan_count: dayApps.length, full_label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) })
      }
      return { labels: result.map(r => r.label), amounts: result.map(r => r.disbursed_amount), counts: result.map(r => r.loan_count), fullLabels: result.map(r => r.full_label) }
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const currentMonth = new Date().getMonth()
    if (trendLoanType === 'All Loan Types') {
      const raw = d.monthly_trend || []
      const labels = []; const amounts = []; const counts = []
      for (const t of raw) {
        labels.push(months[t.month - 1] || '')
        if (t.month - 1 > currentMonth) { amounts.push(null); counts.push(null) }
        else { amounts.push(t.disbursed_amount || 0); counts.push(t.loan_count || 0) }
      }
      return { labels, amounts, counts }
    }
    const labels = []; const amounts = []; const counts = []
    for (let m = 1; m <= 12; m++) {
      labels.push(months[m - 1])
      if (m - 1 > currentMonth) { amounts.push(null); counts.push(null); continue }
      const monthApps = filtered.filter(a => a.approved_at && new Date(a.approved_at.slice(0, 10)).getMonth() + 1 === m && new Date(a.approved_at.slice(0, 10)).getFullYear() === new Date().getFullYear())
      amounts.push(monthApps.reduce((s, a) => s + parseFloat(a.amount || 0), 0))
      counts.push(monthApps.length)
    }
    return { labels, amounts, counts }
  }, [d.disbursed_loans, d.monthly_trend, d.daily_trend, trendPeriod, trendLoanType])

  const lineChartData = useMemo(() => {
    const colors = { line: '#3b82f6', fill: 'rgba(59,130,246,0.08)', countLine: '#10b981', countFill: 'rgba(16,185,129,0.08)' }
    return {
      labels: trendData.labels,
      datasets: [
        { label: 'Disbursed Amount (NRP)', data: trendData.amounts, borderColor: colors.line, backgroundColor: colors.fill, fill: true, tension: 0.4, pointRadius: 3, pointHoverRadius: 5, yAxisID: 'y', spanGaps: true },
        { label: 'Loans Disbursed', data: trendData.counts, borderColor: colors.countLine, backgroundColor: colors.countFill, fill: true, tension: 0.4, pointRadius: 3, pointHoverRadius: 5, yAxisID: 'y1', spanGaps: true }
      ]
    }
  }, [trendData])

  const lineOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 11 } } }, tooltip: { callbacks: { label: ctx => ctx.datasetIndex === 0 ? ` Disbursed: NRP ${Number(ctx.raw || 0).toLocaleString()}` : ` Loans: ${ctx.raw}` } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { type: 'linear', display: true, position: 'left', ticks: { font: { size: 10 }, callback: v => 'NRP ' + (v / 1000).toFixed(0) + 'k' }, grid: { color: 'rgba(0,0,0,0.04)' } },
      y1: { type: 'linear', display: true, position: 'right', ticks: { font: { size: 10 } }, grid: { display: false } }
    }
  }), [])

  const pieData = useMemo(() => {
    const maps = {
      type: d.type_distribution || [],
      branch: d.branch_distribution || [],
      staff: d.staff_distribution || [],
      customer_category: d.customer_category_distribution || [],
      employment_type: d.employment_type_distribution || [],
      purpose: d.purpose_distribution || [],
    }
    const items = maps[pieView] || []
    return {
      labels: items.map(i => i.label),
      datasets: [{ data: items.map(i => i.value), backgroundColor: chartColors.slice(0, items.length), borderWidth: 0 }],
      items
    }
  }, [d, pieView])

  const pieOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} (${((ctx.raw / ctx.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%)` } } },
    cutout: '55%',
  }), [])

  if (loading) return (
    <div>
      <div className="page-header"><div><div className="page-title">Disbursed Loans</div><div className="page-subtitle">Monitor and analyze all disbursed loan activity</div></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>{[1,2,3,4,5,6].map(i => <div key={i} className="skeleton-card" style={{ height: 100 }} />)}</div>
    </div>
  )

  if (selectedLoan) return <DetailSection loan={selectedLoan} onBack={() => setSelectedLoan(null)} />

  return (
    <div ref={containerRef}>
      <style>{`
        .dl-table th, .dl-table td { padding: 10px 12px !important; vertical-align: middle; }
        .dl-table td .mono { font-size: 13px; }
        .dl-name { font-weight: 600; font-size: 14px; }
        .dl-amount { text-align: right; display: block; font-size: 13px; font-weight: 700; }
        .dl-filter-label { display: block; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px; }
        .dl-trend-toggle { display: flex; background: var(--bg-tertiary); border-radius: 6px; padding: 2px; gap: 2px; }
        .dl-trend-toggle button { border: none; background: transparent; padding: 5px 14px; border-radius: 5px; font-size: 12px; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all .15s; }
        .dl-trend-toggle button.active { background: #fff; color: var(--text-primary); box-shadow: 0 1px 3px rgba(0,0,0,.1); }
        .dl-pie-legend { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .dl-pie-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; padding: 4px 10px; background: var(--bg-tertiary); border-radius: 4px; }
        .dl-pie-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        @media (max-width: 900px) { .dl-filter-bar { flex-wrap: wrap; } .dl-filter-bar > .filter-group { flex: 1 1 170px !important; } }
        @media (max-width: 600px) { .dl-filter-bar > .filter-group { flex: 1 1 100% !important; min-width: 100% !important; } }
      `}</style>

      <div className="page-header">
        <div>
          <div className="page-title">Disbursed Loans</div>
          <div className="page-subtitle">Monitor and analyze all disbursed loan activity</div>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '6px 14px', borderRadius: 8 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 16, verticalAlign: -3 }}>today</span> {new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kathmandu', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <KPICard icon="payments" title="Total Disbursed Amount" value={d.total_amount ? 'NRP ' + Number(d.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : 'NRP 0.00'} subtitle="Total NRP disbursed to date" color="#3b82f6" />
        <KPICard icon="today" title="Today's Disbursement Amount" value={d.today_amount ? 'NRP ' + Number(d.today_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : 'NRP 0.00'} subtitle="Amount released today" color="#8b5cf6" />
        <KPICard icon="handshake" title="Today's Disbursed Loans" value={d.today_disbursements || d.todays_disbursement || 0} subtitle="Loans disbursed today" color="#10b981" />
        <KPICard icon="calendar_month" title="This Month Disbursed Amount" value={d.this_month_amount ? 'NRP ' + Number(d.this_month_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : 'NRP 0.00'} subtitle="Total disbursed this month" color="#f59e0b" />
        <KPICard icon="stacked_bar_chart" title="This Month Disbursed Loans" value={d.this_month_count || 0} subtitle="Loans disbursed this month" color="#3b82f6" />
        <KPICard icon="analytics" title="Average Disbursement Amount" value={d.average_disbursement ? 'NRP ' + Number(d.average_disbursement).toLocaleString('en-US', { minimumFractionDigits: 2 }) : 'NRP 0.00'} subtitle="Per loan average" color="#10b981" />
      </div>

      <div className="charts-row" style={{ gridTemplateColumns: '1.8fr 1fr' }}>
        <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div className="card-title" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Monthly Loan Disbursement Trend</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Track disbursement volume over time</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="dl-trend-toggle">
                <button className={trendPeriod === 'monthly' ? 'active' : ''} onClick={() => setTrendPeriod('monthly')}>Monthly</button>
                <button className={trendPeriod === 'daily' ? 'active' : ''} onClick={() => setTrendPeriod('daily')}>Last 7 Days</button>
              </div>
              <select className="form-control" value={trendLoanType} onChange={e => setTrendLoanType(e.target.value)} style={{ fontSize: 12, padding: '5px 10px', height: 'auto', width: 140 }}>
                {LOAN_TYPES_FILTER.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ padding: '2px 12px 12px', height: 280 }}>
            <Line data={lineChartData} options={lineOptions} />
          </div>
        </div>
        <div className="chart-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div className="card-title" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Disbursement Insights</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Analyze from different perspectives</div>
            </div>
            <select className="form-control" value={pieView} onChange={e => setPieView(e.target.value)} style={{ fontSize: 12, padding: '5px 10px', height: 'auto', width: 175 }}>
              {PIE_VIEWS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minHeight: 200, display: 'flex', flexDirection: 'column' }}>
            {(pieData.items || []).length > 0 ? (
              <div style={{ width: '100%', height: 240 }}>
                <Doughnut data={pieData} options={pieOptions} />
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 36 }}>pie_chart</span>
                <div style={{ fontSize: 12, marginTop: 4 }}>No data available</div>
              </div>
            )}
            <div className="dl-pie-legend">
              {(pieData.items || []).map((item, i) => (
                <div key={i} className="dl-pie-legend-item">
                  <span className="dl-pie-legend-dot" style={{ background: chartColors[i % chartColors.length] }} />
                  <span>{item.label}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{item.percentage}%</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>({item.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="table-container" style={{ marginBottom: 16 }}>
        <div className="table-header-bar" style={{ padding: '14px 20px' }}>
          <span className="table-title">Search &amp; Filters</span>
          {hasActiveFilters && (
            <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }} onClick={clearFilters}>
              <span className="material-symbols-rounded" style={{ fontSize: 14 }}>close</span> Clear All
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 8, alignItems: 'flex-end', padding: '12px 20px 16px' }}>
          <div className="filter-group" style={{ flex: '1.6', minWidth: 140, position: 'relative' }}>
            <span className="material-symbols-rounded" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18, pointerEvents: 'none' }}>search</span>
            <input className="form-control" placeholder="Search Loan ID, Borrower, Account..." value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} style={{ paddingLeft: 36, width: '100%' }} />
          </div>
          <div className="filter-group" style={{ flex: '1', minWidth: 120 }}>
            <label className="dl-filter-label">Loan Type</label>
            <select className="form-control" value={filters.loanType} onChange={e => setFilters(p => ({ ...p, loanType: e.target.value }))}>
              <option value="">All Types</option>
              {LOAN_TYPES_FILTER.filter(t => t !== 'All Loan Types').map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="filter-group" style={{ flex: '1', minWidth: 100 }}>
            <label className="dl-filter-label">Branch</label>
            <select className="form-control" value={filters.branch} onChange={e => setFilters(p => ({ ...p, branch: e.target.value }))}>
              <option value="">All Branches</option>
              <option value="Main Branch">Main Branch</option>
              <option value="Downtown">Downtown</option>
              <option value="Suburban">Suburban</option>
              <option value="Rural">Rural</option>
            </select>
          </div>
          <div className="filter-group" style={{ flex: '1', minWidth: 120 }}>
            <label className="dl-filter-label">Disbursement Date</label>
            <select className="form-control" value={filters.disbursementDate} onChange={e => setFilters(p => ({ ...p, disbursementDate: e.target.value }))}>
              <option value="">All Dates</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
            </select>
          </div>
          <div className="filter-group" style={{ flex: '1', minWidth: 110 }}>
            <label className="dl-filter-label">Amount Range</label>
            <select className="form-control" value={filters.amountRange} onChange={e => setFilters(p => ({ ...p, amountRange: e.target.value }))}>
              <option value="">All Amounts</option>
              <option value="0-50000">Below NRP 50,000</option>
              <option value="50000-200000">NRP 50k – 200k</option>
              <option value="200000-500000">NRP 200k – 500k</option>
              <option value="500000-999999999">Above NRP 500k</option>
            </select>
          </div>
          <div className="filter-group" style={{ flex: '1', minWidth: 110 }}>
            <label className="dl-filter-label">Staff Name</label>
            <input className="form-control" placeholder="e.g. admin" value={filters.staffName} onChange={e => setFilters(p => ({ ...p, staffName: e.target.value }))} />
          </div>
          <div className="filter-group" style={{ flex: '0.85', minWidth: 100 }}>
            <label className="dl-filter-label">Sort By</label>
            <select className="form-control" value={filters.sort} onChange={e => setFilters(p => ({ ...p, sort: e.target.value }))}>
              {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="table-container" style={{ marginTop: 16 }}>
        <div className="table-header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="table-title">{loans.length} Disbursed Loan{loans.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-secondary" onClick={() => exportCSV(loans, 'disbursed-loans.csv')}>
              <span className="material-symbols-rounded" style={{ fontSize: 14 }}>file_download</span> Export CSV
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => exportPDF(loans)}>
              <span className="material-symbols-rounded" style={{ fontSize: 14 }}>picture_as_pdf</span> Export PDF
            </button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table dl-table" style={{ minWidth: 1100 }}>
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Borrower</th>
                <th>Loan Type</th>
                <th style={{ textAlign: 'right' }}>Approved Amount</th>
                <th style={{ textAlign: 'right' }}>Disbursed Amount</th>
                <th>Disbursement Date</th>
                <th>Interest Rate</th>
                <th>Approved By</th>
                <th>Processed By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLoans.map(loan => (
                <tr key={loan.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLoan(loan)}>
                  <td><span className="mono">{loan.application_number}</span></td>
                  <td><span className="dl-name">{loan.customer_name || '—'}</span></td>
                  <td><span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{loan.loan_type || '—'}</span></td>
                  <td><span className="dl-amount">{formatCurrency(loan.amount)}</span></td>
                  <td><span className="dl-amount" style={{ color: 'var(--success)' }}>{formatCurrency(loan.amount)}</span></td>
                  <td><span style={{ fontSize: 13 }}>{loan.approved_at ? formatDate(loan.approved_at) : '—'}</span></td>
                  <td><span style={{ fontSize: 13 }}>{loan.interest_rate}%</span></td>
                  <td><span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>—</span></td>
                  <td><span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{loan.assigned_staff_name || '—'}</span></td>
                  <td><span className={`badge ${loan.status === 'approved' ? 'badge-success' : loan.status === 'rejected' ? 'badge-danger' : 'badge-muted'}`}>{loan.status?.replace(/_/g, ' ') || '—'}</span></td>
                </tr>
              ))}
              {paginatedLoans.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No disbursed loans found matching your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalItems={loans.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  )
}
