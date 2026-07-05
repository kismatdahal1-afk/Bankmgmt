import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../../services/api'
import { listMyLoanApplications } from '../../services/loanApplicationService'
import { formatCurrency, calculateProgress, formatDate } from '../../utils/helpers'

const STATUS_COLORS = {
  draft: '#6b7280', submitted: '#3b82f6', under_review: '#8b5cf6',
  clarification_required: '#f59e0b', documents_verified: '#14b8a6',
  visit_scheduled: '#6366f1', final_review: '#6366f1',
  approved: '#10b981', rejected: '#ef4444', disbursed: '#10b981'
}

const STATUS_LABELS = {
  draft: 'Draft', submitted: 'Submitted', under_review: 'Staff Review',
  clarification_required: 'Clarification Required', documents_verified: 'Documents Verified',
  visit_scheduled: 'Visit Scheduled', final_review: 'Admin Review',
  approved: 'Approved', rejected: 'Rejected', disbursed: 'Disbursed'
}

const STATUS_ORDER = ['draft','submitted','under_review','clarification_required','documents_verified','visit_scheduled','final_review','approved','disbursed']

function getProgress(status) {
  if (status === 'approved' || status === 'disbursed') return 100
  if (status === 'rejected') return 0
  const idx = STATUS_ORDER.indexOf(status)
  return Math.round((Math.min(idx, 6) / 7) * 100)
}

