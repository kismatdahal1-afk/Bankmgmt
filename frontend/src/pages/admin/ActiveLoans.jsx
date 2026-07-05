import { useState, useEffect, useMemo } from 'react'
import { adminActiveLoans } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'
import CombinedTrendChart from '../../components/charts/CombinedTrendChart'
import PortfolioDoughnut from '../../components/charts/PortfolioDoughnut'
import PaymentStatusBadge from '../../components/common/PaymentStatusBadge'
import Pagination from '../../components/common/Pagination'

const LOAN_TYPES = ['', 'Personal Loan', 'Home Loan', 'Business Loan', 'Agriculture Loan', 'Education Loan', 'Vehicle Loan']
const PAYMENT_STATUS_OPTS = [
  { value: 'all', label: 'All Status' },
  { value: 'current', label: 'Current' },
  { value: 'due_soon', label: 'Due Soon' },
  { value: 'overdue', label: 'Overdue' }
]
const SORT_OPTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'amount_desc', label: 'Highest Loan Amount' },
  { value: 'amount_asc', label: 'Lowest Loan Amount' },
  { value: 'balance_desc', label: 'Highest Outstanding Balance' },
  { value: 'balance_asc', label: 'Lowest Outstanding Balance' },
  { value: 'next_due', label: 'Next Due Date' },
  { value: 'remaining_term', label: 'Remaining Term' }
]

