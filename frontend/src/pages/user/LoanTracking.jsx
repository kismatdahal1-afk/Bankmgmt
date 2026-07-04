import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trackLoanApplication, deleteLoanApplication, customerRespondClarification } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'

const STATUS_COLORS = {
  draft:'#6b7280', submitted:'#3b82f6', under_review:'#8b5cf6',
  clarification_required:'#f59e0b', documents_verified:'#14b8a6',
  visit_scheduled:'#6366f1', final_review:'#6366f1',
  approved:'#10b981', rejected:'#ef4444', disbursed:'#10b981'
}

const STATUS_LABELS = {
  draft:'Draft', submitted:'Submitted', under_review:'Staff Review',
  clarification_required:'Clarification Required', documents_verified:'Documents Verified',
  visit_scheduled:'Visit Scheduled', final_review:'Admin Review',
  approved:'Approved', rejected:'Rejected', disbursed:'Disbursed'
}

const TRACK_STEPS = [
  { key:'submitted', label:'Application Submitted', icon:'how_to_reg' },
  { key:'documents_uploaded', label:'Documents Uploaded', icon:'cloud_upload' },
  { key:'under_review', label:'Staff Review Started', icon:'manage_search' },
  { key:'clarification_required', label:'Clarification Requested', icon:'feedback', optional:true },
  { key:'resubmitted', label:'Re-Submitted', icon:'refresh', optional:true },
  { key:'documents_verified', label:'Documents Verified', icon:'verified' },
  { key:'final_review', label:'Admin Review', icon:'fact_check' },
  { key:'approved', label:'Loan Approved', icon:'check_circle' },
  { key:'disbursed', label:'Loan Activated', icon:'account_balance' },
]

const TIMELINE_COLORS = {
  submitted:'#10b981', under_review:'#3b82f6', clarification_required:'#f59e0b',
  documents_verified:'#10b981', visit_scheduled:'#6366f1', final_review:'#3b82f6',
  approved:'#10b981', rejected:'#ef4444', disbursed:'#059669'
}

const TIMELINE_ICONS = {
  submitted:'how_to_reg', under_review:'manage_search', clarification_required:'feedback',
  documents_verified:'verified', visit_scheduled:'event', final_review:'fact_check',
  approved:'check_circle', rejected:'cancel', disbursed:'account_balance'
}

function getStepState(app) {
  const status = app.status
  const stepHistory = app.status_history || []
  const docs = app.documents || []
  const steps = TRACK_STEPS.map(step => {
    let state = 'pending'
    let date = null
    let by = null

    if (step.key === 'submitted') {
      const entry = stepHistory.find(h => h.new_status === 'submitted')
      if (entry || app.submitted_at) { state = 'completed'; date = entry?.changed_at || app.submitted_at; by = entry?.changed_by }
    } else if (step.key === 'documents_uploaded') {
      let latest = null
      docs.forEach(d => { if (d.uploaded_at && (!latest || d.uploaded_at > latest.uploaded_at)) latest = d })
      if (latest && latest.uploaded_at) { state = 'completed'; date = latest.uploaded_at }
      else if (app.submitted_at) { state = 'completed'; date = app.submitted_at }
    } else if (step.key === 'resubmitted') {
      const entry = stepHistory.find(h => h.new_status === 'documents_verified' && h.old_status === 'clarification_required')
      if (entry) { state = 'completed'; date = entry.changed_at; by = entry.changed_by }
    } else {
      const entry = stepHistory.find(h => h.new_status === step.key)
      if (entry) { state = 'completed'; date = entry.changed_at; by = entry.changed_by }
    }

    if (status === step.key && state !== 'completed') state = 'current'
    if (status === 'rejected' && state === 'pending') state = 'skipped'
    if ((status === 'approved' || status === 'disbursed') && state === 'pending') state = 'skipped'

    return { ...step, state, date, time: date ? formatTime(date) : null, by }
  })
  return steps
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  try { return new Date(dateStr).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true }) }
  catch (_) { return '' }
}

function daysSince(dateStr) {
  if (!dateStr) return 0
  const d = new Date(dateStr)
  const now = new Date()
  return Math.floor((now - d) / (1000*60*60*24))
}

