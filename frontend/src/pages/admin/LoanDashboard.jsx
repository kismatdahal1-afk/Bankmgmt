import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLoanDashboard } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Filler } from 'chart.js'
import { Doughnut, Line, Bar } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Filler)

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const STATUS_COLORS = { '#3b82f6':'#3b82f6','#10b981':'#10b981','#f59e0b':'#f59e0b','#ef4444':'#ef4444','#8b5cf6':'#8b5cf6','#ec4899':'#ec4899','#6366f1':'#6366f1','#14b8a6':'#14b8a6' }

const KPI_NAV = {
  'Total Applications': '/admin/loan/applications?status=all',
  'Pending Reviews': '/admin/loan/pending',
  'Approved Today': '/admin/loan/applications?status=approved',
  'Active Loans': '/admin/loan/active',
  'Total Disbursed': '/admin/loan/disbursed',
  'Outstanding Balance': '/admin/loan/active',
  'Closed Loans': '/admin/loan/closed',
  'Rejected': '/admin/loan/applications?status=rejected'
}

function KPICard({ icon, title, value, trend, subtitle, nav, variant }) {
  const navigate = useNavigate()
  return (
    <div className="card-stat" style={{ cursor: 'pointer', ...(variant ? { borderLeftColor: `var(--${variant})` } : {}) }} onClick={() => navigate(nav)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-title">{title}</div>
          <div className="stat-value">{value}</div>
          {trend !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <span className={`material-symbols-rounded`} style={{ fontSize: 16, color: trend >= 0 ? 'var(--success)' : 'var(--danger)' }}>{trend >= 0 ? 'trending_up' : 'trending_down'}</span>
              <span style={{ fontSize: 13, color: trend >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{trend >= 0 ? '+' : ''}{trend}</span>
              {subtitle && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</span>}
            </div>
          )}
        </div>
        <div className={`card-stat-icon ${variant || ''}`}>
          <span className="material-symbols-rounded">{icon}</span>
        </div>
      </div>
    </div>
  )
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

  const monthlyDisbData = {
    labels: (data.monthly_disbursement||[]).map(m => `${MONTHS[(m.month||1)-1]} ${m.year}`),
    datasets: [{ label:'Disbursed (NPR)', data:(data.monthly_disbursement||[]).map(m=>m.total), backgroundColor:'rgba(16,185,129,0.6)', borderRadius:6 }]
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
        <KPICard icon="description" title="Total Applications" value={data.total_applications || 0} trend={data.today_approved || 0} subtitle="new today" nav="/admin/loan/applications" />
        <KPICard icon="rate_review" title="Pending Reviews" value={`${data.pending_review || 0} Applications`} trend={data.clarification_required || 0} subtitle="waiting" nav="/admin/loan/pending" variant="warning" />
        <KPICard icon="check_circle" title="Approved Today" value={data.today_approved || 0} trend={data.approved_loans || 0} subtitle="total approved" nav="/admin/loan/applications?status=approved" variant="success" />
        <KPICard icon="request_quote" title="Active Loans" value={data.active_loans_count || 0} trend="" subtitle="currently active" nav="/admin/loan/active" />
        <KPICard icon="payments" title="Total Disbursed" value={formatCurrency(data.total_disbursed_amount || 0)} trend="" subtitle="all time" nav="/admin/loan/disbursed" />
        <KPICard icon="account_balance" title="Outstanding Balance" value={formatCurrency(data.total_outstanding_balance || 0)} trend="" subtitle="total receivable" nav="/admin/loan/active" variant="warning" />
        <KPICard icon="folder" title="Closed Loans" value={data.closed_loans_count || 0} trend="" subtitle="fully paid" nav="/admin/loan/closed" />
        <KPICard icon="cancel" title="Rejected" value={data.rejected_applications || 0} trend="" subtitle="total rejected" nav="/admin/loan/applications?status=rejected" variant="danger" />
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
          <div className="card-title" style={{ marginBottom: 16 }}>Recent Admin Activity</div>
          <div className="timeline-vertical">
            {(data.recent_activity || []).slice(0, 6).map(a => (
              <div key={a.id} className="tlv-item">
                <div className="tlv-dot" style={{ background: a.type === 'approved' ? 'var(--success)' : a.type === 'rejected' ? 'var(--danger)' : 'var(--accent-color)' }} />
                <div className="tlv-content">
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{a.action}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{a.by ? `by ${a.by}` : ''} &middot; {formatDate(a.time)}</div>
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