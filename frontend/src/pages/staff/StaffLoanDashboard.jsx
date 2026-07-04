import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import api from '../../services/api'
import { staffLoanDashboard, staffListLoanApplications } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js'
import { Doughnut, Line } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler)

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']



function getToday() { return new Date().toISOString().split('T')[0] }

function KPICard({ icon, title, value, trend, subtitle, nav, color }) {
  const navigate = useNavigate()
  return (
    <div className="card-stat" style={{ cursor: 'pointer', padding: '14px 18px', '--accent-color': color }} onClick={() => navigate(nav)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="card-stat-icon" style={{ flexShrink: 0, background: `${color || 'var(--accent-color)'}1a`, color: color || 'var(--accent-color)' }}>
          <span className="material-symbols-rounded">{icon}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="stat-title">{title}</div>
          <div className="stat-value">{value}</div>
          {trend !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 14, color: trend >= 0 ? 'var(--success)' : 'var(--danger)' }}>{trend >= 0 ? 'trending_up' : 'trending_down'}</span>
              <span style={{ fontSize: 12, color: trend >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{trend >= 0 ? '+' : ''}{trend}</span>
              {subtitle && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{subtitle}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

KPICard.propTypes = {
  icon: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.any.isRequired,
  trend: PropTypes.any,
  subtitle: PropTypes.string,
  nav: PropTypes.string.isRequired,
  color: PropTypes.string
}

export default function StaffLoanDashboard() {
  const navigate = useNavigate()
  const [dashData, setDashData] = useState(null)
  const [submittedApps, setSubmittedApps] = useState([])
  const [clarificationApps, setClarificationApps] = useState([])
  const [verifiedApps, setVerifiedApps] = useState([])
  const [visitApps, setVisitApps] = useState([])
  const [finalReviewApps, setFinalReviewApps] = useState([])
  const [allLoans, setAllLoans] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    const [dashboardRes, submittedRes, clarificationRes, verifiedRes, visitsRes, finalReviewRes, loansRes] = await Promise.all([
      staffLoanDashboard().catch(() => ({ data: null })),
      staffListLoanApplications('submitted').catch(() => ({ data: { applications: [] } })),
      staffListLoanApplications('clarification_required').catch(() => ({ data: { applications: [] } })),
      staffListLoanApplications('documents_verified').catch(() => ({ data: { applications: [] } })),
      staffListLoanApplications('visit_scheduled').catch(() => ({ data: { applications: [] } })),
      staffListLoanApplications('final_review').catch(() => ({ data: { applications: [] } })),
      api.get('/loans').catch(() => ({ data: { loans: [] } }))
    ])
    setDashData(dashboardRes.data)
    setSubmittedApps(submittedRes.data.applications || [])
    setClarificationApps(clarificationRes.data.applications || [])
    setVerifiedApps(verifiedRes.data.applications || [])
    setVisitApps(visitsRes.data.applications || [])
    setFinalReviewApps(finalReviewRes.data.applications || [])
    setAllLoans(loansRes.data.loans || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const today = getToday()
  const assignedApps = dashData?.assigned_applications || []
  const recentActivity = dashData?.recent_activity || []

  const kpi = useMemo(() => ({
    myAssigned: assignedApps.length,
    newApps: submittedApps.length,
    pendingVerification: submittedApps.filter(a => !a.documents_verified && a.status === 'submitted').length,
    clarificationCount: clarificationApps.length,
    todayVisits: visitApps.filter(a => a.appointment_date === today).length + assignedApps.filter(a => a.appointment_date === today && !a.id?.startsWith('visit_')).length,
    verifiedToday: dashData?.processed_today || 0,
    forwardedCount: finalReviewApps.length,
    activeLoans: allLoans.filter(l => ['approved', 'active', 'disbursed'].includes(l.status)).length
  }), [assignedApps, submittedApps, clarificationApps, visitApps, finalReviewApps, allLoans, dashData, today])

  const workQueue = useMemo(() => {
    const all = [
      ...submittedApps.map(a => ({ ...a, _sortPrio: 1, _stageLabel: 'New' })),
      ...clarificationApps.map(a => ({ ...a, _sortPrio: 2, _stageLabel: 'Clarification' })),
      ...verifiedApps.map(a => ({ ...a, _sortPrio: 3, _stageLabel: 'Verified' })),
      ...visitApps.map(a => ({ ...a, _sortPrio: 4, _stageLabel: 'Visit Scheduled' })),
      ...finalReviewApps.map(a => ({ ...a, _sortPrio: 5, _stageLabel: 'Admin Review' }))
    ]
    const getPrio = amt => amt > 1000000 ? 1 : amt > 500000 ? 2 : 3
    all.sort((a, b) => {
      if (a._sortPrio !== b._sortPrio) return a._sortPrio - b._sortPrio
      return getPrio(b.amount || 0) - getPrio(a.amount || 0)
    })
    return all.slice(0, 10)
  }, [submittedApps, clarificationApps, verifiedApps, visitApps, finalReviewApps])

  const weeklyData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]
    const now = new Date()
    const start = new Date(now); start.setDate(now.getDate() - now.getDay())
    recentActivity.forEach(a => {
      const action = (a.action || '').toLowerCase()
      if (action.includes('verified') || action.includes('verify')) {
        const d = new Date(a.changed_at)
        if (d >= start && d <= now) counts[d.getDay()]++
      }
    })
    return { labels: DAYS, data: counts }
  }, [recentActivity])

  const doughnutData = useMemo(() => ({
    labels: ['Pending Verification', 'Verified', 'Clarification Required', 'Forwarded to Admin'],
    datasets: [{ data: [kpi.newApps, verifiedApps.length, kpi.clarificationCount, kpi.forwardedCount], backgroundColor: ['#f59e0b', '#10b981', '#ef4444', '#3b82f6'] }]
  }), [kpi, verifiedApps])

  const todayTasks = useMemo(() => {
    const t = []
    if (kpi.newApps > 0) t.push({ id: 'review_new', label: `Review ${kpi.newApps} New Application${kpi.newApps > 1 ? 's' : ''}`, done: false })
    if (kpi.clarificationCount > 0) t.push({ id: 'follow_clarification', label: `Follow up on ${kpi.clarificationCount} Clarification Request${kpi.clarificationCount > 1 ? 's' : ''}`, done: false })
    if (kpi.todayVisits > 0) t.push({ id: 'conduct_visits', label: `Conduct ${kpi.todayVisits} Branch Visit${kpi.todayVisits > 1 ? 's' : ''}`, done: false })
    if (kpi.pendingVerification > 0) t.push({ id: 'verify_docs', label: `Verify Documents for ${kpi.pendingVerification} Application${kpi.pendingVerification > 1 ? 's' : ''}`, done: false })
    if (kpi.forwardedCount > 0) t.push({ id: 'forward_apps', label: `${kpi.forwardedCount} Application${kpi.forwardedCount > 1 ? 's' : ''} Awaiting Admin Review`, done: true })
    if (kpi.verifiedToday > 0) t.push({ id: 'verified_today', label: `${kpi.verifiedToday} Application${kpi.verifiedToday > 1 ? 's' : ''} Verified Today`, done: true })
    return t
  }, [kpi])

  const priorityAlerts = useMemo(() => {
    const a = []
    clarificationApps.forEach(app => a.push({ id: app.id, loanId: app.application_number, applicant: app.customer_name, reason: 'Clarification Pending', dueDate: app.submitted_at }))
    visitApps.filter(v => v.appointment_date === today).forEach(app => a.push({ id: app.id, loanId: app.application_number, applicant: app.customer_name, reason: 'Visit Scheduled Today', dueDate: app.appointment_date }))
    return a.slice(0, 5)
  }, [clarificationApps, visitApps, today])

  const upcomingDeadlines = useMemo(() => {
    const d = []
    const now = Date.now()
    const twoDays = 2 * 24 * 60 * 60 * 1000
    submittedApps.forEach(a => {
      const date = new Date(a.submitted_at || now).getTime()
      const elapsed = now - date
      if (elapsed > twoDays) d.push({ id: a.id, loanId: a.application_number, applicant: a.customer_name, remaining: 'Overdue', priority: 'high' })
      else if (elapsed > 24 * 60 * 60 * 1000) d.push({ id: a.id, loanId: a.application_number, applicant: a.customer_name, remaining: `${Math.round((twoDays - elapsed) / (60 * 60 * 1000))}h left`, priority: 'medium' })
    })
    visitApps.filter(v => v.appointment_date > today).forEach(a => d.push({ id: a.id, loanId: a.application_number, applicant: a.customer_name, remaining: `Visit ${formatDate(a.appointment_date)}`, priority: 'medium' }))
    return d.sort((a, b) => a.priority === 'high' ? -1 : 1).slice(0, 5)
  }, [submittedApps, visitApps, today])

  const perfStats = useMemo(() => {
    const processedToday = kpi.verifiedToday
    const verifiedThisWeek = weeklyData.data.reduce((s, v) => s + v, 0)
    const forwardedToday = finalReviewApps.filter(a => (a.updated_at || a.submitted_at || '').startsWith(today)).length
    const pendingReviews = kpi.newApps + kpi.clarificationCount
    const totalProcessed = processedToday + forwardedToday + kpi.forwardedCount
    const completionRate = kpi.myAssigned > 0 ? Math.round((totalProcessed / kpi.myAssigned) * 100) : 0
    return { processedToday, verifiedThisWeek, avgTime: '~2.5 hrs', forwardedToday, pendingReviews, completionRate }
  }, [kpi, weeklyData, finalReviewApps, today])

  const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#9ca3af', font: { size: 11 } } } }, scales: { x: { ticks: { color: '#9ca3af' }, grid: { color: '#1f2937' } }, y: { ticks: { color: '#9ca3af' }, grid: { color: '#1f2937' } } } }
  const doughnutOpts = { ...chartOpts, plugins: { ...chartOpts.plugins, legend: { position: 'bottom', labels: { color: '#9ca3af', font: { size: 11 }, padding: 10 } } } }
  const lineData = { labels: weeklyData.labels, datasets: [{ label: 'Verified', data: weeklyData.data, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 }] }

  const todayVisits = useMemo(() => visitApps.filter(a => a.appointment_date === today).slice(0, 5), [visitApps, today])

  const isEmpty = submittedApps.length === 0 && clarificationApps.length === 0 && verifiedApps.length === 0 && visitApps.length === 0 && finalReviewApps.length === 0 && kpi.myAssigned === 0 && kpi.activeLoans === 0

  const KPI_LIST = [
    { icon: 'assignment_ind', title: 'My Assigned Applications', value: kpi.myAssigned, nav: '/staff/loan/new-applications', color: '#3b82f6' },
    { icon: 'fiber_new', title: 'New Applications', value: kpi.newApps, trend: kpi.newApps, subtitle: 'new', nav: '/staff/loan/new-applications', color: '#10b981' },
    { icon: 'verified_user', title: 'Pending Verification', value: kpi.pendingVerification, nav: '/staff/loan/verification-queue', color: '#f59e0b' },
    { icon: 'feedback', title: 'Clarification Required', value: kpi.clarificationCount, nav: '/staff/loan/new-applications', color: '#ef4444' },
    { icon: 'calendar_today', title: "Today's Scheduled Visits", value: kpi.todayVisits, nav: '/staff/loan/visits', color: '#8b5cf6' },
    { icon: 'check_circle', title: 'Verified Today', value: kpi.verifiedToday, trend: kpi.verifiedToday || undefined, subtitle: kpi.verifiedToday > 0 ? 'processed' : '', nav: '/staff/loan/verification-queue', color: '#10b981' },
    { icon: 'send', title: 'Forwarded to Admin', value: kpi.forwardedCount, nav: '/staff/loan/new-applications', color: '#6366f1' },
    { icon: 'account_balance', title: 'Active Loans Under Supervision', value: kpi.activeLoans, nav: '/staff/loan/active', color: '#14b8a6' }
  ]

  if (loading) return <div className="loading-skeleton"><div className="skeleton-card" style={{ height: 80 }} /><div className="skeleton-card" style={{ height: 80 }} /><div className="skeleton-card" style={{ height: 80 }} /><div className="skeleton-card" style={{ height: 80 }} /></div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Loan Dashboard</div>
          <div className="page-subtitle">Task-focused operational overview for your assigned workload.</div>
        </div>
      </div>

      {isEmpty ? (
        <div className="empty" style={{ padding: '60px 20px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: 48, color: 'var(--text-muted)' }}>dashboard</span>
          <div style={{ marginTop: 8, fontSize: 15, color: 'var(--text-secondary)' }}>No dashboard data available</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Data will appear once applications are assigned to you.</div>
        </div>
      ) : (
        <>
          <div className="grid-stats" style={{ marginBottom: 24 }}>
            {KPI_LIST.map(c => (
              <KPICard key={c.icon} icon={c.icon} title={c.title} value={c.value} trend={c.trend} subtitle={c.subtitle} nav={c.nav} color={c.color} />
            ))}
          </div>

          <div className="dashboard-charts-grid" style={{ marginBottom: 24 }}>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Verification Progress</div>
              <div style={{ height: 280, display: 'flex', justifyContent: 'center' }}>
                <Doughnut data={doughnutData} options={doughnutOpts} />
              </div>
            </div>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Weekly Verification Trend</div>
              <div style={{ height: 280 }}>
                <Line data={lineData} options={chartOpts} />
              </div>
            </div>
          </div>

          <div className="dashboard-charts-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>My Performance Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Processed Today</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)', marginTop: 4 }}>{perfStats.processedToday}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Verified This Week</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6', marginTop: 4 }}>{perfStats.verifiedThisWeek}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Avg Verification</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6', marginTop: 4 }}>{perfStats.avgTime}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Forwarded Today</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#6366f1', marginTop: 4 }}>{perfStats.forwardedToday}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Pending Reviews</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--warning)', marginTop: 4 }}>{perfStats.pendingReviews}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Completion Rate</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: perfStats.completionRate >= 50 ? 'var(--success)' : 'var(--danger)', marginTop: 4 }}>{perfStats.completionRate}%</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Today's Branch Visits</div>
              {todayVisits.length > 0 ? (
                <table className="custom-table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Applicant</th>
                      <th>Time</th>
                      <th>Address</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayVisits.map(a => {
                      const vs = a.visit_status || a.status || 'scheduled'
                      return (
                        <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/staff/loan/review/${a.id}`)}>
                          <td style={{ fontWeight: 600 }}>{a.customer_name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{a.appointment_time || 'N/A'}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{a.address || a.branch_address || 'N/A'}</td>
                          <td><span className={`badge ${vs === 'completed' ? 'badge-success' : vs === 'pending' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: 10, textTransform: 'capitalize' }}>{vs}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No visits scheduled for today</div>
              )}
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Quick Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="review-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/staff/loan/new-applications')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#3b82f6' }}>fiber_new</span>
                    <span>New Applications</span>
                  </span>
                  <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--text-muted)' }}>chevron_right</span>
                </div>
                <div className="review-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/staff/loan/verification-queue')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#f59e0b' }}>verified</span>
                    <span>Pending Verification</span>
                  </span>
                  <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--text-muted)' }}>chevron_right</span>
                </div>
                <div className="review-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/staff/loan/visits')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#8b5cf6' }}>calendar_month</span>
                    <span>Schedule Visit</span>
                  </span>
                  <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--text-muted)' }}>chevron_right</span>
                </div>
                <div className="review-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/staff/loan/new-applications')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#ef4444' }}>feedback</span>
                    <span>Send Clarification</span>
                  </span>
                  <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--text-muted)' }}>chevron_right</span>
                </div>
                <div className="review-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/staff/loan/active')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#10b981' }}>account_balance</span>
                    <span>Active Loans</span>
                  </span>
                  <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--text-muted)' }}>chevron_right</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>My Work Queue</div>
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Loan ID</th>
                      <th>Applicant</th>
                      <th>Loan Type</th>
                      <th>Amount</th>
                      <th>Stage</th>
                      <th>Priority</th>
                      <th>Assigned</th>
                      <th>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workQueue.length > 0 ? workQueue.map(app => {
                      const prio = (app.amount || 0) > 1000000 ? { l: 'High', c: '#ef4444', bg: 'rgba(239,68,68,0.12)' } : (app.amount || 0) > 500000 ? { l: 'Medium', c: '#f59e0b', bg: 'rgba(245,158,11,0.12)' } : { l: 'Low', c: '#10b981', bg: 'rgba(16,185,129,0.12)' }
                      return (
                        <tr key={app.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/staff/loan/review/${app.id}`)}>
                          <td><span className="mono">{app.application_number}</span></td>
                          <td style={{ fontWeight: 600 }}>{app.customer_name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{app.loan_type}</td>
                          <td style={{ fontWeight: 700 }}>{formatCurrency(app.amount)}</td>
                          <td><span className="badge badge-info" style={{ fontSize: 10 }}>{app._stageLabel}</span></td>
                          <td><span className="badge" style={{ background: prio.bg, color: prio.c, fontSize: 10 }}>{prio.l}</span></td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{formatDate(app.submitted_at || app.created_at)}</td>
                          <td style={{ color: prio.l === 'High' ? '#ef4444' : 'var(--text-secondary)', fontSize: 12 }}>{prio.l === 'High' ? 'ASAP' : app.submitted_at ? '7 days' : '\u2014'}</td>
                        </tr>
                      )
                    }) : (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No items in work queue</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <div className="card-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span><span className="material-symbols-rounded" style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle', color: 'var(--accent-color)' }}>checklist</span>Today's Tasks</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{todayTasks.filter(t => t.done).length}/{todayTasks.length}</span>
                </div>
                {todayTasks.length > 0 ? todayTasks.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(55,65,81,0.08)' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, color: t.done ? 'var(--success)' : 'var(--warning)' }}>{t.done ? 'check_circle' : 'radio_button_unchecked'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: t.done ? 'var(--text-muted)' : '#fff', fontWeight: t.done ? 400 : 600, textDecoration: t.done ? 'line-through' : 'none' }}>{t.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{t.done ? 'Completed' : 'Pending'}</div>
                    </div>
                  </div>
                )) : <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center' }}>No tasks for today</div>}
              </div>

              <div className="card">
                <div className="card-title" style={{ marginBottom: 12 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle', color: 'var(--warning)' }}>schedule</span>Upcoming Deadlines
                </div>
                {upcomingDeadlines.length > 0 ? upcomingDeadlines.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(55,65,81,0.08)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{d.loanId}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{d.applicant}</div>
                    </div>
                    <span className={`badge ${d.priority === 'high' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: 9, whiteSpace: 'nowrap' }}>{d.remaining}</span>
                  </div>
                )) : <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center' }}>No upcoming deadlines</div>}
              </div>

              <div className="card">
                <div className="card-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--danger)' }}><span className="material-symbols-rounded" style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle' }}>priority_high</span>Priority Alerts</span>
                  {priorityAlerts.length > 0 && <span className="badge badge-danger" style={{ fontSize: 9, padding: '2px 6px' }}>{priorityAlerts.length}</span>}
                </div>
                {priorityAlerts.length > 0 ? priorityAlerts.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(55,65,81,0.08)', cursor: 'pointer', borderRadius: 6 }} onClick={() => navigate(`/staff/loan/review/${a.id}`)}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0, boxShadow: '0 0 6px rgba(239,68,68,0.4)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{a.loanId}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{a.applicant}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>{a.reason}</div>
                    </div>
                    <span className="material-symbols-rounded" style={{ fontSize: 14, color: 'var(--text-muted)' }}>open_in_new</span>
                  </div>
                )) : <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center' }}>No priority alerts</div>}
              </div>

              <div className="card">
                <div className="card-title" style={{ marginBottom: 12 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 14, marginRight: 4, verticalAlign: 'middle', color: '#3b82f6' }}>history</span>Recent Staff Activities
                </div>
                {recentActivity.length > 0 ? recentActivity.slice(0, 6).map((a, idx) => {
                  const colors = ['var(--success)', 'var(--warning)', '#8b5cf6', 'var(--accent-color)', '#6366f1', 'var(--danger)', '#94a3b8']
                  const keywords = ['verified', 'clarification', 'scheduled', 'submitted', 'forwarded', 'rejected']
                  let dotColor = '#94a3b8'
                  for (let i = 0; i < keywords.length; i++) {
                    if ((a.action || '').toLowerCase().includes(keywords[i])) { dotColor = colors[i]; break }
                  }
                  return (
                    <div key={a.id || idx} style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid rgba(55,65,81,0.06)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{a.action}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                          {a.application_number && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{a.application_number}</span>}
                          {a.staff_name && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>by {a.staff_name}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatDate(a.changed_at)}</div>
                      </div>
                    </div>
                  )
                }) : <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center' }}>No recent activity</div>}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