export default function LoanTracking() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [respondLoading, setRespondLoading] = useState(false)
  const [respondMsg, setRespondMsg] = useState('')
  const [respondError, setRespondError] = useState('')
  const [zoomDoc, setZoomDoc] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    trackLoanApplication(id)
      .then(res => { setData(res.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (zoomDoc) { document.body.style.overflow = 'hidden' }
    else { document.body.style.overflow = '' }
    return () => { document.body.style.overflow = '' }
  }, [zoomDoc])

  const handleRespondClarification = async () => {
    setRespondLoading(true); setRespondMsg(''); setRespondError('')
    try {
      await customerRespondClarification(id)
      setRespondMsg('success')
      const res = await trackLoanApplication(id)
      setData(res.data)
    } catch (e) {
      setRespondError(e.response?.data?.error || 'Failed to submit response')
    } finally { setRespondLoading(false) }
  }

  const handleEditAndResubmit = () => navigate(`/user/loan/apply?id=${id}`)

  const handleDeleteDraft = async () => {
    setDeleting(true)
    try {
      await deleteLoanApplication(id)
      navigate('/user/loan/tracking')
    } catch (_) {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) return <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /></div>
  if (!data) return <div className="empty"><span className="material-symbols-rounded">search_off</span><div>Application not found</div></div>
  if (!data.application) return <div className="empty"><span className="material-symbols-rounded">error</span><div>Unable to load application details</div></div>

  const app = data.application
  const customer = data.customer || {}
  const accounts = data.accounts || []
  const statusColor = STATUS_COLORS[app.status] || '#6b7280'
  const statusLabel = STATUS_LABELS[app.status] || app.status.replace(/_/g, ' ')
  const steps = getStepState(app)
  const completedSteps = steps.filter(s => s.state === 'completed').length
  const visibleSteps = steps.filter(s => !(s.optional && s.state === 'pending'))
  const totalSteps = visibleSteps.length
  const progressPct = app.status === 'rejected' || totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100)
  const sortedHistory = (app.status_history || []).slice().sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at))
  const docs = app.documents || []
  const daysApplied = daysSince(app.submitted_at)
  const expectedDays = app.expected_processing_days || 5
  const remainingDays = Math.max(0, expectedDays - daysApplied)
  const latestClarification = (app.clarification_requests || []).filter(c => !c.is_resolved).slice(-1)[0]
  const clarifyingRemark = sortedHistory.find(h => h.new_status === 'clarification_required')?.remarks || ''

  const emi = (function calc() {
    if (!app.amount || !app.interest_rate || !app.duration_months) return 0
    const mr = (app.interest_rate / 12) / 100
    const n = app.duration_months
    return app.amount * mr * Math.pow(1 + mr, n) / (Math.pow(1 + mr, n) - 1)
  })()

  const totalRepayment = emi * (app.duration_months || 0)
  const processingFee = app.amount * 0.005
  const requiredDocKeys = ['citizenship', 'income_proof']
  const uploadedCount = requiredDocKeys.filter(k => docs.find(d => d.document_type === k)).length
  const docScore = requiredDocKeys.length ? Math.round((uploadedCount / requiredDocKeys.length) * 100) : 100


  const insightMsg = app.status === 'approved' ? 'Your loan has been approved. Funds will be disbursed shortly.'
    : app.status === 'disbursed' ? 'Your loan has been disbursed. Repayment schedule is now active.'
    : app.status === 'rejected' ? 'Your application was not approved. Please contact the branch for further assistance.'
    : app.status === 'clarification_required' ? 'Additional information is required to proceed with your application.'
    : app.status === 'documents_verified' ? 'All documents verified successfully. Awaiting final review.'
    : app.status === 'final_review' ? 'Your application is under final admin review.'
    : app.status === 'under_review' ? 'Your application is being reviewed by our staff team.'
    : 'Your application is progressing normally.'

  const verifNotes = app.verification_notes || []
  const lastVerif = verifNotes.length > 0 ? verifNotes[verifNotes.length - 1] : null
  const isVerified = ['documents_verified', 'visit_scheduled', 'final_review', 'approved', 'disbursed'].includes(app.status)
  const verifStatusLabel = isVerified ? 'Documents Verified' : app.status === 'clarification_required' ? 'Clarification Required' : 'Pending Review'
  const verifStatusColor = isVerified ? '#10b981' : app.status === 'clarification_required' ? '#f59e0b' : '#3b82f6'
  const latestClarReq = (app.clarification_requests || []).length > 0 ? (app.clarification_requests || [])[(app.clarification_requests || []).length - 1] : null

  return (
    <>
      <style>{`
        .td-header {
          background: linear-gradient(135deg, var(--card-bg,#1a1f2e) 0%, rgba(59,130,246,0.04) 100%);
          border: 1px solid var(--border-color,#2a2f3e); position: relative; overflow: hidden;
          border-radius: 16px; padding: 0; margin-bottom: 20px;
        }
        .td-header-accent { position: absolute; left: 0; top: 0; width: 4px; height: 100%; border-radius: 4px 0 0 4px; }
        .td-header-body { padding: 22px 28px 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 16px 28px; }
        .td-header-left { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 200px; }
        .td-header-icon {
          width: 48px; height: 48px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .td-header-icon .mat-icon { font-size: 24px; }
        .td-header-info { display: flex; flex-direction: column; gap: 2px; }
        .td-header-loan-id { font-size: 12px; color: var(--text-secondary,#94a3b8); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; }
        .td-header-loan-type { font-size: 15px; font-weight: 700; color: var(--text-primary,#fff); }
        .td-header-center { text-align: center; padding: 0 8px; min-width: 140px; }
        .td-header-amount-label { font-size: 12px; color: #fff; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 2px; opacity: 0.85; }
        .td-header-amount { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.1; color: #fff !important; }
        .td-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; min-width: 140px; }
        .td-header-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 14px; border-radius: 20px;
          font-size: 12px; font-weight: 700; letter-spacing: 0.3px;
        }
        .td-header-date { font-size: 12px; color: var(--text-secondary,#94a3b8); }
        .td-header-date strong { color: var(--text-primary,#e2e8f0); font-weight: 600; }
        .td-header-progress-section { padding: 0 28px 18px; }
        .td-progress-label { font-size: 12px; color: var(--text-secondary,#94a3b8); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; display: flex; justify-content: space-between; }
        .td-progress-bar-wrap { height: 5px; background: rgba(255,255,255,0.06); border-radius: 5px; overflow: hidden; }
        .td-progress-bar-fill { height: 100%; border-radius: 5px; transition: width 0.8s ease; }
        .td-progress-stats { display: flex; justify-content: space-between; margin-top: 4px; font-size: 12px; color: var(--text-secondary,#94a3b8); }
        @media (max-width: 640px) {
          .td-header-body { padding: 16px 18px 12px; gap: 12px 16px; }
          .td-header-left { min-width: 100%; }
          .td-header-center { min-width: 100%; text-align: left; padding: 0; }
          .td-header-right { min-width: 100%; flex-direction: row; align-items: center; justify-content: space-between; }
          .td-header-amount { font-size: 22px; }
          .td-header-progress-section { padding: 0 18px 14px; }
        }

        .td-layout { display: flex; gap: 24px; align-items: flex-start; }
        .td-left { flex: 1; min-width: 0; max-width: 65%; display: flex; flex-direction: column; gap: 16px; }
        .td-right { width: 35%; min-width: 280px; display: flex; flex-direction: column; gap: 16px; }
        @media (max-width: 1024px) { .td-layout { flex-direction: column; } .td-left { max-width: 100%; } .td-right { width: 100%; } }
        @media (max-width: 640px) { .td-header { padding: 18px; gap: 12px 20px; } }

        .td-section-title { font-size: 18px; font-weight: 700; color: var(--text-primary,#fff); display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
        .td-section-title .mat-icon { font-size: 22px; color: var(--accent-color,#3b82f6); }

        .lp-summary { background: var(--card-bg,#1a1f2e); border: 1px solid var(--border-color,#2a2f3e); border-radius: 14px; padding: 18px 22px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
        .lp-summary-left { display: flex; align-items: center; gap: 14px; min-width: 180px; }
        .lp-summary-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .lp-summary-icon .mat-icon { font-size: 22px; }
        .lp-summary-info { display: flex; flex-direction: column; gap: 1px; }
        .lp-summary-label { font-size: 12px; color: var(--text-secondary,#94a3b8); text-transform: uppercase; letter-spacing: 0.5px; }
        .lp-summary-status { font-size: 16px; font-weight: 700; }
        .lp-summary-bar-wrap { flex: 1; min-width: 140px; max-width: 200px; }
        .lp-summary-bar-label { font-size: 12px; color: var(--text-secondary,#94a3b8); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; display: flex; justify-content: space-between; }
        .lp-summary-bar-track { height: 4px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
        .lp-summary-bar-fill { height: 100%; border-radius: 4px; transition: width 0.8s ease; }
        .lp-summary-meta { display: flex; gap: 18px; margin-left: auto; }
        .lp-summary-meta-item { text-align: center; }
        .lp-summary-meta-value { font-size: 14px; font-weight: 700; }
        .lp-summary-meta-label { font-size: 11px; color: var(--text-secondary,#94a3b8); text-transform: uppercase; letter-spacing: 0.4px; margin-top: 1px; }
        @media (max-width: 700px) { .lp-summary-meta { margin-left: 0; width: 100%; justify-content: flex-start; } }

        .lp-timeline { display: flex; flex-direction: column; gap: 0; padding: 8px 0 4px; position: relative; }
        .lp-timeline-item { display: flex; gap: 18px; position: relative; padding-bottom: 0; }
        .lp-timeline-line { position: absolute; left: 17px; top: 38px; bottom: 0; width: 2px; }
        .lp-timeline-item:last-child .lp-timeline-line { display: none; }
        .lp-timeline-dot { position: relative; z-index: 1; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 0; }
        .lp-timeline-dot .mat-icon { font-size: 18px; }
        .lp-timeline-card { flex: 1; min-width: 0; background: var(--card-bg,#1a1f2e); border: 1px solid var(--border-color,#2a2f3e); border-radius: 12px; padding: 14px 18px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.12); transition: box-shadow 0.2s; }
        .lp-timeline-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.18); }
        .lp-timeline-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .lp-timeline-card-header .mat-icon { font-size: 16px; }
        .lp-timeline-card-title { font-size: 14px; font-weight: 700; }
        .lp-timeline-card-details { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 12px; color: var(--text-secondary,#94a3b8); margin-bottom: 6px; }
        .lp-timeline-card-details span { display: flex; align-items: center; gap: 4px; }
        .lp-timeline-card-details .mat-icon { font-size: 14px; color: var(--text-secondary,#94a3b8); }
        .lp-timeline-remark { font-size: 12px; color: var(--text-secondary,#94a3b8); white-space: pre-wrap; line-height: 1.5; background: rgba(0,0,0,0.12); padding: 8px 12px; border-radius: 8px; margin-top: 4px; }
        .lp-timeline-remark strong { color: var(--text-primary,#fff); }

        .lp-clarification { border-color: rgba(245,158,11,0.35); background: rgba(245,158,11,0.05); }
        .lp-clarification .lp-timeline-card-title { color: #f59e0b; }
        .lp-clarification .lp-timeline-card-header .mat-icon { color: #f59e0b; }

        .lp-approved { border-color: rgba(16,185,129,0.35); background: rgba(16,185,129,0.05); }
        .lp-approved .lp-timeline-card-title { color: #10b981; }
        .lp-approved .lp-timeline-card-header .mat-icon { color: #10b981; }

        .lp-rejected { border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.05); }
        .lp-rejected .lp-timeline-card-title { color: #ef4444; }
        .lp-rejected .lp-timeline-card-header .mat-icon { color: #ef4444; }

        .lp-activated { border-color: rgba(5,150,105,0.35); background: rgba(5,150,105,0.05); }
        .lp-activated .lp-timeline-card-title { color: #059669; }
        .lp-activated .lp-timeline-card-header .mat-icon { color: #059669; }

        .lp-empty { padding: 24px; text-align: center; color: var(--text-muted,#64748b); font-size: 13px; }

        .rs-summary { background: var(--card-bg,#1a1f2e); border: 1px solid var(--border-color,#2a2f3e); border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: box-shadow 0.2s; }
        .rs-summary:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
        .rs-summary-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid rgba(55,65,81,0.2); }
        .rs-summary-header-left { display: flex; flex-direction: column; gap: 1px; }
        .rs-summary-title { font-size: 12px; font-weight: 700; color: var(--text-secondary,#94a3b8); text-transform: uppercase; letter-spacing: 0.5px; }
        .rs-summary-loan-id { font-size: 12px; color: var(--text-secondary,#94a3b8); font-family: 'JetBrains Mono', monospace; }
        .rs-summary-header-right { display: flex; align-items: center; gap: 8px; }
        .rs-summary-badge { font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 20px; letter-spacing: 0.3px; text-transform: uppercase; }
        .rs-summary-body { padding: 14px 20px 18px; }

        .rs-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
        .rs-grid-item { background: rgba(0,0,0,0.08); border-radius: 8px; padding: 10px 12px; }
        .rs-grid-item-label { font-size: 12px; color: var(--text-secondary,#94a3b8); text-transform: uppercase; letter-spacing: 0.4px; }
        .rs-grid-item-value { font-size: 14px; font-weight: 700; color: var(--text-primary,#fff); margin-top: 2px; }
        .rs-grid-item-value.amount { color: var(--accent-color,#3b82f6); }

        .rs-repayment-box { background: rgba(59,130,246,0.04); border: 1px solid rgba(59,130,246,0.15); border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; }
        .rs-repayment-title { font-size: 12px; color: var(--text-secondary,#94a3b8); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 10px; display: flex; align-items: center; gap: 5px; }
        .rs-repayment-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; }
        .rs-repayment-label { font-size: 12px; color: var(--text-secondary,#94a3b8); display: flex; align-items: center; gap: 5px; }
        .rs-repayment-value { font-size: 14px; font-weight: 700; color: var(--text-primary,#fff); }
        .rs-repayment-value.emi { color: var(--accent-color,#3b82f6); font-size: 15px; }

        .rs-info-rows { display: flex; flex-direction: column; gap: 0; margin-bottom: 12px; }
        .rs-info-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid rgba(55,65,81,0.08); }
        .rs-info-row:last-child { border-bottom: none; }
        .rs-info-label { font-size: 12px; color: var(--text-secondary,#94a3b8); }
        .rs-info-value { font-size: 13px; font-weight: 600; color: var(--text-primary,#fff); }

        .rs-analytics { background: var(--card-bg,#1a1f2e); border: 1px solid var(--border-color,#2a2f3e); border-radius: 14px; padding: 18px 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: box-shadow 0.2s; }
        .rs-analytics:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
        .rs-analytics-title { font-size: 12px; font-weight: 700; color: var(--text-secondary,#94a3b8); text-transform: uppercase; letter-spacing: 0.5px; }
        .rs-analytics-sub { font-size: 12px; color: var(--text-secondary,#94a3b8); margin-top: 2px; margin-bottom: 14px; }

        .rs-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
        .rs-metric-card { background: rgba(0,0,0,0.08); border-radius: 10px; padding: 12px; text-align: center; transition: background 0.15s; }
        .rs-metric-card:hover { background: rgba(0,0,0,0.14); }
        .rs-metric-circle {
          width: 36px; height: 36px; border-radius: 50%; margin: 0 auto 6px; position: relative;
          display: flex; align-items: center; justify-content: center;
        }
        .rs-metric-circle svg { transform: rotate(-90deg); }
        .rs-metric-circle-text { position: absolute; font-size: 11px; font-weight: 800; }
        .rs-metric-icon { width: 36px; height: 36px; border-radius: 50%; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; }
        .rs-metric-icon .mat-icon { font-size: 18px; }
        .rs-metric-value { font-size: 16px; font-weight: 800; }
        .rs-metric-label { font-size: 11px; color: var(--text-secondary,#94a3b8); text-transform: uppercase; letter-spacing: 0.3px; margin-top: 2px; }

        .rs-insight { background: rgba(59,130,246,0.04); border: 1px solid rgba(59,130,246,0.12); border-radius: 10px; padding: 10px 14px; display: flex; align-items: flex-start; gap: 8px; }
        .rs-insight .mat-icon { font-size: 18px; color: #3b82f6; flex-shrink: 0; margin-top: 1px; }
        .rs-insight-text { font-size: 12px; color: var(--text-secondary,#94a3b8); line-height: 1.5; white-space: nowrap; }

        .as-main { margin-top: 20px; }
        .as-main .td-section-title { margin-bottom: 4px; }
        .as-main-sub { font-size: 15px; color: var(--text-secondary,#94a3b8); margin-bottom: 18px; }
        .as-card-wrap { background: var(--card-bg,#1a1f2e); border: 1px solid var(--border-color,#2a2f3e); border-radius: 14px; padding: 22px 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .as-section-header { font-size: 14px; font-weight: 700; color: var(--text-primary,#e2e8f0); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; display: flex; align-items: center; gap: 6px; }
        .as-section-header .mat-icon { font-size: 18px; color: var(--accent-color,#3b82f6); }
        .as-divider { height: 1px; background: rgba(55,65,81,0.2); margin: 20px 0 18px; }

        .as-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .as-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 900px) { .as-grid-4 { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .as-grid-4 { grid-template-columns: 1fr; } .as-grid-2 { grid-template-columns: 1fr; } }

        .as-info-card { background: rgba(0,0,0,0.06); border-radius: 8px; padding: 11px 13px; }
        .as-info-label { font-size: 12px; color: var(--text-secondary,#94a3b8); text-transform: uppercase; letter-spacing: 0.4px; }
        .as-info-value { font-size: 15px; font-weight: 700; color: var(--text-primary,#fff); margin-top: 3px; }
        .as-info-value.mono { font-family: 'JetBrains Mono', monospace; font-size: 13px; }
        .as-info-value.accent { color: var(--accent-color,#3b82f6); }

        .as-doc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        @media (max-width: 800px) { .as-doc-grid { grid-template-columns: 1fr; } }
        .as-doc-card { background: var(--card-bg,#1a1f2e); border: 1px solid var(--border-color,#2a2f3e); border-radius: 12px; overflow: hidden; transition: border-color 0.2s, box-shadow 0.2s; }
        .as-doc-card:hover { border-color: rgba(59,130,246,0.3); box-shadow: 0 2px 12px rgba(0,0,0,0.12); }
        .as-doc-thumb { width: 100%; height: 150px; object-fit: cover; cursor: pointer; display: block; border-bottom: 1px solid var(--border-color,#2a2f3e); }
        .as-doc-thumb-placeholder { width: 100%; height: 150px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.12); color: var(--text-muted,#64748b); flex-direction: column; gap: 6px; font-size: 13px; cursor: pointer; }
        .as-doc-thumb-placeholder .mat-icon { font-size: 32px; }
        .as-doc-body { padding: 11px 13px 13px; }
        .as-doc-name { font-size: 14px; font-weight: 600; color: var(--text-primary,#fff); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .as-doc-meta { font-size: 13px; color: var(--text-secondary,#94a3b8); margin-top: 3px; display: flex; gap: 12px; }
        .as-doc-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 9px; padding-top: 9px; border-top: 1px solid rgba(55,65,81,0.15); }
        .as-doc-badge { font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.3px; }
        .as-doc-view-btn { font-size: 11px; padding: 5px 11px; border-radius: 6px; border: 1px solid var(--border-color,#2a2f3e); background: transparent; color: var(--text-secondary,#94a3b8); cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.15s; }
        .as-doc-view-btn:hover { background: rgba(255,255,255,0.05); color: var(--text-primary,#fff); }
        .as-doc-view-btn .mat-icon { font-size: 14px; }

        .as-verify-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid rgba(55,65,81,0.06); }
        .as-verify-row:last-child { border-bottom: none; }
        .as-verify-label { font-size: 13px; color: var(--text-secondary,#94a3b8); }
        .as-verify-value { font-size: 14px; font-weight: 600; color: var(--text-primary,#fff); }
        .as-verify-value.accent { color: var(--accent-color,#3b82f6); }

        .as-clarify-alert { background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.25); border-radius: 10px; padding: 14px 16px; margin-top: 12px; }
        .as-clarify-alert-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .as-clarify-alert-header .mat-icon { color: #f59e0b; font-size: 18px; }
        .as-clarify-alert-title { font-size: 14px; font-weight: 700; color: #f59e0b; }
        .as-clarify-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: var(--text-secondary,#94a3b8); }
        .as-clarify-row strong { color: var(--text-primary,#fff); }
        .as-clarify-reason { background: rgba(0,0,0,0.15); padding: 9px 11px; border-radius: 6px; font-size: 13px; color: var(--text-secondary,#94a3b8); margin: 8px 0; white-space: pre-wrap; line-height: 1.4; }
        .as-action-area { margin-top: 14px; padding: 14px; border-radius: 10px; background: rgba(245,158,11,0.04); border: 1px dashed rgba(245,158,11,0.3); text-align: center; }
        .as-action-area-title { font-size: 13px; font-weight: 700; color: #f59e0b; margin-bottom: 4px; }
        .as-action-area-desc { font-size: 12px; color: var(--text-secondary,#94a3b8); margin-bottom: 10px; }

        .action-card { background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.3); border-radius: 12px; padding: 20px; }
        .action-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .action-card-header .mat-icon { color: #f59e0b; font-size: 22px; }
        .action-card-title { font-size: 14px; font-weight: 700; color: #f59e0b; }
        .action-detail { font-size: 12px; color: var(--text-secondary,#94a3b8); margin-bottom: 3px; }
        .action-detail strong { color: var(--text-primary,#fff); }
        .action-remark { background: rgba(0,0,0,0.2); padding: 10px 12px; border-radius: 8px; font-size: 13px; color: var(--text-primary,#fff); margin: 12px 0; white-space: pre-wrap; line-height: 1.5; }

        .app-summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 768px) { .app-summary-grid { grid-template-columns: 1fr; } }
        .img-viewer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 9999; display: flex; align-items: center; justify-content: center; }
        .img-viewer-wrap { position: relative; max-width: 94vw; max-height: 94vh; display: flex; flex-direction: column; }
        .img-viewer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 0 4px; }
        .img-viewer-header span { color: #fff; font-size: 14px; font-weight: 600; }
        .img-viewer-controls { display: flex; gap: 6px; align-items: center; }
        .img-viewer-controls .zoom-label { color: var(--text-muted); font-size: 11px; min-width: 32px; text-align: center; }
        .img-viewer-image-wrap {
          background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px; padding: 8px; display: flex; align-items: center; justify-content: center;
          max-width: 100%; max-height: calc(94vh - 56px); overflow: hidden;
        }
        .img-viewer-img { max-width: 100%; max-height: calc(94vh - 80px); border-radius: 6px; object-fit: contain; transition: transform 0.2s; display: block; }
        .img-viewer-wrap:fullscreen { max-width: 100vw; max-height: 100vh; background: #000; padding: 20px; }
        .img-viewer-wrap:fullscreen .img-viewer-image-wrap { max-height: calc(100vh - 80px); border: 1px solid rgba(255,255,255,0.2); }

        .as-doc-label-header {
          font-size: 14px; font-weight: 700; color: #fff;
          text-transform: uppercase; letter-spacing: 0.4px;
          padding: 0 0 8px;
        }
        .delete-confirm-modal {
          background: #151a22; border: 1px solid rgba(239,68,68,0.25);
          border-radius: 14px; padding: 24px; max-width: 400px; width: 90%;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .delete-confirm-header {
          display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
        }
        .delete-confirm-header h3 { margin: 0; font-size: 16px; color: #fff; }
        .delete-confirm-body {
          font-size: 13px; color: var(--text-secondary,#94a3b8);
          line-height: 1.5; margin: 0 0 20px;
        }
        .delete-confirm-actions {
          display: flex; justify-content: flex-end; gap: 10px;
        }
      `}</style>

      <div className="page-header">
        <div>
          <div className="page-title">Loan Tracking</div>
          <div className="page-subtitle">Application <span className="mono">{app.application_number}</span></div>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          {app.status === 'draft' && (
            <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
              <span className="material-symbols-rounded">delete</span> Delete Draft
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => navigate('/user/loan/tracking')}>
            <span className="material-symbols-rounded">arrow_back</span> Back
          </button>
        </div>
      </div>

      {respondMsg === 'success' && (
        <div className="flash-message flash-success" style={{ marginBottom:'16px' }}>
          <span className="material-symbols-rounded" style={{ verticalAlign:'middle', marginRight:'6px' }}>check_circle</span>
          Response submitted successfully. Application returned to the review queue.
        </div>
      )}
      {respondError && (
        <div className="flash-message flash-danger" style={{ marginBottom:'16px' }}>
          <span className="material-symbols-rounded" style={{ verticalAlign:'middle', marginRight:'6px' }}>error</span>
          {respondError}
        </div>
      )}

      {/* TOP HEADER BANNER */}
      <div className="td-header">
        <div className="td-header-accent" style={{ background: statusColor }} />
        <div className="td-header-body">
          <div className="td-header-left">
            <div className="td-header-icon" style={{ background: `${statusColor}18`, color: statusColor }}>
              <span className="material-symbols-rounded mat-icon">account_balance</span>
            </div>
            <div className="td-header-info">
              <span className="td-header-loan-id">{app.application_number}</span>
              <span className="td-header-loan-type">{app.loan_type}</span>
            </div>
          </div>
          <div className="td-header-center">
            <div className="td-header-amount-label">Requested Amount</div>
            <div className="td-header-amount">{formatCurrency(app.amount)}</div>
          </div>
          <div className="td-header-right">
            <span className="td-header-badge" style={{ background: `${statusColor}18`, color: statusColor }}>
              <span className="material-symbols-rounded" style={{ fontSize:'14px' }}>circle</span>
              {statusLabel}
            </span>
            <span className="td-header-date">Applied <strong>{formatDate(app.submitted_at)}</strong></span>
          </div>
        </div>
        <div className="td-header-progress-section">
          <div className="td-progress-label">
            <span>Loan Progress</span>
            <span>{progressPct}%</span>
          </div>
          <div className="td-progress-bar-wrap">
            <div className="td-progress-bar-fill" style={{ width:`${progressPct}%`, background: app.status === 'rejected' ? '#ef4444' : statusColor }} />
          </div>
          <div className="td-progress-stats">
            <span>{completedSteps} of {totalSteps} steps completed</span>
            <span>{daysApplied} day{daysApplied !== 1 ? 's' : ''} since application</span>
          </div>
        </div>
      </div>

      {/* MAIN 65/35 LAYOUT */}
      <div className="td-layout">
        {/* LEFT */}
        <div className="td-left">
          {/* LOAN PROGRESS */}
          <div className="card">
            <div className="td-section-title">
              <span className="material-symbols-rounded mat-icon">track_changes</span>
              Loan Progress
            </div>
            <div className="as-main-sub" style={{margin:'-8px 0 14px'}}>Track the complete lifecycle of your loan application.</div>

            {/* Status Summary */}
            <div className="lp-summary">
              <div className="lp-summary-left">
                <div className="lp-summary-icon" style={{background:`${statusColor}18`,color:statusColor}}>
                  <span className="material-symbols-rounded mat-icon">info</span>
                </div>
                <div className="lp-summary-info">
                  <span className="lp-summary-label">Current Status</span>
                  <span className="lp-summary-status" style={{color:statusColor}}>{statusLabel}</span>
                </div>
              </div>
              <div className="lp-summary-bar-wrap">
                <div className="lp-summary-bar-label">
                  <span>Progress</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="lp-summary-bar-track">
                  <div className="lp-summary-bar-fill" style={{width:`${progressPct}%`,background:app.status==='rejected'?'#ef4444':statusColor}} />
                </div>
              </div>
              <div className="lp-summary-meta">
                <div className="lp-summary-meta-item">
                  <div className="lp-summary-meta-value" style={{color:statusColor}}>{formatDate(app.submitted_at)}</div>
                  <div className="lp-summary-meta-label">Submitted</div>
                </div>
                <div className="lp-summary-meta-item">
                  <div className="lp-summary-meta-value">{daysApplied}d</div>
                  <div className="lp-summary-meta-label">Elapsed</div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="lp-timeline">
              {sortedHistory.length > 0 ? sortedHistory.map((h, i) => {
                const color = TIMELINE_COLORS[h.new_status] || '#6b7280'
                const icon = TIMELINE_ICONS[h.new_status] || 'circle'
                const isClarification = h.new_status === 'clarification_required'
                const isApproved = h.new_status === 'approved'
                const isRejected = h.new_status === 'rejected'
                const isActivated = h.new_status === 'disbursed'
                let cardClass = 'lp-timeline-card'
                if (isClarification) cardClass += ' lp-clarification'
                else if (isApproved) cardClass += ' lp-approved'
                else if (isRejected) cardClass += ' lp-rejected'
                else if (isActivated) cardClass += ' lp-activated'
                const isLast = i === sortedHistory.length - 1
                return (
                  <div key={h.id || i} className="lp-timeline-item">
                    <div className="lp-timeline-dot" style={{background:`${color}1a`,color,border:`2px solid ${color}`}}>
                      <span className="material-symbols-rounded mat-icon">{icon}</span>
                    </div>
                    {!isLast && <div className="lp-timeline-line" style={{background:color}} />}
                    <div className={cardClass}>
                      <div className="lp-timeline-card-header">
                        <span className="material-symbols-rounded mat-icon">{icon}</span>
                        <span className="lp-timeline-card-title">{STATUS_LABELS[h.new_status] || h.new_status.replace(/_/g,' ')}</span>
                      </div>
                      <div className="lp-timeline-card-details">
                        <span>
                          <span className="material-symbols-rounded mat-icon">calendar_today</span>
                          {formatDate(h.changed_at)}
                        </span>
                        <span>
                          <span className="material-symbols-rounded mat-icon">schedule</span>
                          {formatTime(h.changed_at)}
                        </span>
                        {h.changed_by && (
                          <span>
                            <span className="material-symbols-rounded mat-icon">person</span>
                            {h.changed_by_role ? `${h.changed_by_role}` : h.changed_by}
                          </span>
                        )}
                      </div>
                      {h.remarks && <div className="lp-timeline-remark">{h.remarks}</div>}
                    </div>
                  </div>
                )
              }) : (
                <div className="lp-empty">
                  <span className="material-symbols-rounded" style={{fontSize:'32px',display:'block',marginBottom:'8px'}}>timeline</span>
                  No activity recorded yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="td-right">
          {/* LOAN SUMMARY */}
          <div className="rs-summary">
            <div className="rs-summary-header">
              <div className="rs-summary-header-left">
                <span className="rs-summary-title">Loan Summary</span>
                <span className="rs-summary-loan-id">{app.application_number}</span>
              </div>
              <div className="rs-summary-header-right">
                <span className="rs-summary-badge" style={{background:`${statusColor}18`,color:statusColor}}>{statusLabel}</span>
              </div>
            </div>
            <div className="rs-summary-body">
              <div className="rs-grid-2">
                <div className="rs-grid-item">
                  <div className="rs-grid-item-label">Loan Type</div>
                  <div className="rs-grid-item-value">{app.loan_type}</div>
                </div>
                <div className="rs-grid-item">
                  <div className="rs-grid-item-label">Loan Amount</div>
                  <div className="rs-grid-item-value amount">{formatCurrency(app.amount)}</div>
                </div>
                <div className="rs-grid-item">
                  <div className="rs-grid-item-label">Duration</div>
                  <div className="rs-grid-item-value">{app.duration_months} Months</div>
                </div>
                <div className="rs-grid-item">
                  <div className="rs-grid-item-label">Interest Rate</div>
                  <div className="rs-grid-item-value">{app.interest_rate}%</div>
                </div>
                <div className="rs-grid-item">
                  <div className="rs-grid-item-label">Collateral Type</div>
                  <div className="rs-grid-item-value">{app.collateral_type || 'N/A'}</div>
                </div>
                <div className="rs-grid-item">
                  <div className="rs-grid-item-label">Purpose</div>
                  <div className="rs-grid-item-value">{app.purpose || '—'}</div>
                </div>
              </div>

              <div className="rs-repayment-box">
                <div className="rs-repayment-title">
                  <span className="material-symbols-rounded" style={{fontSize:'14px'}}>payments</span>
                  Repayment Summary
                </div>
                <div className="rs-repayment-row">
                  <span className="rs-repayment-label">
                    <span className="material-symbols-rounded" style={{fontSize:'13px'}}>calendar_month</span>
                    Monthly EMI
                  </span>
                  <span className="rs-repayment-value emi">{formatCurrency(emi)}</span>
                </div>
                <div className="rs-repayment-row">
                  <span className="rs-repayment-label">
                    <span className="material-symbols-rounded" style={{fontSize:'13px'}}>account_balance</span>
                    Total Repayment
                  </span>
                  <span className="rs-repayment-value">{formatCurrency(totalRepayment)}</span>
                </div>
                <div className="rs-repayment-row">
                  <span className="rs-repayment-label">
                    <span className="material-symbols-rounded" style={{fontSize:'13px'}}>receipt_long</span>
                    Processing Fee
                  </span>
                  <span className="rs-repayment-value">{formatCurrency(processingFee)}</span>
                </div>
              </div>

              <div className="rs-info-rows">
                <div className="rs-info-row">
                  <span className="rs-info-label">Applied Date</span>
                  <span className="rs-info-value">{formatDate(app.submitted_at)}</span>
                </div>
                <div className="rs-info-row">
                  <span className="rs-info-label">Expected Decision</span>
                  <span className="rs-info-value">{formatDate(app.updated_at || app.submitted_at)}</span>
                </div>
                {app.assigned_staff_name && (
                  <div className="rs-info-row">
                    <span className="rs-info-label">Assigned Staff</span>
                    <span className="rs-info-value">{app.assigned_staff_name}</span>
                  </div>
                )}
                <div className="rs-info-row">
                  <span className="rs-info-label">Current Stage</span>
                  <span className="rs-info-value" style={{color:statusColor}}>{statusLabel}</span>
                </div>
              </div>

            </div>
          </div>

          {/* LOAN ANALYTICS */}
          <div className="rs-analytics">
            <div className="rs-analytics-title">Loan Analytics</div>
            <div className="rs-analytics-sub">Real-time application insights</div>

            <div className="rs-metrics">
              <div className="rs-metric-card">
                <div className="rs-metric-circle" style={{background:`${statusColor}18`}}>
                  <svg width="36" height="36" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke={statusColor} strokeWidth="3"
                      strokeDasharray={`${2 * Math.PI * 14}`} strokeDashoffset={`${2 * Math.PI * 14 * (1 - progressPct / 100)}`}
                      strokeLinecap="round" />
                  </svg>
                  <span className="rs-metric-circle-text" style={{color:statusColor}}>{progressPct}%</span>
                </div>
                <div className="rs-metric-value" style={{color:statusColor}}>{progressPct}%</div>
                <div className="rs-metric-label">Progress Completion</div>
              </div>
              <div className="rs-metric-card">
                <div className="rs-metric-icon" style={{background:'rgba(59,130,246,0.12)',color:'#3b82f6'}}>
                  <span className="material-symbols-rounded mat-icon">calendar_today</span>
                </div>
                <div className="rs-metric-value" style={{color:'#3b82f6'}}>{daysApplied}d</div>
                <div className="rs-metric-label">Days Since Applied</div>
              </div>
              <div className="rs-metric-card">
                <div className="rs-metric-icon" style={{background:`${statusColor}12`,color:statusColor}}>
                  <span className="material-symbols-rounded mat-icon">flag</span>
                </div>
                <div className="rs-metric-value" style={{color:statusColor,fontSize:'13px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{statusLabel}</div>
                <div className="rs-metric-label">Current Stage</div>
              </div>
              <div className="rs-metric-card">
                <div className="rs-metric-icon" style={{background:'rgba(245,158,11,0.12)',color:'#f59e0b'}}>
                  <span className="material-symbols-rounded mat-icon">hourglass_bottom</span>
                </div>
                <div className="rs-metric-value" style={{color:'#f59e0b'}}>{remainingDays}d</div>
                <div className="rs-metric-label">Est. Remaining</div>
              </div>
            </div>

            <div className="rs-insight">
              <span className="material-symbols-rounded mat-icon">lightbulb</span>
              <span className="rs-insight-text">{insightMsg}</span>
            </div>
          </div>

          {/* REQUIRED ACTIONS */}
          {app.status === 'clarification_required' && (
            <div className="action-card">
              <div className="action-card-header">
                <span className="material-symbols-rounded mat-icon">warning</span>
                <span className="action-card-title">Action Required</span>
              </div>
              {latestClarification?.reason && <div className="action-detail">Document: <strong>{latestClarification.reason}</strong></div>}
              {latestClarification?.request_by && <div className="action-detail">Requested By: <strong>{latestClarification.request_by}</strong></div>}
              {sortedHistory.find(h => h.new_status === 'clarification_required')?.changed_at && (
                <div className="action-detail">Date: <strong>{formatDate(sortedHistory.find(h => h.new_status === 'clarification_required').changed_at)}</strong></div>
              )}
              <div className="action-remark">{clarifyingRemark || 'Additional information is required to process your application.'}</div>
              <div style={{display:'flex',gap:'10px',marginTop:'16px'}}>
                <button className="btn btn-warning" style={{flex:1,background:'#f59e0b',color:'#000',border:'none'}} onClick={handleEditAndResubmit} disabled={respondLoading}>
                  <span className="material-symbols-rounded" style={{fontSize:'16px'}}>edit</span> Edit &amp; Re-submit
                </button>
                <button className="btn btn-success" style={{flex:1}} onClick={handleRespondClarification} disabled={respondLoading}>
                  <span className="material-symbols-rounded" style={{fontSize:'16px'}}>{respondLoading?'sync':'send'}</span>
                  {respondLoading?'...':'Resubmit'}
                </button>
              </div>
            </div>
          )}

          {/* Scheduled Visit */}
          {app.appointment_date && (
            <div className="summary-card">
              <div className="summary-title">Scheduled Visit</div>
              <div className="summary-row">
                <span className="summary-label">Date</span>
                <span className="summary-value">{formatDate(app.appointment_date)}</span>
              </div>
              {app.appointment_time && <div className="summary-row"><span className="summary-label">Time</span><span className="summary-value">{app.appointment_time}</span></div>}
            </div>
          )}
        </div>
      </div>

      {/* APPLICATION SUMMARY */}
      <div className="as-main">
        <div className="td-section-title">
          <span className="material-symbols-rounded mat-icon">description</span>
          Application Summary
        </div>
        <div className="as-main-sub">Review all information and documents submitted with this loan application.</div>

        <div className="as-card-wrap">
          {/* LOAN INFORMATION */}
          <div className="as-section-header">
            <span className="material-symbols-rounded mat-icon">account_balance</span>
            Loan Information
          </div>
          <div className="as-grid-4">
            <div className="as-info-card">
              <div className="as-info-label">Loan ID</div>
              <div className="as-info-value mono">{app.application_number}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Loan Type</div>
              <div className="as-info-value">{app.loan_type}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Loan Amount</div>
              <div className="as-info-value accent">{formatCurrency(app.amount)}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Duration</div>
              <div className="as-info-value">{app.duration_months} Months</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Interest Rate</div>
              <div className="as-info-value">{app.interest_rate}%</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Collateral Type</div>
              <div className="as-info-value">{app.collateral_type || 'N/A'}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Purpose</div>
              <div className="as-info-value">{app.purpose || '—'}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Est. EMI</div>
              <div className="as-info-value accent">{formatCurrency(emi)}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Application Date</div>
              <div className="as-info-value">{formatDate(app.submitted_at)}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Status</div>
              <div className="as-info-value" style={{color:statusColor}}>{statusLabel}</div>
            </div>
          </div>

          <div className="as-divider" />

          {/* APPLICANT INFORMATION */}
          <div className="as-section-header">
            <span className="material-symbols-rounded mat-icon">person</span>
            Applicant Information
          </div>
          <div className="as-grid-4">

            <div style={{gridColumn:'span 4', fontSize:'12px', fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.5px', padding:'8px 0 2px'}}>Personal Information</div>

            <div className="as-info-card">
              <div className="as-info-label">Full Name</div>
              <div className="as-info-value">{customer.full_name || app.customer_name || '\u2014'}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Father Name</div>
              <div className="as-info-value">{customer.father_name || '\u2014'}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Grandfather Name</div>
              <div className="as-info-value">{customer.grandfather_name || '\u2014'}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Date of Birth</div>
              <div className="as-info-value">{customer.dob ? formatDate(customer.dob) : '\u2014'}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Gender</div>
              <div className="as-info-value">{customer.gender || '\u2014'}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Citizenship Number</div>
              <div className="as-info-value mono">{customer.citizenship_id || '\u2014'}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Citizenship Issue District</div>
              <div className="as-info-value">{customer.citizenship_issue_district || '\u2014'}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Marital Status</div>
              <div className="as-info-value">{customer.marital_status || '\u2014'}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Occupation</div>
              <div className="as-info-value">{customer.occupation || '\u2014'}</div>
            </div>

            <div style={{gridColumn:'span 4', fontSize:'12px', fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.5px', padding:'16px 0 2px'}}>Contact Information</div>

            <div className="as-info-card">
              <div className="as-info-label">Mobile Number</div>
              <div className="as-info-value">{customer.phone_number || '\u2014'}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Alternate Mobile</div>
              <div className="as-info-value">{customer.alternate_mobile || '\u2014'}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Email</div>
              <div className="as-info-value">{customer.email || '\u2014'}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Permanent Address</div>
              <div className="as-info-value">{customer.permanent_address || customer.address || '\u2014'}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Account Number</div>
              <div className="as-info-value mono">{accounts.length > 0 ? accounts[0].account_number : '\u2014'}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Current Address</div>
              <div className="as-info-value">{customer.temporary_address || '\u2014'}</div>
            </div>

            <div style={{gridColumn:'span 4', fontSize:'12px', fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.5px', padding:'16px 0 2px'}}>Nominee Information</div>

            <div className="as-info-card">
              <div className="as-info-label">Nominee Name</div>
              <div className="as-info-value">{customer.nominee_name || '\u2014'}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Nominee Contact</div>
              <div className="as-info-value">{customer.nominee_contact || '\u2014'}</div>
            </div>
            <div className="as-info-card">
              <div className="as-info-label">Nominee Relationship</div>
              <div className="as-info-value">{customer.nominee_relationship || '\u2014'}</div>
            </div>

          </div>

          <div className="as-divider" />

          {/* UPLOADED DOCUMENTS */}
          <div className="as-section-header">
            <span className="material-symbols-rounded mat-icon">folder_open</span>
            Uploaded Documents
          </div>
          {docs.length > 0 ? (
            <div className="as-doc-grid">
              {[
                { key:'citizenship', label:'Citizenship / National ID' },
                { key:'income_proof', label:'Income Proof' },
                { key:'collateral', label:'Collateral Document' }
              ].map(({ key, label }) => {
                const doc = docs.find(d => d.document_type === key)
                const docStatus = doc ? (app.status === 'rejected' ? 'Rejected' : isVerified ? 'Verified' : app.status === 'clarification_required' ? 'Clarification Required' : 'Pending Review') : 'Not Uploaded'
                const docStatusColor = docStatus === 'Verified' ? '#10b981' : docStatus === 'Clarification Required' ? '#f59e0b' : docStatus === 'Rejected' ? '#ef4444' : docStatus === 'Pending Review' ? '#3b82f6' : '#64748b'
                return (
                  <div key={key}>
                    <div className="as-doc-label-header">{label}</div>
                    <div className="as-doc-card">
                    {doc ? (
                      <>
                        <img src={`/${doc.file_url}`} alt={doc.file_name} className="as-doc-thumb"
                          onClick={() => { setZoomDoc(doc); setZoomLevel(1) }}
                          onError={e => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex' }} />
                        <div className="as-doc-thumb-placeholder" style={{display:'none'}}>
                          <span className="material-symbols-rounded mat-icon">description</span>
                          <span>{doc.file_name}</span>
                        </div>
                      </>
                    ) : (
                      <div className="as-doc-thumb-placeholder">
                        <span className="material-symbols-rounded mat-icon">add_circle</span>
                        <span>Not uploaded</span>
                      </div>
                    )}
                    <div className="as-doc-body">
                      <div className="as-doc-name" title={doc?.file_name || label}>{doc ? doc.file_name : label}</div>
                      <div className="as-doc-meta">
                        {doc && doc.uploaded_at && <span>Uploaded: {formatDate(doc.uploaded_at)}</span>}
                        {doc && doc.file_size && <span>{(doc.file_size / 1024).toFixed(0)} KB</span>}
                      </div>
                      <div className="as-doc-actions">
                        <span className="as-doc-badge" style={{background:`${docStatusColor}18`,color:docStatusColor}}>{docStatus}</span>
                        {doc && (
                          <button className="as-doc-view-btn" onClick={() => { setZoomDoc(doc); setZoomLevel(1) }}>
                            <span className="material-symbols-rounded mat-icon">visibility</span>
                            View
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                    </div>
                )
              })}
            </div>
          ) : (
            <div className="empty" style={{padding:'20px'}}><span className="material-symbols-rounded">description</span><div>No documents uploaded</div></div>
          )}

        </div>
      </div>

      {/* FULL IMAGE VIEWER */}
      {zoomDoc && (
        <div className="img-viewer-overlay" onClick={() => setZoomDoc(null)}>
          <div className="img-viewer-wrap" onClick={e => e.stopPropagation()}>
            <div className="img-viewer-header">
              <span>{zoomDoc.file_name}</span>
              <div className="img-viewer-controls">
                <button className="btn btn-sm btn-secondary" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}>
                  <span className="material-symbols-rounded" style={{fontSize:'16px'}}>zoom_out</span>
                </button>
                <span className="zoom-label">{Math.round(zoomLevel * 100)}%</span>
                <button className="btn btn-sm btn-secondary" onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}>
                  <span className="material-symbols-rounded" style={{fontSize:'16px'}}>zoom_in</span>
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => setZoomLevel(1)}>
                  <span className="material-symbols-rounded" style={{fontSize:'16px'}}>fit_screen</span>
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => { const el = document.querySelector('.img-viewer-wrap'); if (el) { if (!document.fullscreenElement) { el.requestFullscreen?.() } else { document.exitFullscreen?.() } } }}>
                  <span className="material-symbols-rounded" style={{fontSize:'16px'}}>{document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen'}</span>
                </button>
                <a href={`/${zoomDoc.file_url}`} download className="btn btn-sm btn-secondary" style={{textDecoration:'none'}}>
                  <span className="material-symbols-rounded" style={{fontSize:'16px'}}>download</span>
                </a>
                <button className="btn btn-sm btn-secondary" onClick={() => setZoomDoc(null)}>
                  <span className="material-symbols-rounded" style={{fontSize:'16px'}}>close</span>
                </button>
              </div>
            </div>
            <div className="img-viewer-image-wrap">
              <img src={`/${zoomDoc.file_url}`} alt={zoomDoc.file_name} className="img-viewer-img" style={{transform:`scale(${zoomLevel})`}}
                onError={e => { e.target.style.display='none' }} />
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="img-viewer-overlay" onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-confirm-header">
              <span className="material-symbols-rounded" style={{color:'#ef4444',fontSize:'28px'}}>warning</span>
              <h3>Delete Draft Application</h3>
            </div>
            <p className="delete-confirm-body">
              This will permanently delete this draft application and all uploaded documents.
              This action cannot be undone.
            </p>
            <div className="delete-confirm-actions">
              <button className="btn btn-secondary" disabled={deleting} onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" disabled={deleting} onClick={handleDeleteDraft}>
                <span className="material-symbols-rounded" style={{fontSize:'16px'}}>{deleting ? 'sync' : 'delete'}</span>
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
