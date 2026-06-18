import React, { useState, useEffect } from 'react'
import { adminLoanDashboard } from '../../services/loanApplicationService'
import { formatCurrency } from '../../utils/helpers'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Filler } from 'chart.js'
import { Doughnut, Line, Bar } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Filler)

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function AdminLoanDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminLoanDashboard()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /></div>
  if (!data) return <div className="empty"><span className="material-symbols-rounded">error</span><div>Failed to load</div></div>

  const chartDefaults = { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ color:'#9ca3af' } } }, scales:{ x:{ ticks:{ color:'#9ca3af' }, grid:{ color:'#1f2937' } }, y:{ ticks:{ color:'#9ca3af' }, grid:{ color:'#1f2937' } } } }

  const monthlyAppsData = { labels:(data.monthly_applications||[]).map(m=>`${MONTHS[(m.month||1)-1]} ${m.year}`), datasets:[{ label:'Applications', data:(data.monthly_applications||[]).map(m=>m.count), borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.1)', fill:true, tension:0.4 }] }

  const typeDistData = { labels:(data.loan_type_distribution||[]).map(t=>t.type), datasets:[{ data:(data.loan_type_distribution||[]).map(t=>t.count), backgroundColor:['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'] }] }

  const monthlyDisbData = { labels:(data.monthly_disbursement||[]).map(m=>`${MONTHS[(m.month||1)-1]} ${m.year}`), datasets:[{ label:'Disbursed', data:(data.monthly_disbursement||[]).map(m=>m.total), backgroundColor:'rgba(16,185,129,0.6)', borderRadius:6 }] }

  const approvalRate = data.approval_rate || 0

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Executive Loan Dashboard</div>
          <div className="page-subtitle">Strategic overview of all loan activities</div>
        </div>
      </div>

      <div className="grid-stats">
        <div className="card-stat"><div className="stat-title">Total Applications</div><div className="stat-value">{data.total_applications}</div></div>
        <div className="card-stat stat-warning"><div className="stat-title">Pending Review</div><div className="stat-value">{data.pending_review}</div></div>
        <div className="card-stat"><div className="stat-title">Clarification</div><div className="stat-value">{data.clarification_required||0}</div><div className="stat-sub">Awaiting response</div></div>
        <div className="card-stat stat-success"><div className="stat-title">Approved</div><div className="stat-value">{data.approved_loans}</div></div>
        <div className="card-stat stat-danger"><div className="stat-title">Rejected</div><div className="stat-value">{data.rejected_loans}</div></div>
        <div className="card-stat"><div className="stat-title">Total Portfolio</div><div className="stat-value">{formatCurrency(data.total_portfolio)}</div></div>
        <div className="card-stat stat-success"><div className="stat-title">Disbursed</div><div className="stat-value">{formatCurrency(data.total_disbursed)}</div></div>
        <div className="card-stat stat-warning"><div className="stat-title">Outstanding</div><div className="stat-value">{formatCurrency(data.outstanding_amount)}</div></div>
      </div>

      <div className="dashboard-charts-grid">
        <div className="card"><div className="card-title">Monthly Loan Applications</div><div style={{height:'250px'}}><Line data={monthlyAppsData} options={chartDefaults} /></div></div>
        <div className="card"><div className="card-title">Loan Type Distribution</div><div style={{height:'250px',display:'flex',justifyContent:'center'}}><Doughnut data={typeDistData} options={{...chartDefaults,plugins:{...chartDefaults.plugins,legend:{position:'bottom',labels:{color:'#9ca3af'}}}}}/></div></div>
        <div className="card"><div className="card-title">Monthly Disbursement Trend</div><div style={{height:'250px'}}><Bar data={monthlyDisbData} options={chartDefaults} /></div></div>
        <div className="card">
          <div className="card-title">Portfolio Health</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',padding:'20px'}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'2.5rem',fontWeight:700,color:'var(--success)'}}>{approvalRate}%</div>
              <div style={{color:'var(--text-secondary)',fontSize:'13px',marginTop:'4px'}}>Approval Rate</div>
              <div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'2px'}}>{data.approved_loans} of {data.total_applications}</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'2.5rem',fontWeight:700,color:'var(--danger)'}}>{data.npa_rate||0}%</div>
              <div style={{color:'var(--text-secondary)',fontSize:'13px',marginTop:'4px'}}>NPA Rate</div>
              <div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'2px'}}>{data.npa_count||0} overdue loans</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'1.8rem',fontWeight:700,color:'#fff'}}>{formatCurrency(data.total_disbursed)}</div>
              <div style={{color:'var(--text-secondary)',fontSize:'13px',marginTop:'4px'}}>Total Disbursed</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'1.8rem',fontWeight:700,color:'#fff'}}>{formatCurrency(data.total_repaid||0)}</div>
              <div style={{color:'var(--text-secondary)',fontSize:'13px',marginTop:'4px'}}>Total Repaid</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