export default function UserMyLoans() {
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname
  const isTrackingView = path.includes('tracking')

  const [loans, setLoans] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [payingLoan, setPayingLoan] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const loadData = () => {
    setLoading(true)
    const promises = []
    if (isTrackingView) promises.push(listMyLoanApplications())
    else promises.push(api.get('/customer/loans'))
    Promise.all(promises)
      .then(([res]) => {
        if (isTrackingView) {
          setApplications(res.data.applications || [])
        } else {
          setLoans(res.data.loans || [])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [location.pathname])

  const activeLoans = (loans || []).filter(l => l.status === 'approved' || l.status === 'fully_paid')
  const overdueCount = activeLoans.filter(l => l.payment_status === 'overdue' || l.is_overdue).length

  const openPayModal = (loan) => {
    setPayingLoan(loan)
    setPayAmount(String(parseFloat(loan.emi)))
    setPayError('')
  }

  const closePayModal = () => {
    setPayingLoan(null)
    setPayAmount('')
    setPayError('')
  }

  const handlePay = async (e) => {
    e.preventDefault()
    setPaying(true)
    setPayError('')
    try {
      await api.post(`/customer/loans/repay/${payingLoan.id}`, { amount: payAmount })
      closePayModal()
      loadData()
    } catch (err) {
      setPayError(err.response?.data?.error || 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  const openTracking = (app) => {
    navigate(`/user/loan/tracking/${app.id}`)
  }

  if (isTrackingView) {
    return (
      <>
        <style>{`
          .th-section { margin-bottom: 24px; }
          .th-header-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
          .th-header-title { font-size: 18px; font-weight: 700; color: var(--text-primary,#fff); }
          .th-header-count { font-size: 13px; color: var(--text-secondary,#94a3b8); background: rgba(255,255,255,0.05); padding: 4px 12px; border-radius: 20px; }

          .th-grid { display: flex; flex-direction: column; gap: 14px; }

          .th-card {
            background: var(--card-bg,#1a1f2e); border: 1px solid var(--border-color,#2a2f3e);
            border-radius: 14px; padding: 0; cursor: pointer; position: relative; overflow: hidden;
            transition: all 0.25s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            display: flex; flex-direction: column;
          }
          .th-card:hover { border-color: rgba(59,130,246,0.3); transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,0.25); }
          .th-card:active { transform: translateY(0); }

          .th-card-accent { position: absolute; left: 0; top: 0; width: 4px; height: 100%; border-radius: 4px 0 0 4px; }

          .th-card-main {
            display: flex; align-items: center; padding: 20px 24px 16px; gap: 20px;
          }
          .th-card-icon {
            width: 50px; height: 50px; border-radius: 14px; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
          }
          .th-card-icon .mat-icon { font-size: 26px; }

          .th-card-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
          .th-card-id { font-size: 14px; font-weight: 700; color: var(--text-primary,#fff); letter-spacing: 0.2px; font-family: 'JetBrains Mono', monospace; }
          .th-card-type { font-size: 13px; color: var(--text-secondary,#94a3b8); display: flex; align-items: center; gap: 8px; }
          .th-card-type-sep { color: var(--text-secondary,#94a3b8); font-size: 12px; }

          .th-card-amount-section { text-align: right; flex-shrink: 0; min-width: 140px; }
          .th-card-amount-label { font-size: 11px; color: var(--text-secondary,#94a3b8); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
          .th-card-amount { font-size: 22px; font-weight: 800; letter-spacing: -0.3px; line-height: 1.2; color: #fff; }

          .th-card-badge-col { flex-shrink: 0; display: flex; align-items: center; }
          .th-card-badge {
            display: inline-flex; align-items: center; gap: 5px;
            font-size: 12px; font-weight: 700; padding: 6px 16px; border-radius: 20px;
            letter-spacing: 0.2px; white-space: nowrap;
          }
          .th-card-badge .mat-icon { font-size: 12px; }

          .th-card-arrow-col { flex-shrink: 0; display: flex; align-items: center; padding-left: 8px; }
          .th-card-arrow { color: var(--text-muted,#64748b); font-size: 20px; transition: all 0.2s; }
          .th-card:hover .th-card-arrow { transform: translateX(4px); color: var(--accent-color,#3b82f6); }

          .th-card-body { padding: 0 24px 16px; }
          .th-card-body-row { display: flex; align-items: center; gap: 24px; }
          .th-card-body-item { display: flex; align-items: center; gap: 5px; font-size: 13px; color: var(--text-secondary,#94a3b8); }
          .th-card-body-item .mat-icon { font-size: 14px; }
          .th-card-body-item strong { color: var(--text-secondary,#94a3b8); font-weight: 600; }

          .th-card-progress { padding: 0 24px 14px; }
          .th-card-progress-bar { height: 4px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
          .th-card-progress-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
          .th-card-progress-label { font-size: 12px; color: var(--text-secondary,#94a3b8); margin-top: 5px; display: flex; justify-content: space-between; }

          .th-empty { padding: 60px 20px; text-align: center; }
          .th-empty .mat-icon { font-size: 48px; color: var(--text-muted,#64748b); margin-bottom: 12px; }
          .th-empty-text { font-size: 15px; color: var(--text-secondary,#94a3b8); }
          .th-empty-sub { font-size: 12px; color: var(--text-muted,#64748b); margin-top: 4px; }
        `}</style>

        <div className="page-header">
          <div>
            <div className="page-title">Loan Tracking</div>
            <div className="page-subtitle">Monitor your loan applications in real-time.</div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/user/loans/apply-wizard')}>
            <span className="material-symbols-rounded">add</span>
            Apply for Loan
          </button>
        </div>

        {loading ? (
          <div className="th-empty">
            <span className="material-symbols-rounded mat-icon">sync</span>
            <div className="th-empty-text">Loading your applications...</div>
          </div>
        ) : applications.length > 0 ? (
          <>
            {['in_progress', 'completed'].map(section => {
              const filtered = section === 'in_progress'
                ? applications.filter(a => a.status !== 'approved' && a.status !== 'rejected' && a.status !== 'disbursed')
                : applications.filter(a => a.status === 'approved' || a.status === 'rejected' || a.status === 'disbursed')
              if (filtered.length === 0) return null
              return (
                <div key={section} className="th-section">
                  <div className="th-header-bar">
                    <div className="th-header-title">
                      {section === 'in_progress' ? 'In Progress' : 'Completed'}
                    </div>
                    <span className="th-header-count">{filtered.length} application{filtered.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="th-grid">
                    {filtered.map(app => {
                      const color = STATUS_COLORS[app.status] || '#6b7280'
                      const prog = getProgress(app.status)
                      const daysAgo = app.submitted_at ? Math.floor((Date.now() - new Date(app.submitted_at).getTime()) / (1000*60*60*24)) : 0
                      const icons = {
                        draft: 'edit_note', submitted: 'how_to_reg', under_review: 'manage_search',
                        clarification_required: 'feedback', documents_verified: 'verified',
                        visit_scheduled: 'calendar_month', final_review: 'fact_check',
                        approved: 'check_circle', rejected: 'cancel', disbursed: 'account_balance'
                      }
                      return (
                        <div key={app.id} className="th-card" onClick={() => openTracking(app)}>
                          <div className="th-card-accent" style={{ background: color }} />
                          <div className="th-card-main">
                            <div className="th-card-icon" style={{ background: `${color}18`, color }}>
                              <span className="material-symbols-rounded mat-icon">{icons[app.status] || 'description'}</span>
                            </div>
                            <div className="th-card-info">
                              <div className="th-card-id">{app.application_number}</div>
                              <div className="th-card-type">
                                {app.loan_type}
                                <span className="th-card-type-sep">&middot;</span>
                                {app.duration_months} months
                              </div>
                            </div>
                            <div className="th-card-amount-section">
                              <div className="th-card-amount-label">Loan Amount</div>
                              <div className="th-card-amount">{formatCurrency(app.amount)}</div>
                            </div>
                            <div className="th-card-badge-col">
                              <span className="th-card-badge" style={{ background: `${color}18`, color }}>
                                <span className="material-symbols-rounded mat-icon">circle</span>
                                {STATUS_LABELS[app.status] || app.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="th-card-arrow-col">
                              <span className="material-symbols-rounded th-card-arrow">chevron_right</span>
                            </div>
                          </div>
                          <div className="th-card-body">
                            <div className="th-card-body-row">
                              <div className="th-card-body-item">
                                <span className="material-symbols-rounded mat-icon">calendar_today</span>
                                Applied <strong>{app.submitted_at ? formatDate(app.submitted_at) : '\u2014'}</strong>
                              </div>
                              <div className="th-card-body-item">
                                <span className="material-symbols-rounded mat-icon">schedule</span>
                                Updated <strong>{app.updated_at ? formatDate(app.updated_at) : '\u2014'}</strong>
                              </div>
                              <div className="th-card-body-item">
                                <span className="material-symbols-rounded mat-icon">pie_chart</span>
                                Progress <strong>{prog}%</strong>
                              </div>
                            </div>
                          </div>
                          <div className="th-card-progress">
                            <div className="th-card-progress-bar">
                              <div className="th-card-progress-fill" style={{ width: `${prog}%`, background: color }} />
                            </div>
                            <div className="th-card-progress-label">
                              <span>{STATUS_LABELS[app.status] || app.status.replace(/_/g, ' ')}</span>
                              <span>{daysAgo > 0 ? `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago` : 'Today'}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </>
        ) : (
          <div className="th-empty">
            <span className="material-symbols-rounded mat-icon">request_quote</span>
            <div className="th-empty-text">You don't have any loan applications on record.</div>
            <div className="th-empty-sub">Apply for a loan to get started.</div>
          </div>
        )}
      </>
    )
  }

  const totalDisbursed = loans.reduce((s, l) => s + (l.status === 'approved' ? parseFloat(l.amount) : 0), 0)

  return (
    <>
      <style>{`
        .al-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .al-kpi-card {
          background: var(--card-bg,#1a1f2e); border: 1px solid var(--border-color,#2a2f3e);
          border-radius: 14px; padding: 18px 20px; display: flex; align-items: center; gap: 14px;
          transition: all 0.2s;
        }
        .al-kpi-card:hover { border-color: rgba(59,130,246,0.2); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
        .al-kpi-icon {
          width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .al-kpi-icon .mat-icon { font-size: 22px; }
        .al-kpi-info { display: flex; flex-direction: column; gap: 1px; }
        .al-kpi-value { font-size: 22px; font-weight: 800; line-height: 1.2; letter-spacing: -0.3px; }
        .al-kpi-label { font-size: 12px; color: var(--text-secondary,#94a3b8); text-transform: uppercase; letter-spacing: 0.4px; }

        .al-overdue-banner {
          display: flex; align-items: center; gap: 10px; padding: 12px 18px;
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25);
          border-radius: 12px; margin-bottom: 20px; color: #ef4444;
        }
        .al-overdue-banner .mat-icon { font-size: 20px; flex-shrink: 0; }
        .al-overdue-banner span { font-size: 13px; font-weight: 600; }

        .al-loan-card {
          background: var(--card-bg,#1a1f2e); border: 1px solid var(--border-color,#2a2f3e);
          border-radius: 16px; overflow: hidden; margin-bottom: 18px;
          transition: all 0.25s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .al-loan-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.18); }
        .al-loan-card.overdue { border-color: rgba(239,68,68,0.3); }

        .al-card-top {
          padding: 22px 26px 16px; display: flex; align-items: flex-start; gap: 20px;
          border-bottom: 1px solid rgba(55,65,81,0.12);
        }
        .al-card-icon {
          width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .al-card-icon .mat-icon { font-size: 26px; }
        .al-card-info { flex: 1; min-width: 0; }
        .al-card-number { font-size: 15px; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: var(--text-primary,#fff); letter-spacing: 0.3px; }
        .al-card-meta { font-size: 13px; color: var(--text-secondary,#94a3b8); margin-top: 3px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .al-card-meta-sep { color: rgba(148,163,184,0.3); }
        .al-card-right { text-align: right; flex-shrink: 0; }
        .al-card-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.3px;
        }
        .al-card-badge .mat-icon { font-size: 10px; }
        .al-card-date { font-size: 11px; color: var(--text-muted,#64748b); margin-top: 4px; }

        .al-card-body { padding: 18px 26px 20px; }
        .al-card-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
        .al-card-stat {
          background: rgba(0,0,0,0.08); border-radius: 10px; padding: 12px 14px;
        }
        .al-card-stat-label { font-size: 11px; color: var(--text-secondary,#94a3b8); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
        .al-card-stat-value { font-size: 16px; font-weight: 700; color: var(--text-primary,#fff); }
        .al-card-stat-value.accent { color: var(--accent-color,#3b82f6); }
        .al-card-stat-value.success { color: #10b981; }
        .al-card-stat-value.danger { color: #ef4444; }
        .al-card-stat-value.warning { color: #f59e0b; }
        .al-card-stat-sub { font-size: 11px; color: var(--text-muted,#64748b); margin-top: 2px; }

        .al-card-progress { margin-bottom: 16px; }
        .al-card-progress-header { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary,#94a3b8); margin-bottom: 6px; }
        .al-card-progress-header strong { color: var(--text-primary,#fff); }
        .al-card-progress-track { height: 6px; background: rgba(255,255,255,0.06); border-radius: 6px; overflow: hidden; }
        .al-card-progress-fill { height: 100%; border-radius: 6px; transition: width 0.8s ease; }

        .al-card-footer {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding-top: 16px; border-top: 1px solid rgba(55,65,81,0.1);
        }
        .al-card-footer-left { display: flex; align-items: center; gap: 16px; font-size: 12px; color: var(--text-secondary,#94a3b8); }
        .al-card-footer-left .mat-icon { font-size: 14px; }
        .al-card-footer-left strong { color: var(--text-primary,#fff); }
        .al-card-actions { display: flex; gap: 8px; }
        .al-card-actions .btn { font-size: 13px; padding: 8px 18px; border-radius: 8px; }
        .al-card-actions .btn .mat-icon { font-size: 16px; }

        .al-repayment-toggle {
          background: none; border: none; color: var(--accent-color,#3b82f6); cursor: pointer;
          font-size: 12px; display: flex; align-items: center; gap: 4px; padding: 4px 0;
        }
        .al-repayment-toggle .mat-icon { font-size: 14px; transition: transform 0.2s; }
        .al-repayment-toggle.open .mat-icon { transform: rotate(90deg); }

        .al-repayment-table { margin-top: 12px; border-top: 1px solid rgba(55,65,81,0.1); padding-top: 12px; }
        .al-repayment-table-header {
          display: grid; grid-template-columns: 2fr 1fr 1.5fr 1fr;
          gap: 8px; padding: 8px 12px; font-size: 11px; color: var(--text-muted,#64748b);
          text-transform: uppercase; letter-spacing: 0.4px; font-weight: 600;
        }
        .al-repayment-table-row {
          display: grid; grid-template-columns: 2fr 1fr 1.5fr 1fr;
          gap: 8px; padding: 8px 12px; font-size: 13px; border-radius: 6px;
          transition: background 0.1s;
        }
        .al-repayment-table-row:hover { background: rgba(255,255,255,0.02); }
        .al-repayment-table-row .mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
        .al-repayment-table-row .amount { font-weight: 600; color: var(--text-primary,#fff); }
        .al-repayment-table-row .status-badge {
          font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 12px;
          text-transform: uppercase; letter-spacing: 0.3px; width: fit-content;
        }
        .al-repayment-table-row .status-badge.paid { background: rgba(16,185,129,0.12); color: #10b981; }
        .al-repayment-table-row .status-badge.pending { background: rgba(245,158,11,0.12); color: #f59e0b; }

        @media (max-width: 900px) {
          .al-kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .al-card-stats { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .al-kpi-grid { grid-template-columns: 1fr; }
          .al-card-stats { grid-template-columns: 1fr 1fr; }
          .al-card-top { flex-direction: column; }
          .al-card-footer { flex-direction: column; align-items: stretch; }
          .al-card-actions { justify-content: stretch; }
          .al-card-actions .btn { flex: 1; }
        }

        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .modal {
          background: #151a22; border: 1px solid var(--border-color);
          border-radius: 12px; width: 100%; max-width: 440px; padding: 0;
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 24px; border-bottom: 1px solid var(--border-color);
        }
        .modal-header h2 { margin: 0; font-size: 1.1rem; color: #fff; }
        .modal-close {
          background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px;
        }
        .modal-close:hover { color: #fff; }
        .modal-body { padding: 24px; }
      `}</style>

      <div className="page-header">
        <div>
          <div className="page-title">My Loans</div>
          <div className="page-subtitle">Active loans, repayment tracking and loan management dashboard.</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/user/loans/apply-wizard')}>
          <span className="material-symbols-rounded">add</span>
          Apply for Loan
        </button>
      </div>

      {loading ? (
        <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading your loan portfolio...</div></div>
      ) : loans.length > 0 ? (
        <>
          {/* KPI Cards */}
          <div className="al-kpi-grid">
            <div className="al-kpi-card">
              <div className="al-kpi-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <span className="material-symbols-rounded mat-icon">account_balance</span>
              </div>
              <div className="al-kpi-info">
                <div className="al-kpi-value" style={{ color: '#3b82f6' }}>{loans.length}</div>
                <div className="al-kpi-label">Total Loans</div>
              </div>
            </div>
            <div className="al-kpi-card">
              <div className="al-kpi-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <span className="material-symbols-rounded mat-icon">check_circle</span>
              </div>
              <div className="al-kpi-info">
                <div className="al-kpi-value" style={{ color: '#10b981' }}>{activeLoans.length}</div>
                <div className="al-kpi-label">Active</div>
              </div>
            </div>
            <div className="al-kpi-card">
              <div className="al-kpi-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                <span className="material-symbols-rounded mat-icon">warning</span>
              </div>
              <div className="al-kpi-info">
                <div className="al-kpi-value" style={{ color: '#ef4444' }}>{overdueCount}</div>
                <div className="al-kpi-label">Overdue</div>
              </div>
            </div>
            <div className="al-kpi-card">
              <div className="al-kpi-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <span className="material-symbols-rounded mat-icon">payments</span>
              </div>
              <div className="al-kpi-info">
                <div className="al-kpi-value" style={{ color: '#8b5cf6', fontSize: '18px' }}>{formatCurrency(totalDisbursed)}</div>
                <div className="al-kpi-label">Total Disbursed</div>
              </div>
            </div>
          </div>

          {/* Overdue Alert */}
          {overdueCount > 0 && (
            <div className="al-overdue-banner">
              <span className="material-symbols-rounded">warning</span>
              <span>You have {overdueCount} overdue loan{overdueCount > 1 ? 's' : ''}. Please make payments immediately to avoid penalties.</span>
            </div>
          )}

          {/* Loan Cards */}
          {loans.map(loan => {
            const paid = parseFloat(loan.total_paid)
            const total = parseFloat(loan.total_payable)
            const remaining = total - paid
            const progress = calculateProgress(paid, total)
            const remainingEmis = loan.remaining_emis || (loan.emi > 0 ? Math.ceil(remaining / parseFloat(loan.emi)) : 0)
            const canPay = loan.status === 'approved' && remaining > 0
            const ps = loan.payment_status || 'current'
            const statusColor = ps === 'overdue' ? '#ef4444' : ps === 'due_soon' ? '#f59e0b' : loan.status === 'fully_paid' ? '#6366f1' : '#10b981'
            const statusIcon = ps === 'overdue' ? 'warning' : ps === 'due_soon' ? 'schedule' : loan.status === 'fully_paid' ? 'verified' : 'check_circle'
            const statusLabel = ps === 'overdue' ? 'Overdue' : ps === 'due_soon' ? 'Due Soon' : loan.status === 'fully_paid' ? 'Fully Paid' : 'Current'

            return (
              <div key={loan.id} className={`al-loan-card${ps === 'overdue' ? ' overdue' : ''}`}>
                {/* Card Header */}
                <div className="al-card-top">
                  <div className="al-card-icon" style={{ background: `${statusColor}18`, color: statusColor }}>
                    <span className="material-symbols-rounded mat-icon">{statusIcon}</span>
                  </div>
                  <div className="al-card-info">
                    <div className="al-card-number">{loan.application_number || loan.loan_number}</div>
                    <div className="al-card-meta">
                      <span>Principal {formatCurrency(loan.amount)}</span>
                      <span className="al-card-meta-sep">&middot;</span>
                      <span>{loan.interest_rate}% p.a.</span>
                      <span className="al-card-meta-sep">&middot;</span>
                      <span>{loan.duration_months} months</span>
                    </div>
                  </div>
                  <div className="al-card-right">
                    <span className="al-card-badge" style={{ background: `${statusColor}18`, color: statusColor }}>
                      <span className="material-symbols-rounded mat-icon">circle</span>
                      {statusLabel}
                    </span>
                    <div className="al-card-date">
                      {loan.approved_date ? `Approved ${formatDate(loan.approved_date)}` : `Applied ${formatDate(loan.applied_date)}`}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="al-card-body">
                  {/* Stats Grid */}
                  <div className="al-card-stats">
                    <div className="al-card-stat">
                      <div className="al-card-stat-label">Monthly EMI</div>
                      <div className="al-card-stat-value accent">{formatCurrency(loan.emi)}</div>
                      <div className="al-card-stat-sub">Per month</div>
                    </div>
                    <div className="al-card-stat">
                      <div className="al-card-stat-label">Outstanding</div>
                      <div className="al-card-stat-value warning">{formatCurrency(Math.max(0, remaining))}</div>
                      <div className="al-card-stat-sub">Remaining balance</div>
                    </div>
                    <div className="al-card-stat">
                      <div className="al-card-stat-label">Total Paid</div>
                      <div className="al-card-stat-value success">{formatCurrency(paid)}</div>
                      <div className="al-card-stat-sub">Of {formatCurrency(total)}</div>
                    </div>
                    <div className="al-card-stat">
                      <div className="al-card-stat-label">EMIs Left</div>
                      <div className="al-card-stat-value">{remainingEmis}</div>
                      <div className="al-card-stat-sub">Remaining installments</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="al-card-progress">
                    <div className="al-card-progress-header">
                      <span>Repayment <strong>{progress}%</strong></span>
                      <span><strong>{formatCurrency(paid)}</strong> repaid / <strong>{formatCurrency(total)}</strong></span>
                    </div>
                    <div className="al-card-progress-track">
                      <div className="al-card-progress-fill" style={{
                        width: `${progress}%`,
                        background: ps === 'overdue' ? '#ef4444' : progress >= 100 ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #6366f1)'
                      }} />
                    </div>
                  </div>

                  {/* Footer with Payment Info and Actions */}
                  <div className="al-card-footer">
                    <div className="al-card-footer-left">
                      {loan.last_payment_date && (
                        <>
                          <span className="material-symbols-rounded mat-icon">calendar_month</span>
                          Last payment <strong>{formatDate(loan.last_payment_date)}</strong>
                          <span className="al-card-meta-sep">|</span>
                        </>
                      )}
                      <span className="material-symbols-rounded mat-icon">receipt_long</span>
                      EMI <strong>{formatCurrency(loan.emi)}</strong>/mo
                    </div>
                    <div className="al-card-actions">
                      {canPay && (
                        <button className="btn btn-primary" onClick={() => openPayModal(loan)}>
                          <span className="material-symbols-rounded">payments</span>
                          Pay EMI
                        </button>
                      )}
                      {loan.repayments?.length > 0 && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            const el = document.getElementById(`repay-toggle-${loan.id}`)
                            if (el) el.click()
                          }}
                        >
                          <span className="material-symbols-rounded">history</span>
                          History
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Repayment History */}
                  {loan.repayments?.length > 0 && (
                    <details style={{ marginTop: '4px' }}>
                      <summary
                        id={`repay-toggle-${loan.id}`}
                        className="al-repayment-toggle"
                        style={{ listStyle: 'none', cursor: 'pointer' }}
                      >
                        <span className="material-symbols-rounded mat-icon">chevron_right</span>
                        Repayment History ({loan.repayments.length})
                      </summary>
                      <div className="al-repayment-table">
                        <div className="al-repayment-table-header">
                          <span>EMI</span>
                          <span>Amount</span>
                          <span>Date</span>
                          <span>Status</span>
                        </div>
                        {loan.repayments.map(r => (
                          <div key={r.id} className="al-repayment-table-row">
                            <span className="mono">EMI-{r.emi_number || '\u2014'}</span>
                            <span className="amount">{formatCurrency(r.amount)}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{formatDate(r.repayment_date)}</span>
                            <span>
                              <span className={`status-badge ${r.status === 'paid' ? 'paid' : 'pending'}`}>
                                {r.status || 'paid'}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )
          })}
        </>
      ) : (
        <div className="empty"><span className="material-symbols-rounded">request_quote</span><div>You {'don\'t'} have any active loans yet.</div></div>
      )}

      {/* Pay EMI Modal */}
      {payingLoan && (
        <div className="modal-overlay" onClick={closePayModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Pay EMI</h2>
              <button className="modal-close" onClick={closePayModal}><span className="material-symbols-rounded">close</span></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                Loan: <strong style={{ color: '#fff' }}>{payingLoan.application_number || payingLoan.loan_number}</strong>
                &nbsp;&middot;&nbsp;Outstanding: <strong style={{ color: '#fff' }}>{formatCurrency(Math.max(0, parseFloat(payingLoan.total_payable) - parseFloat(payingLoan.total_paid)))}</strong>
              </p>
              {payError && (
                <div className="badge badge-danger" style={{ marginBottom: '12px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'none', fontWeight: 500, fontSize: '13px', letterSpacing: '0' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>error</span>
                  {payError}
                </div>
              )}

              {payingLoan.payment_status === 'overdue' && (
                <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', background: (payingLoan.overdue_days || 0) <= 7 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${(payingLoan.overdue_days || 0) <= 7 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                    {(payingLoan.overdue_days || 0) <= 7 ? (
                      <span style={{ color: 'var(--warning)' }}>Grace Period — No Penalty</span>
                    ) : (
                      <span style={{ color: 'var(--danger)' }}>Late Penalty Applied</span>
                    )}
                  </div>
                  {(payingLoan.overdue_days || 0) > 7 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Late Penalty (5%)</span>
                      <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{formatCurrency(payingLoan.late_penalty || 0)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: 2 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Monthly EMI</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{formatCurrency(payingLoan.emi)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Total Payable</span>
                    <span style={{ fontWeight: 800, color: 'var(--accent-color)', fontSize: '1rem' }}>
                      {formatCurrency(parseFloat(payingLoan.emi || 0) + parseFloat(payingLoan.late_penalty || 0))}
                    </span>
                  </div>
                </div>
              )}

              <form onSubmit={handlePay}>
                <div className="form-group">
                  <label htmlFor="pay-amount">Amount (NPR)</label>
                  <input type="number" id="pay-amount" className="form-control"
                    step="0.01" min={(parseFloat(payingLoan.emi || 0) + parseFloat(payingLoan.late_penalty || 0)).toFixed(2)} required
                    defaultValue={(parseFloat(payingLoan.emi || 0) + parseFloat(payingLoan.late_penalty || 0)).toFixed(2)}
                    value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Amount will be deducted from your active account balance.
                </p>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={paying}>
                  <span className="material-symbols-rounded">{paying ? 'sync' : 'check'}</span>
                  {paying ? 'Processing...' : 'Confirm Payment'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
