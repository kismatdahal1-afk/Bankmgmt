import React, { useState, useEffect } from 'react'
import { adminLoanReports } from '../../services/loanApplicationService'
import { formatCurrency } from '../../utils/helpers'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Filler } from 'chart.js'
import { Doughnut, Line, Bar } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Filler)

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function AdminLoanReports() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminLoanReports({ months: 12 })
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /></div>
  if (!data) return <div className="empty"><span className="material-symbols-rounded">error</span><div>Failed to load reports</div></div>

  const chartOpts = { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ color:'#9ca3af', font:{ size:11 } } } }, scales:{ x:{ ticks:{ color:'#9ca3af' }, grid:{ color:'#1f2937' } }, y:{ ticks:{ color:'#9ca3af' }, grid:{ color:'#1f2937' } } } }
  const doughnutOpts = { ...chartOpts, plugins:{ ...chartOpts.plugins, legend:{ position:'bottom', labels:{ color:'#9ca3af', font:{ size:11 }, padding:12 } } } }

  const monthlyData = data.monthly_growth || []
  const monthlyLabels = monthlyData.map(m => `${MONTHS[(m.month||1)-1]} ${m.year}`)

  const lineChartData = {
    labels: monthlyLabels,
    datasets: [
      { label:'Applications', data:monthlyData.map(m=>m.applications), borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.1)', fill:true, tension:0.4 },
      { label:'Approvals', data:monthlyData.map(m=>m.approvals), borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.1)', fill:true, tension:0.4 }
    ]
  }

  const portfolioData = {
    labels: (data.loan_portfolio || []).map(p => p.type),
    datasets: [{ data:(data.loan_portfolio||[]).map(p=>p.count), backgroundColor:['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'] }]
  }

  const branchData = {
    labels: (data.branch_comparison || []).map(b => b.branch),
    datasets: [
      { label:'Applications', data:(data.branch_comparison||[]).map(b=>b.applications), backgroundColor:'rgba(59,130,246,0.6)', borderRadius:4 },
      { label:'Disbursed (NPR L)', data:(data.branch_comparison||[]).map(b=>+(b.disbursed/100000).toFixed(1)), backgroundColor:'rgba(16,185,129,0.6)', borderRadius:4 }
    ]
  }

  const staffData = {
    labels: (data.staff_performance || []).map(s => s.name),
    datasets: [{ label:'Applications Handled', data:(data.staff_performance||[]).map(s=>s.handled), backgroundColor:'rgba(139,92,246,0.6)', borderRadius:4 }]
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Loan Reports</div>
          <div className="page-subtitle">Analytics and performance reports</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => alert('PDF export would be triggered')}>
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>picture_as_pdf</span> PDF
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => alert('CSV export would be triggered')}>
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>table</span> CSV
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => alert('Excel export would be triggered')}>
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>grid_on</span> Excel
          </button>
        </div>
      </div>

      <div className="grid-stats">
        <div className="card-stat stat-success">
          <div className="stat-title">Approval Rate</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{data.approval_rate || 0}%</div>
          <div className="stat-sub">{data.total_approved || 0} of {data.total_applications || 0}</div>
        </div>
        <div className="card-stat stat-danger">
          <div className="stat-title">Rejection Rate</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{data.rejection_rate || 0}%</div>
          <div className="stat-sub">{data.total_rejected || 0} rejected</div>
        </div>
        <div className="card-stat">
          <div className="stat-title">Recovery Rate</div>
          <div className="stat-value" style={{ color: 'var(--accent-color)' }}>{data.recovery_rate || 0}%</div>
        </div>
        <div className="card-stat">
          <div className="stat-title">Avg Approval Time</div>
          <div className="stat-value">{data.average_approval_time || 0} d</div>
        </div>
      </div>

      <div className="dashboard-charts-grid">
        <div className="card">
          <div className="card-title">Monthly Growth (Applications vs Approvals)</div>
          <div style={{ height: 260 }}>
            <Line data={lineChartData} options={chartOpts} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Loan Portfolio by Type</div>
          <div style={{ height: 260, display: 'flex', justifyContent: 'center' }}>
            <Doughnut data={portfolioData} options={doughnutOpts} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Branch Comparison</div>
          <div style={{ height: 260 }}>
            <Bar data={branchData} options={chartOpts} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Staff Performance</div>
          <div style={{ height: 260 }}>
            <Bar data={staffData} options={chartOpts} />
          </div>
        </div>
      </div>
    </>
  )
}