import { useState, useEffect, useMemo } from 'react'
import { staffActiveLoans } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'
import CombinedTrendChart from '../../components/charts/CombinedTrendChart'
import PortfolioDoughnut from '../../components/charts/PortfolioDoughnut'
import PaymentStatusBadge from '../../components/common/PaymentStatusBadge'

const LOAN_TYPES = ['', 'Personal Loan', 'Home Loan', 'Business Loan', 'Agriculture Loan', 'Education Loan', 'Vehicle Loan']

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

function KPICard({ icon, title, value, subtitle, color }) {
  return (
    <div className="kpi-card" style={{ '--kpi-color': color || 'var(--accent-color)' }}>
      <div className="kpi-icon" style={{ background: `${color || 'var(--accent-color)'}1a`, color: color || 'var(--accent-color)' }}>
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

function DetailSection({ loan, onBack }) {
  const c = loan.customer || {}
  const totalPaid = parseFloat(loan.total_paid || 0)
  const totalPayable = parseFloat(loan.total_payable || 1)
  const progress = Math.min(100, Math.round((totalPaid / totalPayable) * 100))
  const remaining = Math.max(0, totalPayable - totalPaid)
  const [activeTab, setActiveTab] = useState('schedule')

  const tabs = [
    { key:'schedule', label:'Schedule', icon:'calendar_month' },
    { key:'timeline', label:'Timeline', icon:'timeline' },
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
          <button className="btn btn-primary btn-sm"><span className="material-symbols-rounded" style={{ fontSize:16 }}>edit_note</span> Add Note</button>
          <button className="btn btn-secondary btn-sm"><span className="material-symbols-rounded" style={{ fontSize:16 }}>calendar_add</span> Schedule Visit</button>
          <button className="btn btn-secondary btn-sm"><span className="material-symbols-rounded" style={{ fontSize:16 }}>call</span> Record Interaction</button>
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
                    ) : (loan.repayments || []).map(r => { const emiVal = parseFloat(loan.emi || 0); const penaltyAmt = emiVal * 0.05; const hasPen = r.status === 'paid' && r.repayment_date && r.due_date && new Date(r.repayment_date) > new Date(r.due_date + 'T23:59:59'); return (
                      <tr key={r.id}>
                        <td>{r.emi_number || '—'}</td>
                        <td>{r.due_date ? formatDate(r.due_date) : '—'}</td>
                        <td style={{ fontWeight:600 }}>{formatCurrency(r.amount)}</td>
                        <td>{r.repayment_date ? formatDate(r.repayment_date) : '—'}</td>
                        <td><span className={`badge ${r.status === 'paid' ? 'badge-success' : 'badge-danger'}`}>{r.status || '—'}</span></td>
                        <td style={{ color:'var(--danger)', fontWeight:600 }}>{hasPen ? formatCurrency(penaltyAmt) : '—'}</td>
                      </tr>
                    ); })}
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
                  <input className="form-control" placeholder="Add field visit note or monitoring remark..." style={{ flex:1 }} />
                  <button className="btn btn-primary btn-sm">Add Note</button>
                </div>
                <div style={{ color:'var(--text-muted)', padding:20, textAlign:'center' }}>No monitoring notes yet</div>
              </div>
            )}
            {activeTab === 'visits' && (
              <div>
                <div style={{ marginBottom:16, display:'flex', gap:8 }}>
                  <input type="date" className="form-control" style={{ maxWidth:180 }} />
                  <button className="btn btn-primary btn-sm">Schedule Follow-up</button>
                </div>
                <div style={{ color:'var(--text-muted)', padding:20, textAlign:'center' }}>No visit records found</div>
              </div>
            )}
          </div>
        </div>

        <div className="detail-sidebar">
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
              <button className="btn btn-secondary btn-sm" style={{ justifyContent:'flex-start' }}><span className="material-symbols-rounded" style={{ fontSize:16 }}>map</span> Visit History</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StaffActiveLoans() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [search, setSearch] = useState('')
  const [healthFilter, setHealthFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [portfolioView, setPortfolioView] = useState('repayment')
  const [timeRange, setTimeRange] = useState('monthly')
  const pageSize = 15

  useEffect(() => {
    staffActiveLoans()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loans = useMemo(() => {
    let list = [...(data?.loans || [])]
    const q = search.toLowerCase()
    if (q) list = list.filter(l =>
      l.application_number?.toLowerCase().includes(q) ||
      l.loan_number?.toLowerCase().includes(q) ||
      l.customer?.full_name?.toLowerCase().includes(q) ||
      l.customer?.phone_number?.includes(q)
    )
    if (typeFilter) list = list.filter(l => l.loan_type === typeFilter)
    if (healthFilter !== 'all') {
      if (healthFilter === 'healthy') list = list.filter(l => l.payment_status === 'current')
      else if (healthFilter === 'upcoming') list = list.filter(l => l.payment_status === 'due_soon')
      else if (healthFilter === 'overdue') list = list.filter(l => l.payment_status === 'overdue')
      else if (healthFilter === 'completed_soon') list = list.filter(l => l.payment_status === 'due_soon')
      else if (healthFilter === 'high_risk') list = list.filter(l => l.payment_status === 'overdue' && (l.health_score || 100) < 30)
    }
    const sortMap = {
      newest: (a,b) => new Date(b.approved_date || 0) - new Date(a.approved_date || 0),
      oldest: (a,b) => new Date(a.approved_date || 0) - new Date(b.approved_date || 0),
      balance_desc: (a,b) => (parseFloat(b.total_payable||0)-parseFloat(b.total_paid||0)) - (parseFloat(a.total_payable||0)-parseFloat(a.total_paid||0)),
      emi_desc: (a,b) => parseFloat(b.emi||0) - parseFloat(a.emi||0)
    }
    list.sort(sortMap[sortBy] || sortMap.newest)
    return list
  }, [data, search, healthFilter, typeFilter, sortBy])

  const totalPages = Math.ceil(loans.length / pageSize)
  const paginatedLoans = loans.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const d = data || {}

  if (loading) return (
    <div>
      <div className="page-header"><div><div className="page-title">Active Loans</div><div className="page-subtitle">Monitor assigned active loans, repayments, and borrower health.</div></div></div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>{[1,2,3,4,5,6,7,8].map(i => <div key={i} className="skeleton-card" style={{ height:100 }} />)}</div>
    </div>
  )

  if (selectedLoan) return <DetailSection loan={selectedLoan} onBack={() => setSelectedLoan(null)} />

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Active Loans</div>
          <div className="page-subtitle">Monitor assigned active loans, repayments, and borrower health.</div>
        </div>
        <div style={{ fontSize:'0.85rem', color:'var(--text-secondary)', background:'var(--bg-tertiary)', padding:'6px 14px', borderRadius:8 }}>
          <span className="material-symbols-rounded" style={{ fontSize:16, verticalAlign:-3 }}>today</span> {new Date().toLocaleDateString('en-US', { timeZone:'Asia/Kathmandu', weekday:'short', year:'numeric', month:'short', day:'numeric' })}
        </div>
      </div>

      <div className="kpi-grid">
        <KPICard icon="account_balance" title="Total Active Loans" value={d.total_active || 0} subtitle="Assigned to you" color="#3b82f6" />
        <KPICard icon="payments" title="Outstanding Balance" value={formatCurrency(d.outstanding_balance || 0)} subtitle="Total unpaid" color="#10b981" />
        <KPICard icon="trending_up" title="Monthly EMI Collection" value={formatCurrency(d.monthly_emi_collection || 0)} subtitle="Current month" color="#8b5cf6" />
        <KPICard icon="schedule" title="Upcoming Payments" value={d.upcoming_payments || 0} subtitle="Due within 7 days" color="#f59e0b" />
        <KPICard icon="warning" title="Overdue Loans" value={d.overdue_accounts || 0} subtitle="Require follow-up" color="#ef4444" />
        <KPICard icon="monitoring" title="Avg Loan Health" value={`${d.avg_health_score || 0}%`} subtitle="Portfolio health" color="#10b981" />
        <KPICard icon="flag" title="Near Completion" value={d.loans_near_completion || 0} subtitle="Less than 3 EMIs" color="#3b82f6" />
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
            <PortfolioDoughnut distributions={d.portfolio_distributions} totalActive={d.total_active} view={portfolioView} />
          </div>
        </div>
      </div>

      <div className="filter-section-modern">
        <div className="filter-row">
          <div className="filter-group" style={{ flex:2, minWidth:220 }}>
            <span className="material-symbols-rounded" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:20, pointerEvents:'none' }}>search</span>
            <input className="form-control" placeholder="Search by Loan ID, Borrower Name, Phone Number..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1) }} style={{ paddingLeft:42, width:'100%' }} />
          </div>
          <div className="filter-group">
            <select className="form-control" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1) }}>
              <option value="">All Types</option>
              {LOAN_TYPES.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <select className="form-control" value={healthFilter} onChange={e => { setHealthFilter(e.target.value); setCurrentPage(1) }}>
              <option value="all">All Status</option>
              <option value="healthy">Healthy</option>
              <option value="upcoming">Upcoming</option>
              <option value="overdue">Overdue</option>
              <option value="completed_soon">Completed Soon</option>
              <option value="high_risk">High Risk</option>
            </select>
          </div>
          <div className="filter-group">
            <select className="form-control" value={sortBy} onChange={e => { setSortBy(e.target.value); setCurrentPage(1) }}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="balance_desc">Outstanding Balance</option>
              <option value="emi_desc">Highest EMI</option>
            </select>
          </div>
          {(search || typeFilter || healthFilter !== 'all') && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setTypeFilter(''); setHealthFilter('all'); setSortBy('newest'); setCurrentPage(1) }}>
              <span className="material-symbols-rounded" style={{ fontSize:16 }}>close</span> Clear
            </button>
          )}
        </div>
      </div>

      <div className="table-container" style={{ marginTop:16 }}>
        <div className="table-header-bar">
          <span className="table-title">{loans.length} Active Loan{loans.length !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="custom-table" style={{ minWidth:1000 }}>
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Borrower</th>
                <th>Loan Type</th>
                <th>Loan Amount</th>
                <th>Outstanding</th>
                <th>Monthly EMI</th>
                <th>Remaining</th>
                <th>Next Due</th>
                <th>Payment Status</th>
                <th>Penalty</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLoans.map(loan => {
                const paid = parseFloat(loan.total_paid || 0)
                const total = parseFloat(loan.total_payable || 1)
                const outstanding = Math.max(0, total - paid)
                const progress = Math.min(100, Math.round((paid / total) * 100))
                const paymentStatus = loan.payment_status || 'current'
                const penalty = loan.late_penalty || 0
                return (
                  <tr key={loan.id} style={{ cursor:'pointer', borderLeft: paymentStatus === 'overdue' ? '3px solid var(--danger)' : paymentStatus === 'due_soon' ? '3px solid #f59e0b' : '3px solid transparent' }} onClick={() => setSelectedLoan(loan)}>
                    <td><span className="mono">{loan.application_number || loan.loan_number}</span></td>
                    <td style={{ fontWeight:600 }}>{loan.customer?.full_name || '—'}<br /><span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:400 }}>{loan.customer?.phone_number || ''}</span></td>
                    <td>{loan.loan_type || '—'}</td>
                    <td style={{ fontWeight:600 }}>{formatCurrency(loan.amount)}</td>
                    <td style={{ fontWeight:600, color:'var(--warning)' }}>{formatCurrency(outstanding)}</td>
                    <td style={{ fontWeight:600, color:'var(--accent-color)' }}>{formatCurrency(loan.emi)}</td>
                    <td>{loan.remaining_emis || 0}</td>
                    <td style={{ fontSize:12, color: paymentStatus === 'overdue' ? 'var(--danger)' : paymentStatus === 'due_soon' ? '#f59e0b' : 'var(--text-secondary)' }}>{loan.next_due_date ? formatDate(loan.next_due_date) : '—'}</td>
                    <td><PaymentStatusBadge status={paymentStatus} overdueDays={loan.overdue_days} showDetail={paymentStatus === 'overdue'} /></td>
                    <td style={{ fontWeight:600, color: penalty > 0 ? 'var(--danger)' : 'var(--text-muted)', fontSize:13 }}>{penalty > 0 ? formatCurrency(penalty) : '—'}</td>
                    <td>
                      <div style={{ display:'flex', gap:4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-primary" title="View Details" onClick={() => setSelectedLoan(loan)}><span className="material-symbols-rounded" style={{ fontSize:14 }}>visibility</span></button>
                        <button className="btn btn-sm btn-secondary" title="Payment History"><span className="material-symbols-rounded" style={{ fontSize:14 }}>payments</span></button>
                        <button className="btn btn-sm btn-secondary" title="Add Note"><span className="material-symbols-rounded" style={{ fontSize:14 }}>comment</span></button>
                        <button className="btn btn-sm btn-secondary" title="Schedule Visit"><span className="material-symbols-rounded" style={{ fontSize:14 }}>calendar_month</span></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {paginatedLoans.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>No active loans assigned to you.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderTop:'1px solid var(--border-color)' }}>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>Showing {(currentPage-1)*pageSize+1}–{Math.min(currentPage*pageSize, loans.length)} of {loans.length}</span>
          <div style={{ display:'flex', gap:6 }}>
            <button className="btn btn-sm btn-secondary" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p-1))}>Previous</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(0, Math.min(currentPage - 3, totalPages - 5))
              const pg = start + i + 1
              return pg <= totalPages ? <button key={pg} className={`btn btn-sm ${pg === currentPage ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCurrentPage(pg)}>{pg}</button> : null
            })}
            <button className="btn btn-sm btn-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}>Next</button>
          </div>
        </div>
      </div>

      <div className="recent-activities-card">
        <div className="card-title" style={{ fontSize:14, marginBottom:12 }}>Recent Activities — Assigned Loans</div>
        <div className="timeline-vertical">
          {(d.recent_activities || []).slice(0, 6).map((act, i) => (
            <div key={i} className="tlv-item">
              <div className="tlv-dot" style={{ background: act.type === 'payment' ? 'var(--success)' : 'var(--accent-color)' }} />
              <div className="tlv-content">
                <div style={{ fontWeight:600, fontSize:13 }}>{act.type === 'payment' ? 'Payment Received' : 'Activity'}</div>
                <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{act.customer_name} &middot; {act.amount ? formatCurrency(act.amount) : ''}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{act.date ? formatDate(act.date) : ''}</div>
              </div>
            </div>
          ))}
          {!(d.recent_activities || []).length && <div style={{ padding:16, color:'var(--text-muted)', textAlign:'center' }}>No recent activity on assigned loans</div>}
        </div>
      </div>
    </>
  )
}