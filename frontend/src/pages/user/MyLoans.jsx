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
  const overdueCount = activeLoans.filter(l => l.is_overdue).length

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

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Active Loans</div>
          <div className="page-subtitle">Manage your active loans, repayments and track progress.</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/user/loans/apply-wizard')}>
          <span className="material-symbols-rounded">add</span>
          Apply for Loan
        </button>
      </div>

      {loading ? (
        <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>
      ) : loans.length > 0 ? (
        <>
          {overdueCount > 0 && (
            <div className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '0.9rem', textTransform: 'none', letterSpacing: '0', fontWeight: 500, width: 'fit-content' }}>
              <span className="material-symbols-rounded">warning</span>
              You have {overdueCount} overdue loan{overdueCount > 1 ? 's' : ''}. Please make payments immediately.
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Active Loans</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>{loans.length} Total</span>
              <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>{activeLoans.length} Active</span>
            </div>
          </div>

          <div className="grid grid-2">
            {loans.map(loan => {
              const isActive = loan.status === 'approved' || loan.status === 'fully_paid'
              const paid = parseFloat(loan.total_paid)
              const total = parseFloat(loan.total_payable)
              const remaining = total - paid
              const progress = calculateProgress(paid, total)
              const remainingEmis = loan.remaining_emis || (loan.emi > 0 ? Math.ceil(remaining / parseFloat(loan.emi)) : 0)
              const status = loan.is_overdue ? 'overdue' : loan.status
              const canPay = loan.status === 'approved' && remaining > 0

              if (isActive) {
                return (
                  <div className="loan-card" key={loan.id} style={loan.is_overdue ? { borderLeft: '3px solid var(--danger)' } : {}}>
                    <div className="loan-head">
                      <div>
                        <div className="loan-num">{loan.loan_number}</div>
                        <div className="text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                          Principal &middot; {formatCurrency(loan.amount)} &middot; {loan.interest_rate}% p.a.
                        </div>
                      </div>
                      <span className={`badge ${status === 'overdue' ? 'badge-danger' : status === 'approved' ? 'badge-success' : 'badge-muted'}`}>{status}</span>
                    </div>

                    <div className="loan-grid">
                      <div className="loan-stat">
                        <div className="label">EMI</div>
                        <div className="value">{formatCurrency(loan.emi)}/mo</div>
                      </div>
                      <div className="loan-stat">
                        <div className="label">Paid</div>
                        <div className="value">{formatCurrency(paid)}</div>
                      </div>
                      <div className="loan-stat">
                        <div className="label">Remaining</div>
                        <div className="value">{formatCurrency(Math.max(0, remaining))}</div>
                      </div>
                    </div>

                    <div className="loan-progress-meta">
                      <span>Repaid {formatCurrency(paid)} / {formatCurrency(total)}</span>
                      <span><strong>{progress}%</strong> &middot; {remainingEmis} EMIs left</span>
                    </div>
                    <div className="progress">
                      <div className={`progress-bar ${loan.status === 'fully_paid' ? 'success' : ''}`}
                        style={{ width: `${progress}%`, background: loan.is_overdue ? 'var(--danger)' : '' }} />
                    </div>

                    {canPay && (
                      <button className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} onClick={() => openPayModal(loan)}>
                        <span className="material-symbols-rounded">payments</span>
                        Pay EMI
                      </button>
                    )}

                    {loan.repayments?.length > 0 && (
                      <details style={{ marginTop: '12px' }}>
                        <summary style={{ fontSize: '0.8rem', color: 'var(--accent-color)', cursor: 'pointer' }}>
                          View Repayment History ({loan.repayments.length})
                        </summary>
                        <div style={{ marginTop: '8px' }}>
                          {loan.repayments.map(r => (
                            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>EMI-{r.emi_number || '\u2014'}</span>
                              <span style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(r.amount)}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{formatDate(r.repayment_date)}</span>
                              <span className={`badge ${r.status === 'paid' ? 'badge-success' : 'badge-muted'}`}>{r.status || 'paid'}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )
              }

              return (
                <div className="loan-card" key={loan.id}>
                  <div className="loan-head">
                    <div>
                      <div className="loan-num">{loan.loan_number}</div>
                      <div className="text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                        Principal &middot; {formatCurrency(loan.amount)} &middot; {loan.interest_rate}% p.a.
                      </div>
                    </div>
                    <span className={`badge ${status === 'overdue' ? 'badge-danger' : status === 'approved' ? 'badge-success' : 'badge-muted'}`}>{loan.status}</span>
                  </div>
                  <div className="loan-grid">
                    <div className="loan-stat">
                      <div className="label">Interest</div>
                      <div className="value">{loan.interest_rate}%</div>
                    </div>
                    <div className="loan-stat">
                      <div className="label">EMI</div>
                      <div className="value">{formatCurrency(loan.emi)}</div>
                    </div>
                    <div className="loan-stat">
                      <div className="label">Total</div>
                      <div className="value">{formatCurrency(loan.total_payable)}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="empty"><span className="material-symbols-rounded">request_quote</span><div>You don't have any active loans.</div></div>
      )}

      {payingLoan && (
        <div className="modal-overlay" onClick={closePayModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Pay EMI</h2>
              <button className="modal-close" onClick={closePayModal}><span className="material-symbols-rounded">close</span></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                Loan: <strong style={{ color: '#fff' }}>{payingLoan.loan_number}</strong>
                &nbsp;&middot;&nbsp;Outstanding: <strong style={{ color: '#fff' }}>{formatCurrency(Math.max(0, parseFloat(payingLoan.total_payable) - parseFloat(payingLoan.total_paid)))}</strong>
              </p>
              {payError && (
                <div className="badge badge-danger" style={{ marginBottom: '12px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'none', fontWeight: 500, fontSize: '13px', letterSpacing: '0' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>error</span>
                  {payError}
                </div>
              )}
              <form onSubmit={handlePay}>
                <div className="form-group">
                  <label htmlFor="pay-amount">Amount (NPR)</label>
                  <input type="number" id="pay-amount" className="form-control"
                    step="0.01" min="1" required
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

      <style>{`
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
    </>
  )
}
