import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { adminLoanDashboard } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Filler } from 'chart.js'
import { Doughnut, Line, Bar } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Filler)

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

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

export default function AdminLoanDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    adminLoanDashboard()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /></div>
  if (!data) return <div className="empty"><span className="material-symbols-rounded">error</span><div>Failed to load dashboard</div></div>

  const chartOpts = { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ color:'#9ca3af', font:{ size:11 } } } }, scales:{ x:{ ticks:{ color:'#9ca3af' }, grid:{ color:'#1f2937' } }, y:{ ticks:{ color:'#9ca3af' }, grid:{ color:'#1f2937' } } } }
  const doughnutOpts = { ...chartOpts, plugins:{ ...chartOpts.plugins, legend:{ position:'bottom', labels:{ color:'#9ca3af', font:{ size:11 }, padding:12 } } } }

  const monthlyAppsData = {
    labels: (data.monthly_applications||[]).map(m => `${MONTHS[(m.month||1)-1]} ${m.year}`),
    datasets: [{ label:'Applications', data:(data.monthly_applications||[]).map(m=>m.count), borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.1)', fill:true, tension:0.4 }]
  }

  const statusDistData = {
    labels: ['Submitted','Under Review','Pending Review','Approved','Disbursed','Active','Closed','Rejected'],
    datasets: [{
      data: [
        data.total_applications - (data.pending_review || 0) - (data.verified_applications || 0) - (data.approved_loans || 0) - (data.disbursed_loans || 0) - (data.rejected_loans || 0) - (data.closed_loans_count || 0),
        data.pending_review || 0,
        data.verified_applications || 0,
        data.approved_loans || 0,
        data.disbursed_loans || 0,
        data.active_loans_count || 0,
        data.closed_loans_count || 0,
        data.rejected_applications || 0
      ],
      backgroundColor: ['#3b82f6','#f59e0b','#8b5cf6','#10b981','#6366f1','#14b8a6','#6b7280','#ef4444']
    }]
  }

  const typeDistData = {
    labels: (data.loan_type_distribution||[]).map(t => t.type),
    datasets: [{ data:(data.loan_type_distribution||[]).map(t=>t.count), backgroundColor:['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'] }]
  }

  const BAR_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#14b8a6','#6366f1','#ec4899','#06b6d4','#f97316','#84cc16','#a855f7']
  const monthlyDisbData = {
    labels: (data.monthly_disbursement||[]).map(m => `${MONTHS[(m.month||1)-1]} ${m.year}`),
    datasets: [{ label:'Disbursed (NPR)', data:(data.monthly_disbursement||[]).map(m=>m.total), backgroundColor: (data.monthly_disbursement||[]).map((_, i) => BAR_COLORS[i % BAR_COLORS.length] + '99'), borderRadius: 6 }]
  }

  const alerts = data.priority_alerts || {}

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Loan Dashboard</div>
          <div className="page-subtitle">Executive overview of the entire loan portfolio</div>
        </div>
      </div>

      <div className="grid-stats">
        <KPICard icon="description" title="Total Applications" value={data.total_applications || 0} trend={data.today_approved || 0} subtitle="new today" nav="/admin/loan/applications" color="#3b82f6" />
        <KPICard icon="rate_review" title="Pending Review" value={`${data.pending_review || 0}`} trend={data.clarification_required || 0} subtitle="awaiting decision" nav="/admin/loan/pending" color="#f59e0b" />
        <KPICard icon="request_quote" title="Active Loans" value={data.active_loans_count || 0} nav="/admin/loan/active" color="#14b8a6" />
        <KPICard icon="payments" title="Disbursed Loans" value={data.disbursed_loans || 0} subtitle="total disbursed" nav="/admin/loan/disbursed" color="#10b981" />
        <KPICard icon="account_balance" title="Outstanding Balance" value={formatCurrency(data.total_outstanding_balance || 0)} nav="/admin/loan/active" color="#8b5cf6" />
        <KPICard icon="cancel" title="Rejected Applications" value={data.rejected_applications || 0} nav="/admin/loan/applications?status=rejected" color="#ef4444" />
        <KPICard icon="trending_up" title="Approval Rate" value={`${((data.approved_loans || 0) / (data.total_applications || 1) * 100).toFixed(1)}%`} subtitle={`${data.approved_loans || 0} approved`} nav="/admin/loan/applications?status=approved" color="#6366f1" />
        <KPICard icon="paid" title="Monthly Disbursement" value={formatCurrency(((data.monthly_disbursement||[]).slice(-1)[0]?.total || 0))} subtitle="this month" nav="/admin/loan/disbursed" color="#06b6d4" />
      </div>

      <div className="dashboard-charts-grid">
        <div className="card">
          <div className="card-title">Monthly Loan Trend</div>
          <div style={{ height: 260 }}>
            <Line data={monthlyAppsData} options={chartOpts} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Loan Status Distribution</div>
          <div style={{ height: 260, display: 'flex', justifyContent: 'center' }}>
            <Doughnut data={statusDistData} options={doughnutOpts} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Loan Type Breakdown</div>
          <div style={{ height: 260, display: 'flex', justifyContent: 'center' }}>
            <Doughnut data={typeDistData} options={doughnutOpts} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Monthly Disbursement Trend</div>
          <div style={{ height: 260 }}>
            <Bar data={monthlyDisbData} options={chartOpts} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Recent Admin Activity</div>
          <div className="timeline-vertical">
            {(data.recent_activity || []).slice(0, 6).map(a => (
              <div key={a.id} className="tlv-item">
                <div className="tlv-dot" style={{ background: a.type === 'approved' ? 'var(--success)' : a.type === 'rejected' ? 'var(--danger)' : 'var(--accent-color)' }} />
                <div className="tlv-content" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{a.action}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {a.loan_id ? <span className="mono" style={{ marginRight: 8 }}>{a.loan_id}</span> : ''}
                      {formatDate(a.time)}
                    </div>
                  </div>
                  {a.status && <span className={`badge ${a.status === 'approved' || a.status === 'disbursed' ? 'badge-success' : a.status === 'rejected' ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: 10, height: 18 }}>{a.status.replace(/_/g, ' ')}</span>}
                </div>
              </div>
            ))}
            {(!data.recent_activity || data.recent_activity.length === 0) && <div style={{ color: 'var(--text-muted)', padding: 12 }}>No recent activity</div>}
          </div>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16, color: 'var(--warning)' }}>Priority Alerts</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="review-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/loan/pending')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 20, color: alerts.waiting_over_48h > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>schedule</span>
                <span>Applications waiting over 48 hours</span>
              </span>
              <span style={{ fontWeight: 700, color: alerts.waiting_over_48h > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{alerts.waiting_over_48h || 0}</span>
            </div>
            <div className="review-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/loan/pending')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 20, color: alerts.high_value_pending > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>payments</span>
                <span>High-value loans awaiting approval</span>
              </span>
              <span style={{ fontWeight: 700, color: alerts.high_value_pending > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{alerts.high_value_pending || 0}</span>
            </div>
            <div className="review-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/loan/applications?status=submitted')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 20, color: alerts.missing_verification > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>fact_check</span>
                <span>Applications pending verification</span>
              </span>
              <span style={{ fontWeight: 700, color: alerts.missing_verification > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{alerts.missing_verification || 0}</span>
            </div>
            <div className="review-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/loan/pending')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 20, color: alerts.urgent_review > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>error</span>
                <span>Loans requiring urgent review</span>
              </span>
              <span style={{ fontWeight: 700, color: alerts.urgent_review > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{alerts.urgent_review || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}