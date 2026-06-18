import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { staffListLoanApplications } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'

const STATUS_COLORS = {
  submitted: '#3b82f6', clarification_required: '#f59e0b',
  documents_verified: '#10b981', visit_scheduled: '#6366f1',
  final_review: '#8b5cf6'
}

export default function StaffLoanDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [submittedApps, setSubmittedApps] = useState([])
  const [clarificationApps, setClarificationApps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/staff/loan-dashboard'),
      staffListLoanApplications('submitted'),
      staffListLoanApplications('clarification_required'),
      staffListLoanApplications('documents_verified'),
      staffListLoanApplications('visit_scheduled')
    ]).then(([dashboard, submitted, clarification, verified, visits]) => {
      setData(dashboard.data)
      setSubmittedApps(submitted.data.applications || [])
      setClarificationApps(clarification.data.applications || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const todayVisits = (data?.assigned_applications || []).filter(a =>
    a.appointment_date === today
  ).length
  const assignedToday = (data?.assigned_applications || []).length
  const verifiedCount = data?.processed_today || 0
  const totalPending = submittedApps.length + clarificationApps.length
  const highPriority = clarificationApps.length + (data?.visits_today || 0)

  if (loading) return <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /></div>

  const allAssigned = data?.assigned_applications || []
  const overdueApps = allAssigned.filter(a => a.submitted_at && new Date(a.submitted_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  const todayActionApps = allAssigned.filter(a => a.status === 'visit_scheduled' || a.status === 'clarification_required')
  const recentVerified = allAssigned.filter(a => a.status === 'documents_verified' || a.status === 'final_review')

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Loan Dashboard</div>
          <div className="page-subtitle">Task-focused operational overview for today.</div>
        </div>
      </div>

      <style>{`
        .ld-summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
        @media (max-width: 900px) { .ld-summary-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 500px) { .ld-summary-grid { grid-template-columns: 1fr; } }

        .ld-card {
          background: var(--card-bg,#1a1f2e); border: 1px solid var(--border-color,#2a2f3e);
          border-radius: 12px; padding: 16px 18px; cursor: pointer;
          transition: all 0.2s; position: relative; overflow: hidden;
        }
        .ld-card:hover { border-color: rgba(59,130,246,0.3); transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
        .ld-card-accent { position: absolute; left: 0; top: 0; width: 3px; height: 100%; border-radius: 3px 0 0 3px; }
        .ld-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .ld-card-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .ld-card-icon .mat-icon { font-size: 20px; }
        .ld-card-label { font-size: 12px; color: var(--text-secondary,#94a3b8); text-transform: uppercase; letter-spacing: 0.4px; }
        .ld-card-value { font-size: 28px; font-weight: 800; letter-spacing: -0.3px; line-height: 1.1; }
        .ld-card-sub { font-size: 11px; color: var(--text-muted,#64748b); margin-top: 4px; }

        .ld-section-title { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
        .ld-section-title .mat-icon { font-size: 20px; }

        .ld-two-col { display: flex; gap: 20px; align-items: flex-start; }
        .ld-left { flex: 1; min-width: 0; }
        .ld-right { width: 340px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; }
        @media (max-width: 1000px) { .ld-two-col { flex-direction: column; } .ld-right { width: 100%; } }

        .ld-priority-card { background: var(--card-bg,#1a1f2e); border: 1px solid var(--border-color,#2a2f3e); border-radius: 12px; overflow: hidden; margin-bottom: 14px; }
        .ld-priority-head { display: flex; align-items: center; gap: 8px; padding: 12px 16px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
        .ld-priority-head .mat-icon { font-size: 18px; }
        .ld-priority-body { padding: 0 16px 12px; }

        .ld-pri-row {
          display: flex; align-items: center; gap: 12px; padding: 10px 0;
          border-bottom: 1px solid rgba(55,65,81,0.1); cursor: pointer;
          transition: background 0.15s;
        }
        .ld-pri-row:last-child { border-bottom: none; }
        .ld-pri-row:hover { background: rgba(255,255,255,0.02); border-radius: 6px; padding-left: 6px; }
        .ld-pri-id { font-size: 12px; font-family: 'JetBrains Mono', monospace; color: var(--text-secondary,#94a3b8); min-width: 120px; }
        .ld-pri-name { flex: 1; font-size: 13px; font-weight: 600; color: #fff; min-width: 100px; }
        .ld-pri-type { font-size: 11px; color: var(--text-muted,#64748b); min-width: 80px; }
        .ld-pri-amount { font-size: 12px; font-weight: 700; min-width: 90px; text-align: right; }
        .ld-pri-action { flex-shrink: 0; }

        .ld-activity { background: var(--card-bg,#1a1f2e); border: 1px solid var(--border-color,#2a2f3e); border-radius: 12px; padding: 16px; }
        .ld-activity-item { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(55,65,81,0.08); }
        .ld-activity-item:last-child { border-bottom: none; }
        .ld-activity-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
        .ld-activity-content { flex: 1; min-width: 0; }
        .ld-activity-action { font-size: 13px; color: #fff; font-weight: 600; }
        .ld-activity-app { font-size: 11px; color: var(--text-muted,#64748b); font-family: 'JetBrains Mono', monospace; }
        .ld-activity-remark { font-size: 11px; color: var(--text-secondary,#94a3b8); margin-top: 2px; }
        .ld-activity-time { font-size: 11px; color: var(--text-muted,#64748b); white-space: nowrap; flex-shrink: 0; }
      `}</style>

      <div className="ld-summary-grid">
        {[
          { label: 'Assigned Today', value: assignedToday, icon: 'assignment', color: '#3b82f6', sub: 'Applications assigned to you' },
          { label: 'Pending Verification', value: totalPending, icon: 'verified', color: '#f59e0b', sub: submittedApps.length + ' new + ' + clarificationApps.length + ' clarification' },
          { label: 'Clarification Requests', value: clarificationApps.length, icon: 'feedback', color: '#f59e0b', sub: 'Awaiting customer response' },
          { label: 'Today\'s Branch Visits', value: data?.visits_today || 0, icon: 'calendar_month', color: '#6366f1', sub: 'Scheduled for today' },
          { label: 'Verified Today', value: verifiedCount, icon: 'check_circle', color: '#10b981', sub: 'Applications processed' },
          { label: 'High Priority Cases', value: highPriority, icon: 'priority_high', color: '#ef4444', sub: clarificationApps.length + ' clarification + ' + (data?.visits_today || 0) + ' visits' }
        ].map((card, i) => (
          <div key={i} className="ld-card">
            <div className="ld-card-accent" style={{ background: card.color }} />
            <div className="ld-card-header">
              <div className="ld-card-icon" style={{ background: `${card.color}18`, color: card.color }}>
                <span className="material-symbols-rounded mat-icon">{card.icon}</span>
              </div>
              <div className="ld-card-label">{card.label}</div>
            </div>
            <div className="ld-card-value" style={{ color: card.color }}>{card.value}</div>
            <div className="ld-card-sub">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="ld-two-col">
        <div className="ld-left">
          <div className="ld-section-title">
            <span className="material-symbols-rounded mat-icon" style={{ color: '#ef4444' }}>task_alt</span>
            Task Priority
          </div>

          {overdueApps.length > 0 && (
            <div className="ld-priority-card" style={{ borderLeft: '3px solid #ef4444' }}>
              <div className="ld-priority-head" style={{ color: '#ef4444' }}>
                <span className="material-symbols-rounded">error</span>
                Overdue — {overdueApps.length} application{overdueApps.length > 1 ? 's' : ''}
              </div>
              <div className="ld-priority-body">
                {overdueApps.slice(0, 5).map(app => (
                  <div key={app.id} className="ld-pri-row" onClick={() => navigate(`/staff/loan/review/${app.id}`)}>
                    <span className="ld-pri-id">{app.application_number}</span>
                    <span className="ld-pri-name">{app.customer_name}</span>
                    <span className="ld-pri-type">{app.loan_type}</span>
                    <span className="ld-pri-amount">{formatCurrency(app.amount)}</span>
                    <button className="btn btn-sm btn-danger ld-pri-action"
                      onClick={(e) => { e.stopPropagation(); navigate(`/staff/loan/review/${app.id}`) }}>
                      Review
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {todayActionApps.length > 0 && (
            <div className="ld-priority-card" style={{ borderLeft: '3px solid #f59e0b' }}>
              <div className="ld-priority-head" style={{ color: '#f59e0b' }}>
                <span className="material-symbols-rounded">schedule</span>
                Requires Action Today — {todayActionApps.length}
              </div>
              <div className="ld-priority-body">
                {todayActionApps.slice(0, 5).map(app => (
                  <div key={app.id} className="ld-pri-row" onClick={() => navigate(`/staff/loan/review/${app.id}`)}>
                    <span className="ld-pri-id">{app.application_number}</span>
                    <span className="ld-pri-name">{app.customer_name}</span>
                    <span className="ld-pri-type">{app.loan_type}</span>
                    <span className="ld-pri-amount">{formatCurrency(app.amount)}</span>
                    <button className="btn btn-sm btn-warning ld-pri-action"
                      onClick={(e) => { e.stopPropagation(); navigate(`/staff/loan/review/${app.id}`) }}
                      style={{ color: '#000' }}>
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentVerified.length > 0 && (
            <div className="ld-priority-card" style={{ borderLeft: '3px solid #10b981' }}>
              <div className="ld-priority-head" style={{ color: '#10b981' }}>
                <span className="material-symbols-rounded">verified</span>
                Recently Verified — {recentVerified.length}
              </div>
              <div className="ld-priority-body">
                {recentVerified.slice(0, 5).map(app => (
                  <div key={app.id} className="ld-pri-row" onClick={() => navigate(`/staff/loan/review/${app.id}`)}>
                    <span className="ld-pri-id">{app.application_number}</span>
                    <span className="ld-pri-name">{app.customer_name}</span>
                    <span className="ld-pri-type">{app.loan_type}</span>
                    <span className="ld-pri-amount">{formatCurrency(app.amount)}</span>
                    <button className="btn btn-sm btn-success ld-pri-action"
                      onClick={(e) => { e.stopPropagation(); navigate(`/staff/loan/review/${app.id}`) }}>
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {overdueApps.length === 0 && todayActionApps.length === 0 && recentVerified.length === 0 && (
            <div className="empty" style={{ padding: '30px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '36px', color: 'var(--text-muted)' }}>check_circle</span>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No pending tasks. All applications up to date.</div>
            </div>
          )}
        </div>

        <div className="ld-right">
          <div className="ld-activity">
            <div className="ld-section-title" style={{ marginBottom: '4px', fontSize: '14px' }}>
              <span className="material-symbols-rounded mat-icon" style={{ fontSize: '18px', color: '#3b82f6' }}>history</span>
              Recent Activity
            </div>
            {(data?.recent_activity || []).length > 0 ? (
              data.recent_activity.slice(0, 12).map(a => {
                const actColor = a.action?.includes('verified') ? '#10b981'
                  : a.action?.includes('clarification') ? '#f59e0b'
                    : a.action?.includes('scheduled') || a.action?.includes('visit') ? '#6366f1'
                      : a.action?.includes('submitted') ? '#3b82f6'
                        : a.action?.includes('rejected') ? '#ef4444' : '#94a3b8'
                return (
                  <div key={a.id} className="ld-activity-item">
                    <div className="ld-activity-dot" style={{ background: actColor }} />
                    <div className="ld-activity-content">
                      <div className="ld-activity-action">{a.action}</div>
                      <div className="ld-activity-app">{a.application_number}</div>
                      {a.remarks && <div className="ld-activity-remark">{a.remarks.slice(0, 80)}{a.remarks.length > 80 ? '...' : ''}</div>}
                    </div>
                    <div className="ld-activity-time">{formatDate(a.changed_at)}</div>
                  </div>
                )
              })
            ) : (
              <div className="text-muted" style={{ padding: '16px', textAlign: 'center', fontSize: '13px' }}>No recent activity</div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="btn btn-primary" onClick={() => navigate('/staff/loan/new-applications')}>
              <span className="material-symbols-rounded">visibility</span> Review New Applications
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/staff/loan/visits')}>
              <span className="material-symbols-rounded">calendar_month</span> View Branch Visits
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/staff/loan/verification-queue')}>
              <span className="material-symbols-rounded">verified</span> Verification Queue
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