function HealthBadge({ status, score }) {
  const cfg = {
    healthy: { label: 'Healthy', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    upcoming: { label: 'Upcoming', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    at_risk: { label: 'At Risk', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    overdue: { label: 'Overdue', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    high_risk: { label: 'Default Risk', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' }
  }
  const s = status === 'overdue' && (score || 0) < 20 ? 'high_risk' : status === 'overdue' ? 'overdue' : status === 'upcoming' ? 'upcoming' : score >= 80 ? 'healthy' : 'at_risk'
  const c = cfg[s] || cfg.healthy
  return <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, background:c.bg, color:c.color }}>{c.label}</span>
}

function ProgressBar({ value, color }) {
  const barColor = color || (value >= 80 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444')
  return (
    <div style={{ width:'100%', height:5, background:'var(--bg-tertiary)', borderRadius:3, overflow:'hidden' }}>
      <div style={{ width:`${Math.min(100, Math.max(0, value))}%`, height:'100%', background:barColor, borderRadius:3, transition:'width 0.4s ease' }} />
    </div>
  )
}

function KPICard({ icon, title, value, subtitle, color, iconBg }) {
  return (
    <div className="kpi-card" style={{ '--kpi-color': color || 'var(--accent-color)' }}>
      <div className="kpi-icon" style={{ background: iconBg || `${color || 'var(--accent-color)'}1a`, color: color || 'var(--accent-color)' }}>
        <span className="material-symbols-rounded">{icon}</span>
      </div>
      <div className="kpi-body">
        <div className="kpi-value">{value}</div>
        <div className="kpi-title">{title}</div>
        {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
      </div>
    </div>
  )
}

function FilterSection({ filters, setFilters }) {
  const update = (k, v) => setFilters(p => ({ ...p, [k]: v }))
  const hasActive = filters.search || filters.loanType || filters.paymentStatus !== 'all' || filters.interestRate || filters.remainingTerm || filters.dueDate || filters.dateFrom || filters.dateTo
  const clearFilters = () => setFilters({ search:'', loanType:'', paymentStatus:'all', interestRate:'', remainingTerm:'', dueDate:'', dateFrom:'', dateTo:'', sort:'newest' })

  return (
    <div className="table-container" style={{ marginBottom: 16 }}>
      <div className="table-header-bar" style={{ padding: '14px 20px' }}>
        <span className="table-title">Search &amp; Filters</span>
        {hasActive && (
          <button className="btn btn-sm" style={{ background:'rgba(239,68,68,0.12)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.3)' }} onClick={clearFilters}>
            <span className="material-symbols-rounded" style={{ fontSize:14 }}>close</span> Clear
          </button>
        )}
      </div>
      <div className="al-filter-bar">
        <div className="filter-group" style={{ flex:'1.6', minWidth:140, position:'relative' }}>
          <span className="material-symbols-rounded" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:18, pointerEvents:'none' }}>search</span>
          <input className="form-control" placeholder="Loan ID, Borrower, Phone..." value={filters.search} onChange={e => update('search', e.target.value)} style={{ paddingLeft:36, width:'100%' }} />
        </div>
        <div className="filter-group" style={{ flex:'1', minWidth:120 }}>
          <label className="al-filter-label">Type</label>
          <select className="form-control" value={filters.loanType} onChange={e => update('loanType', e.target.value)}>
            <option value="">All Types</option>
            {LOAN_TYPES.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="filter-group" style={{ flex:'1', minWidth:110 }}>
          <label className="al-filter-label">Status</label>
          <select className="form-control" value={filters.paymentStatus} onChange={e => update('paymentStatus', e.target.value)}>
            {PAYMENT_STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="filter-group" style={{ flex:'1', minWidth:110 }}>
          <label className="al-filter-label">Rate</label>
          <select className="form-control" value={filters.interestRate} onChange={e => update('interestRate', e.target.value)}>
            <option value="">All Rates</option>
            <option value="below_8">Below 8%</option>
            <option value="8_10">8% – 10%</option>
            <option value="10_12">10% – 12%</option>
            <option value="above_12">Above 12%</option>
          </select>
        </div>
        <div className="filter-group" style={{ flex:'1', minWidth:120 }}>
          <label className="al-filter-label">Term</label>
          <select className="form-control" value={filters.remainingTerm} onChange={e => update('remainingTerm', e.target.value)}>
            <option value="">All Terms</option>
            <option value="lt_12">&lt; 12 Months</option>
            <option value="12_24">12 – 24 Months</option>
            <option value="24_36">24 – 36 Months</option>
            <option value="gt_36">&gt; 36 Months</option>
          </select>
        </div>
        <div className="filter-group" style={{ flex:'1', minWidth:130 }}>
          <label className="al-filter-label">Due Date</label>
          <select className="form-control" value={filters.dueDate} onChange={e => update('dueDate', e.target.value)}>
            <option value="">All</option>
            <option value="today">Today</option>
            <option value="next_7">7 Days</option>
            <option value="this_month">Month</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div className="filter-group" style={{ flex:'0.85', minWidth:100 }}>
          <label className="al-filter-label">Sort</label>
          <select className="form-control" value={filters.sort} onChange={e => update('sort', e.target.value)}>
            {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      {filters.dueDate === 'custom' && (
        <div className="al-custom-date-row">
          <div className="filter-group">
            <label className="al-filter-label">Start Date</label>
            <input type="date" className="form-control" value={filters.dateFrom} onChange={e => update('dateFrom', e.target.value)} />
          </div>
          <div className="filter-group">
            <label className="al-filter-label">End Date</label>
            <input type="date" className="form-control" value={filters.dateTo} onChange={e => update('dateTo', e.target.value)} />
          </div>
        </div>
      )}
    </div>
  )
}

function DetailSection({ loan, onBack, role }) {
  const c = loan.customer || {}
  const totalPaid = parseFloat(loan.total_paid || 0)
  const totalPayable = parseFloat(loan.total_payable || 1)
  const progress = Math.min(100, Math.round((totalPaid / totalPayable) * 100))
  const remaining = Math.max(0, totalPayable - totalPaid)
  const [activeTab, setActiveTab] = useState('schedule')

  const tabs = [
    { key:'schedule', label:'Schedule', icon:'calendar_month' },
    { key:'timeline', label:'Timeline', icon:'timeline' },
    { key:'documents', label:'Documents', icon:'description' },
    { key:'collateral', label:'Collateral', icon:'real_estate_agent' },
    { key:'notes', label:'Notes', icon:'note' },
    { key:'visits', label:'Visits', icon:'map' }
  ]

  return (
    <div className="loan-detail-container">
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <button className="btn btn-secondary btn-sm" onClick={onBack}><span className="material-symbols-rounded" style={{ fontSize:18 }}>arrow_back</span> Back</button>
          <div>
            <div className="page-title" style={{ fontSize:20 }}>Loan Detail</div>
            <div className="page-subtitle"><span className="mono">{loan.application_number || loan.loan_number}</span> &mdash; {c.full_name}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {role === 'admin' && <>
            <button className="btn btn-outline btn-sm"><span className="material-symbols-rounded" style={{ fontSize:16 }}>download</span> Export</button>
            <button className="btn btn-outline btn-sm" style={{ borderColor:'#f59e0b', color:'#f59e0b' }}><span className="material-symbols-rounded" style={{ fontSize:16 }}>ac_unit</span> Freeze</button>
            <button className="btn btn-outline btn-sm" style={{ borderColor:'#ef4444', color:'#ef4444' }}><span className="material-symbols-rounded" style={{ fontSize:16 }}>block</span> Close</button>
          </>}
          {role === 'staff' && <>
            <button className="btn btn-primary btn-sm"><span className="material-symbols-rounded" style={{ fontSize:16 }}>edit_note</span> Add Note</button>
            <button className="btn btn-secondary btn-sm"><span className="material-symbols-rounded" style={{ fontSize:16 }}>calendar_add</span> Schedule Visit</button>
          </>}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="detail-section-card">
            <div className="detail-section-title"><span className="material-symbols-rounded" style={{ fontSize:20 }}>person</span> Borrower Information</div>
            <div className="detail-info-grid">
              <div><label>Name</label><span>{c.full_name || '—'}</span></div>
              <div><label>Phone</label><span>{c.phone_number || '—'}</span></div>
              <div><label>Email</label><span>{c.email || '—'}</span></div>
              <div><label>Address</label><span>{c.address || '—'}</span></div>
              <div><label>Occupation</label><span>{c.occupation || '—'}</span></div>
              <div><label>Citizenship</label><span>{c.citizenship_id || '—'}</span></div>
              <div><label>Nominee</label><span>{c.nominee_name || '—'}</span></div>
              <div><label>Relationship</label><span>{c.nominee_relationship || '—'}</span></div>
            </div>
          </div>

          <div className="detail-section-card">
            <div className="detail-section-title"><span className="material-symbols-rounded" style={{ fontSize:20 }}>account_balance</span> Loan Information</div>
            <div className="detail-info-grid">
              <div><label>Loan Type</label><span>{loan.loan_type || '—'}</span></div>
              <div><label>Amount</label><span style={{ fontWeight:700 }}>{formatCurrency(loan.amount)}</span></div>
              <div><label>Interest Rate</label><span>{loan.interest_rate}%</span></div>
              <div><label>Term</label><span>{loan.duration_months} months</span></div>
              <div><label>Monthly EMI</label><span style={{ fontWeight:700, color:'var(--accent-color)' }}>{formatCurrency(loan.emi)}</span></div>
              <div><label>Remaining Balance</label><span style={{ fontWeight:700, color:'var(--warning)' }}>{formatCurrency(remaining)}</span></div>
              <div><label>Disbursed</label><span>{loan.disbursed_date ? formatDate(loan.disbursed_date) : '—'}</span></div>
              <div><label>Expected Completion</label><span>{loan.expected_completion ? formatDate(loan.expected_completion) : '—'}</span></div>
              <div><label>Purpose</label><span>{loan.purpose || '—'}</span></div>
              <div><label>Collateral</label><span>{loan.collateral_type || '—'}</span></div>
              {role === 'admin' && <div><label>Assigned Staff</label><span>{loan.assigned_staff_name || '—'}</span></div>}
            </div>
          </div>

          <div className="detail-section-card">
            <div className="detail-section-title"><span className="material-symbols-rounded" style={{ fontSize:20 }}>trending_up</span> Repayment Progress</div>
            <div style={{ display:'flex', gap:24, marginBottom:16 }}>
              <div><div className="stat-sub">Total Paid</div><div style={{ fontSize:22, fontWeight:700, color:'var(--success)' }}>{formatCurrency(totalPaid)}</div></div>
              <div><div className="stat-sub">Remaining</div><div style={{ fontSize:22, fontWeight:700, color:'var(--warning)' }}>{formatCurrency(remaining)}</div></div>
              <div><div className="stat-sub">Progress</div><div style={{ fontSize:22, fontWeight:700, color:'var(--accent-color)' }}>{progress}%</div></div>
              <div><div className="stat-sub">Remaining EMIs</div><div style={{ fontSize:22, fontWeight:700 }}>{loan.remaining_emis || 0}</div></div>
            </div>
            <ProgressBar value={progress} />
          </div>

          <div className="detail-tabs">
            {tabs.map(t => (
              <button key={t.key} className={`detail-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
                <span className="material-symbols-rounded" style={{ fontSize:18 }}>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          <div className="detail-tab-content">
            {activeTab === 'schedule' && (
              <div className="table-container">
                <table className="custom-table">
                  <thead><tr><th>#</th><th>Due Date</th><th>EMI Amount</th><th>Paid Date</th><th>Status</th><th>Late Fee</th></tr></thead>
                  <tbody>
                    {(loan.repayments || []).length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign:'center', padding:30, color:'var(--text-muted)' }}>No repayment records</td></tr>
                    ) : (loan.repayments || []).map(r => {
                      const emiAmount = parseFloat(r.amount || 0)
                      const emiVal = parseFloat(loan.emi || 0)
                      const penaltyAmount = emiVal * 0.05
                      const hasPenalty = r.status === 'paid' && r.repayment_date && r.due_date && new Date(r.repayment_date) > new Date(r.due_date + 'T23:59:59')
                      return (
                        <tr key={r.id}>
                          <td>{r.emi_number || '—'}</td>
                          <td>{r.due_date ? formatDate(r.due_date) : '—'}</td>
                          <td style={{ fontWeight:600 }}>{formatCurrency(r.amount)}</td>
                          <td>{r.repayment_date ? formatDate(r.repayment_date) : '—'}</td>
                          <td><span className={`badge ${r.status === 'paid' ? 'badge-success' : r.status === 'overdue' ? 'badge-danger' : 'badge-muted'}`}>{r.status || '—'}</span></td>
                          <td style={{ color:'var(--danger)', fontWeight:600 }}>{hasPenalty ? formatCurrency(penaltyAmount) : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {activeTab === 'timeline' && (
              <div className="timeline-vertical">
                {loan.approved_date && (
                  <div className="tlv-item">
                    <div className="tlv-dot" style={{ background:'var(--accent-color)' }} />
                    <div className="tlv-content"><div style={{ fontWeight:600 }}>Loan Disbursed</div><div style={{ fontSize:12, color:'var(--text-muted)' }}>{formatDate(loan.approved_date)}</div></div>
                  </div>
                )}
                {(loan.repayments || []).slice().reverse().map(r => (
                  <div key={r.id} className="tlv-item">
                    <div className="tlv-dot" style={{ background: r.status === 'paid' ? 'var(--success)' : 'var(--danger)' }} />
                    <div className="tlv-content">
                      <div style={{ fontWeight:600 }}>{r.status === 'paid' ? 'Payment Received' : 'Late Payment'} — EMI #{r.emi_number}</div>
                      <div style={{ fontSize:12, color:'var(--text-muted)' }}>{formatCurrency(r.amount)} &middot; {r.repayment_date ? formatDate(r.repayment_date) : '—'}</div>
                    </div>
                  </div>
                ))}
                {(loan.repayments || []).length === 0 && <div style={{ color:'var(--text-muted)', padding:16 }}>No payment activity yet</div>}
              </div>
            )}
            {activeTab === 'documents' && (
              <div className="empty" style={{ padding:40 }}>
                <span className="material-symbols-rounded" style={{ fontSize:40, color:'var(--text-muted)' }}>description</span>
                <div style={{ color:'var(--text-muted)' }}>No documents uploaded for this loan</div>
              </div>
            )}
            {activeTab === 'collateral' && (
              <div className="detail-info-grid">
                <div><label>Collateral Type</label><span>{loan.collateral_type || '—'}</span></div>
                <div><label>Estimated Value</label><span>{loan.collateral_value ? formatCurrency(loan.collateral_value) : '—'}</span></div>
                <div><label>Verification Status</label><span><span className="badge badge-success">Verified</span></span></div>
                <div><label>Inspection Date</label><span>—</span></div>
              </div>
            )}
            {activeTab === 'notes' && (
              <div>
                <div style={{ marginBottom:16, display:'flex', gap:8 }}>
                  <input className="form-control" placeholder="Add a monitoring note..." style={{ flex:1 }} />
                  <button className="btn btn-primary btn-sm">Add Note</button>
                </div>
                <div style={{ color:'var(--text-muted)', padding:20, textAlign:'center' }}>No monitoring notes yet</div>
              </div>
            )}
            {activeTab === 'visits' && (
              <div style={{ color:'var(--text-muted)', padding:20, textAlign:'center' }}>No visit records found</div>
            )}
          </div>
        </div>

        <div className="detail-sidebar">
          <div className="detail-sidebar-card">
            <div className="detail-section-title" style={{ fontSize:13 }}>Payment Status</div>
            <div style={{ marginTop:6 }}>
              <PaymentStatusBadge status={loan.payment_status || 'current'} overdueDays={loan.overdue_days} showDetail />
            </div>
            {loan.late_penalty > 0 && (
              <div style={{ marginTop:8, padding:'6px 10px', background:'rgba(239,68,68,0.08)', borderRadius:8, fontSize:12 }}>
                <span style={{ color:'var(--text-secondary)' }}>Late Penalty: </span>
                <span style={{ color:'var(--danger)', fontWeight:700 }}>{formatCurrency(loan.late_penalty)}</span>
                <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:2 }}>5% of unpaid EMI ({loan.overdue_emis_count} overdue installment{loan.overdue_emis_count > 1 ? 's' : ''})</div>
              </div>
            )}
            {loan.overdue_days > 0 && loan.overdue_days <= 7 && (
              <div style={{ marginTop:8, padding:'6px 10px', background:'rgba(245,158,11,0.08)', borderRadius:8, fontSize:12, color:'var(--warning)' }}>
                Grace period active ({loan.overdue_days}/7 days) — no penalty charged
              </div>
            )}
          </div>
          <div className="detail-sidebar-card">
            <div className="detail-section-title" style={{ fontSize:13 }}>Next EMI</div>
            <div style={{ fontSize:22, fontWeight:700, color:'var(--accent-color)' }}>{formatCurrency(loan.emi)}</div>
            <div className="stat-sub">Due: {loan.next_due_date ? formatDate(loan.next_due_date) : '—'}</div>
          </div>
          <div className="detail-sidebar-card">
            <div className="detail-section-title" style={{ fontSize:13 }}>Loan Health</div>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:8 }}>
              <HealthBadge status={loan.health_status} score={loan.health_score} />
              <span style={{ fontSize:18, fontWeight:700 }}>{loan.health_score || 0}%</span>
            </div>
            <ProgressBar value={loan.health_score || 0} />
          </div>
          <div className="detail-sidebar-card">
            <div className="detail-section-title" style={{ fontSize:13 }}>Recent Payments</div>
            {(loan.repayments || []).slice(-5).reverse().map(r => (
              <div key={r.id} className="review-item" style={{ padding:'6px 0' }}>
                <span style={{ fontSize:12 }}>{r.emi_number ? `EMI #${r.emi_number}` : 'Payment'}</span>
                <span style={{ fontSize:12, fontWeight:600, color: r.status === 'paid' ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(r.amount)}</span>
              </div>
            ))}
            {(loan.repayments || []).length === 0 && <div className="stat-sub" style={{ padding:'8px 0' }}>No payments yet</div>}
          </div>
          <div className="detail-sidebar-card">
            <div className="detail-section-title" style={{ fontSize:13 }}>Quick Actions</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
              <button className="btn btn-secondary btn-sm" style={{ justifyContent:'flex-start' }}><span className="material-symbols-rounded" style={{ fontSize:16 }}>payments</span> View Payment History</button>
              <button className="btn btn-secondary btn-sm" style={{ justifyContent:'flex-start' }}><span className="material-symbols-rounded" style={{ fontSize:16 }}>calendar_month</span> Repayment Schedule</button>
              <button className="btn btn-secondary btn-sm" style={{ justifyContent:'flex-start' }}><span className="material-symbols-rounded" style={{ fontSize:16 }}>print</span> Print Summary</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminActiveLoans() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [filters, setFilters] = useState({ search:'', loanType:'', paymentStatus:'all', interestRate:'', remainingTerm:'', dueDate:'', dateFrom:'', dateTo:'', sort:'newest' })
  const [currentPage, setCurrentPage] = useState(1)
  const [portfolioView, setPortfolioView] = useState('repayment')
  const [timeRange, setTimeRange] = useState('monthly')
  const [pageSize, setPageSize] = useState(15)

  useEffect(() => {
    adminActiveLoans()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loans = useMemo(() => {
    let list = [...(data?.loans || [])]
    const q = filters.search.toLowerCase()
    if (q) list = list.filter(l =>
      l.application_number?.toLowerCase().includes(q) ||
      l.loan_number?.toLowerCase().includes(q) ||
      l.customer?.full_name?.toLowerCase().includes(q) ||
      l.customer?.phone_number?.includes(q)
    )
    if (filters.loanType) list = list.filter(l => l.loan_type === filters.loanType)
    if (filters.paymentStatus !== 'all') {
      list = list.filter(l => l.payment_status === filters.paymentStatus)
    }
    if (filters.interestRate) {
      if (filters.interestRate === 'below_8') list = list.filter(l => parseFloat(l.interest_rate) < 8)
      else if (filters.interestRate === '8_10') list = list.filter(l => parseFloat(l.interest_rate) >= 8 && parseFloat(l.interest_rate) <= 10)
      else if (filters.interestRate === '10_12') list = list.filter(l => parseFloat(l.interest_rate) >= 10 && parseFloat(l.interest_rate) <= 12)
      else if (filters.interestRate === 'above_12') list = list.filter(l => parseFloat(l.interest_rate) > 12)
    }
    if (filters.remainingTerm) {
      if (filters.remainingTerm === 'lt_12') list = list.filter(l => (l.remaining_emis || 0) < 12)
      else if (filters.remainingTerm === '12_24') list = list.filter(l => (l.remaining_emis || 0) >= 12 && (l.remaining_emis || 0) <= 24)
      else if (filters.remainingTerm === '24_36') list = list.filter(l => (l.remaining_emis || 0) >= 24 && (l.remaining_emis || 0) <= 36)
      else if (filters.remainingTerm === 'gt_36') list = list.filter(l => (l.remaining_emis || 0) > 36)
    }
    if (filters.dueDate) {
      const today = new Date(); today.setHours(0,0,0,0)
      if (filters.dueDate === 'today') {
        list = list.filter(l => { if (!l.next_due_date) return false; const d = new Date(l.next_due_date.slice(0,10)); return d.getTime() === today.getTime() })
      } else if (filters.dueDate === 'next_7') {
        const end = new Date(today); end.setDate(end.getDate() + 7)
        list = list.filter(l => { if (!l.next_due_date) return false; const d = new Date(l.next_due_date.slice(0,10)); return d >= today && d <= end })
      } else if (filters.dueDate === 'this_month') {
        list = list.filter(l => { if (!l.next_due_date) return false; const d = new Date(l.next_due_date.slice(0,10)); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() })
      } else if (filters.dueDate === 'custom') {
        if (filters.dateFrom) list = list.filter(l => l.next_due_date && l.next_due_date.slice(0,10) >= filters.dateFrom)
        if (filters.dateTo) list = list.filter(l => l.next_due_date && l.next_due_date.slice(0,10) <= filters.dateTo)
      }
    }
    const sortMap = {
      newest: (a,b) => new Date(b.approved_date || 0) - new Date(a.approved_date || 0),
      oldest: (a,b) => new Date(a.approved_date || 0) - new Date(b.approved_date || 0),
      amount_desc: (a,b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0),
      amount_asc: (a,b) => parseFloat(a.amount || 0) - parseFloat(b.amount || 0),
      balance_desc: (a,b) => (parseFloat(b.total_payable || 0) - parseFloat(b.total_paid || 0)) - (parseFloat(a.total_payable || 0) - parseFloat(a.total_paid || 0)),
      balance_asc: (a,b) => (parseFloat(a.total_payable || 0) - parseFloat(a.total_paid || 0)) - (parseFloat(b.total_payable || 0) - parseFloat(b.total_paid || 0)),
      next_due: (a,b) => new Date(a.next_due_date || 0) - new Date(b.next_due_date || 0),
      remaining_term: (a,b) => (a.remaining_emis || 0) - (b.remaining_emis || 0)
    }
    list.sort(sortMap[filters.sort] || sortMap.newest)
    return list
  }, [data, filters])

  const paginatedLoans = loans.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const d = data || {}

  function getPaymentStatus(loan) {
    return loan.payment_status || 'current'
  }

  function exportCSV() {
    const rows = paginatedLoans.map(loan => {
      const paid = parseFloat(loan.total_paid || 0)
      const total = parseFloat(loan.total_payable || 1)
      const outstanding = Math.max(0, total - paid)
      const status = getPaymentStatus(loan)
      const overdueDays = loan.overdue_days || 0
      const penalty = loan.late_penalty || 0
      return [
        loan.application_number || loan.loan_number,
        loan.customer?.full_name || '',
        loan.loan_type || '',
        outstanding.toFixed(2),
        loan.emi,
        loan.interest_rate,
        `${loan.remaining_emis || 0} / ${loan.duration_months || '—'} Months`,
        loan.next_due_date ? new Date(loan.next_due_date).toLocaleDateString('en-US', { timeZone:'Asia/Kathmandu', year:'numeric', month:'short', day:'numeric' }) : '',
        status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
        overdueDays,
        penalty.toFixed(2)
      ]
    })
    const headers = ['Loan ID','Borrower','Loan Type','Loan Amount','Outstanding Balance','Monthly EMI','Interest Rate','Remaining Term','Next Due Date','Payment Status','Overdue Days','Late Penalty']
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `active-loans-${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
  }

  function exportPDF() {
    const printWin = window.open('', '_blank')
    const rows = paginatedLoans.map(loan => {
      const paid = parseFloat(loan.total_paid || 0)
      const total = parseFloat(loan.total_payable || 1)
      const outstanding = Math.max(0, total - paid)
      const status = getPaymentStatus(loan)
      const overdueDays = loan.overdue_days || 0
      const penalty = loan.late_penalty || 0
      return `<tr>
        <td>${loan.application_number || loan.loan_number}</td>
        <td>${loan.customer?.full_name || ''}</td>
        <td>${loan.loan_type || ''}</td>
        <td style="text-align:right">NPR ${Number(loan.amount).toLocaleString()}</td>
        <td style="text-align:right">NPR ${outstanding.toLocaleString()}</td>
        <td style="text-align:right">NPR ${Number(loan.emi).toLocaleString()}</td>
        <td style="text-align:right">${loan.interest_rate}%</td>
        <td style="text-align:center">${loan.remaining_emis || 0} / ${loan.duration_months || '—'}</td>
        <td style="text-align:center">${loan.next_due_date ? new Date(loan.next_due_date).toLocaleDateString('en-US', { timeZone:'Asia/Kathmandu', year:'numeric', month:'short', day:'numeric' }) : '—'}</td>
        <td style="text-align:center">${status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</td>
        <td style="text-align:center">${overdueDays ? overdueDays + 'd' : '—'}</td>
        <td style="text-align:right">${penalty ? 'NPR ' + penalty.toLocaleString() : '—'}</td>
      </tr>`
    }).join('')
    printWin.document.write(`<!DOCTYPE html><html><head><title>Active Loans</title><style>
      body { font-family:Arial,sans-serif; padding:20px; }
      h2 { margin-bottom:4px; }
      .date { color:#666; font-size:12px; margin-bottom:16px; }
      table { width:100%; border-collapse:collapse; font-size:11px; }
      th { background:#1e293b; color:#fff; padding:8px 6px; text-align:left; font-weight:600; }
      td { padding:6px; border-bottom:1px solid #e2e8f0; }
      th:last-child, td:last-child { text-align:center; }
    </style></head><body>
      <h2>Active Loans</h2>
      <div class="date">${new Date().toLocaleDateString('en-US', { timeZone:'Asia/Kathmandu', weekday:'short', year:'numeric', month:'short', day:'numeric' })}</div>
      <table><thead><tr>
        <th>Loan ID</th><th>Borrower</th><th>Loan Type</th><th style="text-align:right">Loan Amount</th><th style="text-align:right">Outstanding</th>
        <th style="text-align:right">EMI</th><th style="text-align:right">Rate</th><th style="text-align:center">Remaining</th><th style="text-align:center">Next Due</th><th style="text-align:center">Status</th><th style="text-align:center">Overdue</th><th style="text-align:right">Penalty</th>
      </tr></thead><tbody>${rows}</tbody></table></body></html>`)
    printWin.document.close()
    printWin.focus()
    setTimeout(() => printWin.print(), 300)
  }

  if (loading) return (
    <div>
      <div className="page-header"><div><div className="page-title">Active Loans</div><div className="page-subtitle">Monitor active loans, repayments, borrower health, and loan performance.</div></div></div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>{[1,2,3,4,5,6,7,8].map(i => <div key={i} className="skeleton-card" style={{ height:100 }} />)}</div>
    </div>
  )

  if (selectedLoan) return <DetailSection loan={selectedLoan} onBack={() => setSelectedLoan(null)} role="admin" />

  return (
    <>
      <style>{`
        .al-table th,
        .al-table td { padding: 10px 14px !important; vertical-align: middle; }
        .al-table td:nth-child(1) .mono { font-size: 13px; }
        .al-table th:nth-child(4),
        .al-table td:nth-child(4),
        .al-table th:nth-child(5),
        .al-table td:nth-child(5),
        .al-table th:nth-child(6),
        .al-table td:nth-child(6),
        .al-table th:nth-child(7),
        .al-table td:nth-child(7),
        .al-table th:nth-child(11),
        .al-table td:nth-child(11) { text-align: right; }
        .al-name { font-weight: 600; font-size: 14px; }
        .al-amount { text-align: right; display: block; font-size: 13px; font-weight: 700; }
        .al-outstanding { text-align: right; display: block; font-size: 13px; font-weight: 700; color: var(--warning); }
        .al-emi { text-align: right; display: block; font-size: 13px; font-weight: 700; color: var(--accent-color); }
        .al-rate { text-align: right; display: block; font-size: 13px; }
        .al-penalty { text-align: right; display: block; font-size: 13px; }
        .al-loan-type { color: var(--text-secondary); font-size: 13px; }
        .al-remaining { font-size: 13px; color: var(--text-secondary); }
        .al-next-due { font-size: 13px; }
        .al-filter-label { display: block; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px; }
        .al-filter-bar { display: flex; flex-wrap: nowrap; gap: 8px; align-items: flex-end; padding: 12px 20px 16px; }
        .al-filter-bar .form-control { padding: 7px 10px; font-size: 13px; height: 34px; }
        .al-custom-date-row { display: flex; gap: 12px; padding: 0 20px 14px; }
        .al-custom-date-row .filter-group { flex: 1; }
        @media (max-width: 1200px) { .al-filter-bar { flex-wrap: wrap; } .al-filter-bar > .filter-group { flex: 1 1 170px !important; } }
        @media (max-width: 768px) { .al-filter-bar > .filter-group { flex: 1 1 100% !important; min-width: 100% !important; } }
      `}</style>
      <div className="page-header">
        <div>
          <div className="page-title">Active Loans</div>
          <div className="page-subtitle">Monitor active loans, repayments, borrower health, and loan performance.</div>
        </div>
        <div style={{ fontSize:'0.85rem', color:'var(--text-secondary)', background:'var(--bg-tertiary)', padding:'6px 14px', borderRadius:8 }}>
          <span className="material-symbols-rounded" style={{ fontSize:16, verticalAlign:-3 }}>today</span> {new Date().toLocaleDateString('en-US', { timeZone:'Asia/Kathmandu', weekday:'short', year:'numeric', month:'short', day:'numeric' })}
        </div>
      </div>

      <div className="kpi-grid">
        <KPICard icon="account_balance" title="Total Active Loans" value={d.total_active || 0} subtitle="Currently running loans" color="#3b82f6" />
        <KPICard icon="payments" title="Outstanding Balance" value={formatCurrency(d.outstanding_balance || 0)} subtitle="Total unpaid balance" color="#10b981" />
        <KPICard icon="trending_up" title="Monthly EMI Collection" value={formatCurrency(d.monthly_emi_collection || 0)} subtitle="Current month collection" color="#8b5cf6" />
        <KPICard icon="schedule" title="Upcoming Payments" value={d.upcoming_payments || 0} subtitle="Due within 7 days" color="#f59e0b" />
        <KPICard icon="warning" title="Overdue Loans" value={d.overdue_accounts || 0} subtitle="EMI is overdue" color="#ef4444" />
        <KPICard icon="monitoring" title="Avg Loan Health" value={`${d.avg_health_score || 0}%`} subtitle="Overall portfolio health" color="#10b981" />
        <KPICard icon="flag" title="Near Completion" value={d.loans_near_completion || 0} subtitle="Less than 3 EMIs left" color="#3b82f6" />
        <KPICard icon="gpp_bad" title="Default Risk" value={d.default_risk_count || 0} subtitle="High risk loans" color="#7c3aed" />
      </div>

      <div className="charts-row" style={{ gridTemplateColumns: '1.8fr 1fr' }}>
        <div className="chart-card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'14px 18px 6px' }}>
            <div>
              <div className="card-title" style={{ fontSize:15, color:'var(--text-primary)' }}>Outstanding Balance &amp; EMI Collection Trend</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{timeRange === 'daily' ? 'Daily trend for the last 7 days' : 'Monthly comparison over the last 12 months'}</div>
            </div>
            <div className="filter-group" style={{ width:135, flex:'none' }}>
              <select
                className="form-control"
                value={timeRange}
                onChange={e => setTimeRange(e.target.value)}
                style={{ fontSize:12, padding:'5px 10px', height:'auto' }}
              >
                <option value="daily">Last 7 Days</option>
                <option value="monthly">Month Wise</option>
              </select>
            </div>
          </div>
          <div style={{ padding:'2px 12px 12px' }}>
            <CombinedTrendChart data={timeRange === 'daily' ? d.daily_trend : d.portfolio_trend} height={280} timeRange={timeRange} />
          </div>
        </div>
        <div className="chart-card" style={{ padding:'16px 18px', display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
            <div>
              <div className="card-title" style={{ fontSize:15, color:'var(--text-primary)' }}>Loan Portfolio Distribution</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>Analyze portfolio from different perspectives</div>
            </div>
            <div className="filter-group" style={{ width:165, flex:'none' }}>
              <select
                className="form-control"
                value={portfolioView}
                onChange={e => setPortfolioView(e.target.value)}
                style={{ fontSize:12, padding:'5px 10px', height:'auto' }}
              >
                <option value="repayment">Repayment Performance</option>
                <option value="health">Loan Health</option>
                <option value="type">Loan Type</option>
                <option value="risk">Risk Level</option>
                <option value="status">Loan Status</option>
              </select>
            </div>
          </div>
          <div style={{ flex:1 }}>
            <PortfolioDoughnut distributions={d.portfolio_distributions} totalActive={d.total_active} view={portfolioView} onViewChange={setPortfolioView} />
          </div>
        </div>
      </div>

      <FilterSection filters={filters} setFilters={setFilters} />

      <div className="table-container" style={{ marginTop:16 }}>
        <div className="table-header-bar">
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <span className="table-title">{loans.length} Active Loan{loans.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button className="btn btn-sm" style={{ background:'rgba(16,185,129,0.15)', color:'#10b981', border:'1px solid rgba(16,185,129,0.3)' }} onClick={exportCSV}>
              <span className="material-symbols-rounded" style={{ fontSize:14, verticalAlign:-2 }}>file_download</span> CSV
            </button>
            <button className="btn btn-sm" style={{ background:'rgba(59,130,246,0.15)', color:'#3b82f6', border:'1px solid rgba(59,130,246,0.3)' }} onClick={exportPDF}>
              <span className="material-symbols-rounded" style={{ fontSize:14, verticalAlign:-2 }}>picture_as_pdf</span> PDF
            </button>
          </div>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="custom-table al-table" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Borrower</th>
                <th>Loan Type</th>
                <th>Loan Amount</th>
                <th>Outstanding</th>
                <th>EMI</th>
                <th>Rate</th>
                <th>Remaining</th>
                <th>Next Due</th>
                <th>Status</th>
                <th>Penalty</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLoans.map(loan => {
                const paid = parseFloat(loan.total_paid || 0)
                const total = parseFloat(loan.total_payable || 1)
                const outstanding = Math.max(0, total - paid)
                const paymentStatus = getPaymentStatus(loan)
                const penalty = loan.late_penalty || 0
                return (
                  <tr key={loan.id} style={{ cursor:'pointer', borderLeft: paymentStatus === 'overdue' ? '3px solid var(--danger)' : paymentStatus === 'due_soon' ? '3px solid #f59e0b' : '3px solid transparent' }} onClick={() => setSelectedLoan(loan)}>
                    <td><span className="mono">{loan.application_number || loan.loan_number}</span></td>
                    <td><span className="al-name">{loan.customer?.full_name || '—'}</span><br /><span style={{ fontSize:'11px', color:'var(--text-muted)' }}>{loan.customer?.phone_number || ''}</span></td>
                    <td className="al-loan-type">{loan.loan_type || '—'}</td>
                    <td><span className="al-amount">{formatCurrency(loan.amount)}</span></td>
                    <td><span className="al-outstanding">{formatCurrency(outstanding)}</span></td>
                    <td><span className="al-emi">{formatCurrency(loan.emi)}</span></td>
                    <td><span className="al-rate">{loan.interest_rate}%</span></td>
                    <td><span className="al-remaining">{loan.remaining_emis || 0} / {loan.duration_months || '—'}</span></td>
                    <td><span className="al-next-due" style={{ color: paymentStatus === 'overdue' ? 'var(--danger)' : paymentStatus === 'due_soon' ? '#f59e0b' : 'var(--text-secondary)' }}>{loan.next_due_date ? formatDate(loan.next_due_date) : '—'}</span></td>
                    <td><PaymentStatusBadge status={paymentStatus} overdueDays={loan.overdue_days} showDetail={paymentStatus === 'overdue'} /></td>
                    <td><span className="al-penalty" style={{ color: penalty > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{penalty > 0 ? formatCurrency(penalty) : '—'}</span></td>
                  </tr>
                )
              })}
              {paginatedLoans.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>No active loans found matching your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalItems={loans.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
      </div>
    </>
  )
}
