import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminGetLoanApplication, adminApproveLoan, adminRejectLoan, adminReturnToStaff } from '../../services/loanApplicationService'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/helpers'

const DOC_LABELS = {
  citizenship: 'Citizenship / National ID',
  income_proof: 'Income Proof / Salary Slip',
  collateral: 'Collateral Document'
}

const TIMELINE_STEPS = [
  { key: 'submitted', label: 'Application Submitted' },
  { key: 'under_review', label: 'Staff Review' },
  { key: 'documents_verified', label: 'Documents Verified' },
  { key: 'visit_scheduled', label: 'Branch Visit Scheduled' },
  { key: 'final_review', label: 'Forwarded to Admin' },
  { key: 'decision', label: 'Admin Decision' }
]

const STATUS_BADGE = {
  submitted: 'badge-info', under_review: 'badge-info',
  clarification_required: 'badge-warning', documents_verified: 'badge-success',
  visit_scheduled: 'badge-info', final_review: 'badge-warning',
  approved: 'badge-success', rejected: 'badge-danger',
  disbursed: 'badge-success', draft: 'badge-muted'
}

const STATUS_LABEL = {
  submitted: 'Submitted', under_review: 'Staff Review',
  clarification_required: 'Clarification Required', documents_verified: 'Documents Verified',
  visit_scheduled: 'Visit Scheduled', final_review: 'Admin Review',
  approved: 'Approved', rejected: 'Rejected',
  disbursed: 'Disbursed', draft: 'Draft'
}

const TIMELINE_COLORS = {
  draft:'#6b7280', submitted:'#3b82f6', under_review:'#8b5cf6',
  clarification_required:'#f59e0b', documents_verified:'#10b981',
  visit_scheduled:'#6366f1', final_review:'#8b5cf6',
  approved:'#10b981', rejected:'#ef4444', disbursed:'#059669'
}

const TIMELINE_ICONS = {
  draft:'edit_note', submitted:'how_to_reg', under_review:'manage_search',
  clarification_required:'feedback', documents_verified:'verified',
  visit_scheduled:'event', final_review:'fact_check',
  approved:'check_circle', rejected:'cancel', disbursed:'account_balance'
}

const STATUS_ROLE = {
  submitted:'User', under_review:'Staff', clarification_required:'Staff',
  documents_verified:'Staff', visit_scheduled:'Staff',
  final_review:'Admin', approved:'Admin', rejected:'Admin', disbursed:'Admin'
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  try { return new Date(dateStr).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true }) }
  catch (_) { return '' }
}

function buildTimeline(statusHistory, app) {
  const history = [...statusHistory].sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at))
  const statuses = new Set(history.map(h => h.new_status))
  const order = ['submitted','under_review','clarification_required','documents_verified','visit_scheduled','final_review','approved','rejected','disbursed']

  if (statuses.has('documents_verified') && !statuses.has('under_review')) {
    const submitted = history.find(h => h.new_status === 'submitted')
    if (submitted) {
      const t = new Date(new Date(submitted.changed_at).getTime() + 60000)
      history.push({
        id: 'syn_ur', new_status: 'under_review', changed_at: t.toISOString(),
        changed_by: 'Staff', changed_by_role: 'Staff',
        remarks: 'Initial application review completed.', synthetic: true
      })
    }
  }

  if (statuses.has('visit_scheduled') && !statuses.has('final_review')) {
    const laterExists = history.some(h => order.indexOf(h.new_status) > order.indexOf('visit_scheduled'))
    if (laterExists) {
      const visit = history.find(h => h.new_status === 'visit_scheduled')
      if (visit) {
        const t = new Date(new Date(visit.changed_at).getTime() + 60000)
        history.push({
        id: 'syn_fr', new_status: 'final_review', changed_at: t.toISOString(),
        changed_by: 'Admin', changed_by_role: 'Admin',
          remarks: 'Application forwarded for final admin review.', synthetic: true
        })
      }
    }
  }

  return history.sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at))
}

export default function AdminLoanReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [action, setAction] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [zoomDoc, setZoomDoc] = useState(null)
  const [expandedSection, setExpandedSection] = useState(null)

  const fetchApp = useCallback(() => {
    setLoading(true)
    adminGetLoanApplication(id)
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchApp() }, [fetchApp])

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type: '', text: '' }), 5000) }

  const handleApprove = async () => {
    setProcessing(true)
    try { const res = await adminApproveLoan(id); setData(res.data); showMsg('success', 'Loan approved and disbursed successfully!'); setAction(null) }
    catch (e) { showMsg('danger', e.response?.data?.error || 'Approval failed') }
    finally { setProcessing(false) }
  }

  const handleReject = async () => {
    if (!remarks.trim()) { showMsg('danger', 'Rejection reason is mandatory'); return }
    setProcessing(true)
    try { const res = await adminRejectLoan(id, { reason: remarks }); setData(res.data); showMsg('success', 'Loan rejected'); setAction(null); setRemarks('') }
    catch (e) { showMsg('danger', e.response?.data?.error || 'Failed') }
    finally { setProcessing(false) }
  }

  const handleReturnToStaff = async () => {
    setProcessing(true)
    try { const res = await adminReturnToStaff(id, { reason: remarks }); setData(res.data); showMsg('success', 'Returned to staff for re-review'); setAction(null); setRemarks('') }
    catch (e) { showMsg('danger', e.response?.data?.error || 'Failed') }
    finally { setProcessing(false) }
  }

  if (loading) return <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /></div>
  if (!data) return <div className="empty"><span className="material-symbols-rounded">search_off</span><div>Application not found</div></div>

  const app = data.application || data
  const customer = data.customer || {}
  const profile = {
    full_name: customer.full_name || app.customer_name,
    father_name: customer.father_name || app.father_name,
    grandfather_name: customer.grandfather_name || app.grandfather_name,
    dob: customer.dob || app.dob,
    gender: customer.gender || app.gender,
    citizenship_id: customer.citizenship_id || app.citizenship_number,
    citizenship_issue_district: customer.citizenship_issue_district || app.citizenship_issue_district,
    marital_status: customer.marital_status || app.marital_status,
    occupation: customer.occupation || app.occupation,
    phone_number: customer.phone_number || app.customer_phone,
    alternate_mobile: customer.alternate_mobile || app.alternate_mobile,
    email: customer.email || app.customer_email,
    address: customer.address || app.customer_address,
    temporary_address: customer.temporary_address || app.current_address,
    nominee_name: customer.nominee_name || app.nominee_name,
    nominee_relationship: customer.nominee_relationship || app.nominee_relationship,
    nominee_contact: customer.nominee_contact || app.nominee_contact,
  }
  const accountsList = data.accounts || []
  const riskLevel = app.amount > 1000000 ? 'high' : app.amount > 500000 ? 'medium' : 'low'
  const existingLoans = (data.existing_loans || []).filter(l => l.status === 'approved')
  const totalExistingDebt = existingLoans.reduce((s, l) => s + l.amount, 0)
  const monthlyIncome = customer.occupation === 'Business' ? 100000 : customer.occupation === 'Government' ? 80000 : 50000
  const dti = monthlyIncome > 0 ? Math.round(((parseFloat(app.emi || 0) + (totalExistingDebt > 0 ? totalExistingDebt * 0.01 : 0)) / monthlyIncome) * 100) : 0

  const statusHistory = app.status_history || []
  const sortedHistory = buildTimeline(statusHistory, app)
  const statusSet = new Set(statusHistory.map(h => h.new_status))

  const toggleSection = (key) => setExpandedSection(prev => prev === key ? null : key)

  return (
    <>
      <style>{`
        .lrr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .lrr-info-card { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 20px; }
        .lrr-info-card-title { font-size: 13px; font-weight: 800; color: #d4dbe5; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .lrr-info-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-color); gap: 12px; }
        .lrr-info-row:last-child { border-bottom: none; }
        .lrr-info-label { font-size: 13px; font-weight: 600; color: #b4c2d0; display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .lrr-info-value { font-size: 13px; color: var(--text-primary); font-weight: 600; text-align: right; }
        .lrr-docs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .lrr-doc-card { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--border-radius); overflow: hidden; }
        .lrr-doc-preview { height: 160px; background: var(--bg-primary); display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; position: relative; }
        .lrr-doc-preview img { width: 100%; height: 100%; object-fit: cover; }
        .lrr-doc-preview .fallback { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #b4c2d0; }
        .lrr-doc-body { padding: 12px 14px; }
        .lrr-doc-name { font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 4px; }
        .lrr-doc-meta { font-size: 12px; font-weight: 500; color: #b4c2d0; }
        .lrr-doc-actions { display: flex; gap: 6px; margin-top: 10px; }
        .lrr-doc-missing { height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #b4c2d0; background: var(--bg-secondary); }
        .lrr-timeline { display: flex; flex-direction: column; gap: 0; padding: 8px 0 4px; position: relative; }
        .lrr-tl-item { display: flex; gap: 18px; position: relative; padding-bottom: 0; }
        .lrr-tl-line { position: absolute; left: 17px; top: 38px; bottom: 0; width: 2px; }
        .lrr-tl-item:last-child .lrr-tl-line { display: none; }
        .lrr-tl-dot { position: relative; z-index: 1; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 0; }
        .lrr-tl-dot .mat-icon { font-size: 18px; }
        .lrr-tl-card { flex: 1; min-width: 0; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px 18px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.12); transition: box-shadow 0.2s; }
        .lrr-tl-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.18); }
        .lrr-tl-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .lrr-tl-card-header .mat-icon { font-size: 16px; }
        .lrr-tl-card-title { font-size: 14px; font-weight: 700; }
        .lrr-tl-card-details { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 12px; font-weight: 500; color: #c8d4e0; margin-bottom: 6px; }
        .lrr-tl-card-details span { display: flex; align-items: center; gap: 4px; }
        .lrr-tl-card-details .mat-icon { font-size: 14px; color: #b4c2d0; }
        .lrr-tl-remark { font-size: 12px; font-weight: 500; color: #c8d4e0; white-space: pre-wrap; line-height: 1.5; background: rgba(0,0,0,0.12); padding: 8px 12px; border-radius: 8px; margin-top: 4px; }
        .lrr-tl-clarification { border-color: rgba(245,158,11,0.35); background: rgba(245,158,11,0.05); }
        .lrr-tl-clarification .lrr-tl-card-title { color: #f59e0b; }
        .lrr-tl-clarification .lrr-tl-card-header .mat-icon { color: #f59e0b; }
        .lrr-tl-approved { border-color: rgba(16,185,129,0.35); background: rgba(16,185,129,0.05); }
        .lrr-tl-approved .lrr-tl-card-title { color: #10b981; }
        .lrr-tl-approved .lrr-tl-card-header .mat-icon { color: #10b981; }
        .lrr-tl-rejected { border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.05); }
        .lrr-tl-rejected .lrr-tl-card-title { color: #ef4444; }
        .lrr-tl-rejected .lrr-tl-card-header .mat-icon { color: #ef4444; }
        .lrr-tl-activated { border-color: rgba(5,150,105,0.35); background: rgba(5,150,105,0.05); }
        .lrr-tl-activated .lrr-tl-card-title { color: #059669; }
        .lrr-tl-activated .lrr-tl-card-header .mat-icon { color: #059669; }
        .lrr-tl-empty { padding: 24px; text-align: center; color: #b4c2d0; font-size: 13px; }
        .lrr-section-card { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--border-radius); overflow: hidden; margin-bottom: 20px; }
        .lrr-section-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; cursor: pointer; user-select: none; }
        .lrr-section-header:hover { background: rgba(255,255,255,0.02); }
        .lrr-section-header .mat-icon { font-size: 18px; color: #b4c2d0; transition: transform 0.2s; }
        .lrr-section-header .mat-icon.open { transform: rotate(180deg); }
        .lrr-section-body { padding: 0 20px 16px; }
        .lrr-decision-bar { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 20px; margin-top: 20px; }
        .lrr-decision-bar-inner { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; flex-wrap: wrap; }
        .lrr-decision-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .lrr-decision-remarks { flex: 1; min-width: 250px; }
        @media (max-width: 900px) { .lrr-docs-grid { grid-template-columns: 1fr; } .lrr-header { flex-direction: column; } .lrr-decision-bar-inner { flex-direction: column; } }
        .sr-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 4px; }
        @media (max-width: 600px) { .sr-grid-2 { grid-template-columns: 1fr; } }
        .sr-field { background: rgba(0,0,0,0.06); border-radius: 8px; padding: 10px 12px; }
        .sr-field-label { font-size: 11px; color: #b4c2d0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
        .sr-field-value { font-size: 14px; font-weight: 600; color: #fff; margin-top: 3px; }
        .sr-field-value.mono { font-family: 'JetBrains Mono', monospace; font-size: 13px; }
      `}</style>

      {/* FLASH MESSAGE */}
      {msg.text && <div className={`flash-message flash-${msg.type}`} style={{ marginBottom: 16 }}>{msg.text}</div>}

      {/* SECTION 1 — HEADER */}
      <div className="lrr-hero" style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.05) 100%)',
        border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)',
        padding: '24px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--accent-color), #8b5cf6, #10b981)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/admin/loan/applications')} style={{ padding: '4px 10px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>arrow_back</span>
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#b4c2d0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Loan Application Review</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="mono" style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-color)' }}>{app.application_number}</span>
                <span className={`badge ${STATUS_BADGE[app.status] || 'badge-muted'}`} style={{ fontSize: 11, padding: '3px 12px' }}>{STATUS_LABEL[app.status] || app.status}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
            {['visit_scheduled', 'final_review', 'documents_verified'].includes(app.status) && (
              <>
                <button className="btn btn-success" onClick={() => setAction('approve')} style={{ height: 36 }}>
                  <span className="material-symbols-rounded">check_circle</span> Approve
                </button>
                <button className="btn btn-danger" onClick={() => { setAction('reject'); setRemarks('') }} style={{ height: 36 }}>
                  <span className="material-symbols-rounded">cancel</span> Reject
                </button>
                <button className="btn btn-secondary" onClick={() => { setAction('return'); setRemarks('') }} style={{ height: 36 }}>
                  <span className="material-symbols-rounded">undo</span> Clarification
                </button>
              </>
            )}
            {app.status === 'approved' && <span className="badge badge-success" style={{ fontSize: 13, padding: '8px 16px' }}>Approved {(() => { const e = sortedHistory.find(h => h.new_status === 'approved'); return e ? `${formatDate(e.changed_at)} | ${formatTime(e.changed_at)}` : app.approved_at ? formatDate(app.approved_at) : '' })()}</span>}
            {app.status === 'rejected' && <span className="badge badge-danger" style={{ fontSize: 13, padding: '8px 16px' }}>Rejected {(() => { const e = sortedHistory.find(h => h.new_status === 'rejected'); return e ? `${formatDate(e.changed_at)} | ${formatTime(e.changed_at)}` : app.rejected_at ? formatDate(app.rejected_at) : '' })()}</span>}
          </div>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px 24px',
          marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-color)'
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#b4c2d0', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 13 }}>person</span> Customer
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{app.customer_name}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#b4c2d0' }}>{customer.phone_number || app.customer_phone || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#b4c2d0', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 13 }}>payments</span> Loan Type
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{app.loan_type}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#b4c2d0' }}>{app.duration_months} months @ {app.interest_rate}%</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#b4c2d0', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Rs</span> Amount
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-color)' }}>{formatCurrency(app.amount)}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#b4c2d0' }}>EMI: {formatCurrency(app.emi || '—')}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#b4c2d0', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 13 }}>assignment_ind</span> Assigned To
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{app.assigned_staff_name || 'Unassigned'}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#b4c2d0' }}>Submitted {app.submitted_at ? formatDate(app.submitted_at) : '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#b4c2d0', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 13 }}>gavel</span> Risk Level
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: riskLevel === 'high' ? '#ef4444' : riskLevel === 'medium' ? '#f59e0b' : '#10b981'
              }} />
              <span style={{ color: riskLevel === 'high' ? '#ef4444' : riskLevel === 'medium' ? '#f59e0b' : '#10b981' }}>{riskLevel.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#b4c2d0' }}>DTI: {dti}%</div>
          </div>
        </div>
      </div>

      {/* SECTION 2 + 3 — APPLICANT INFO (left) + LOAN / NOMINEE (right) — single card */}
      <div className="lrr-info-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div className="lrr-info-card-title">
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>person</span> Applicant Information
            </div>
            <div className="sr-grid-2">
              <div className="sr-field">
                <div className="sr-field-label">Full Name</div>
                <div className="sr-field-value">{profile.full_name || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Father Name</div>
                <div className="sr-field-value">{profile.father_name || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Grandfather Name</div>
                <div className="sr-field-value">{profile.grandfather_name || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Date of Birth</div>
                <div className="sr-field-value">{profile.dob ? formatDate(profile.dob) : '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Gender</div>
                <div className="sr-field-value">{profile.gender || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Citizenship Number</div>
                <div className="sr-field-value mono">{profile.citizenship_id || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Citizenship Issue District</div>
                <div className="sr-field-value">{profile.citizenship_issue_district || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Marital Status</div>
                <div className="sr-field-value">{profile.marital_status || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Occupation</div>
                <div className="sr-field-value">{profile.occupation || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Mobile Number</div>
                <div className="sr-field-value">{profile.phone_number || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Alternate Mobile</div>
                <div className="sr-field-value">{profile.alternate_mobile || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Email</div>
                <div className="sr-field-value">{profile.email || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Permanent Address</div>
                <div className="sr-field-value">{profile.address || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Current Address</div>
                <div className="sr-field-value">{profile.temporary_address || profile.address || '—'}</div>
              </div>
            </div>
          </div>
          <div>
            <div className="lrr-info-card-title">
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>receipt_long</span> Loan Information
            </div>
            <div className="sr-grid-2" style={{ marginBottom: 18 }}>
              <div className="sr-field">
                <div className="sr-field-label">Loan Type</div>
                <div className="sr-field-value">{app.loan_type}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Requested Amount</div>
                <div className="sr-field-value" style={{ color: 'var(--accent-color)' }}>{formatCurrency(app.amount)}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Duration</div>
                <div className="sr-field-value">{app.duration_months} months</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Interest Rate</div>
                <div className="sr-field-value">{app.interest_rate}% p.a.</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Estimated EMI</div>
                <div className="sr-field-value" style={{ color: '#10b981' }}>{formatCurrency(app.emi || parseFloat(app.amount) * (1 + parseFloat(app.interest_rate || 12) / 100) / app.duration_months)}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Purpose</div>
                <div className="sr-field-value">{app.purpose || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Collateral Type</div>
                <div className="sr-field-value">{app.collateral_type || 'N/A'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Submitted</div>
                <div className="sr-field-value" style={{ fontSize: '13px', color: '#b4c2d0' }}>{formatDate(app.submitted_at)}</div>
              </div>
            </div>
            <div className="lrr-info-card-title">
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>groups</span> Nominee Information
            </div>
            <div className="sr-grid-2">
              <div className="sr-field">
                <div className="sr-field-label">Nominee Name</div>
                <div className="sr-field-value">{profile.nominee_name || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Nominee Contact</div>
                <div className="sr-field-value">{profile.nominee_contact || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Nominee Relationship</div>
                <div className="sr-field-value">{profile.nominee_relationship || '—'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4 — DOCUMENT REVIEW */}
      <div className="lrr-info-card" style={{ marginBottom: 20 }}>
        <div className="lrr-info-card-title">
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>description</span> Document Review
        </div>
        <div className="lrr-docs-grid">
          {Object.entries(DOC_LABELS).map(([key, label]) => {
            const doc = (app.documents || []).find(d => d.document_type === key)
            return (
              <div key={key} className="lrr-doc-card">
                <div className="lrr-doc-preview" onClick={() => doc && setZoomDoc(doc)}>
                  {doc ? (
                    <>
                      <img src={`/${doc.file_url}`} alt={doc.file_name}
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                      <div className="fallback" style={{ display: 'none' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 32 }}>description</span>
                        <span style={{ fontSize: 11 }}>Preview unavailable</span>
                      </div>
                    </>
                  ) : (
                    <div className="fallback">
                      <span className="material-symbols-rounded" style={{ fontSize: 32, color: '#b4c2d0' }}>note_add</span>
                      <span style={{ fontSize: 11 }}>Not uploaded</span>
                    </div>
                  )}
                </div>
                <div className="lrr-doc-body">
                  <div className="lrr-doc-name">{label}</div>
                  {doc ? (
                    <>
                      <div className="lrr-doc-meta">Uploaded {doc.uploaded_at ? formatDate(doc.uploaded_at) : ''}</div>
                      <div className="lrr-doc-actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => setZoomDoc(doc)} style={{ fontSize: 11, padding: '3px 10px' }}>
                          <span className="material-symbols-rounded" style={{ fontSize: 13 }}>zoom_in</span> Preview
                        </button>
                        <a href={`/${doc.file_url}`} download className="btn btn-sm btn-secondary" style={{ fontSize: 11, padding: '3px 10px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-rounded" style={{ fontSize: 13 }}>open_in_new</span> Open
                        </a>
                      </div>
                    </>
                  ) : (
                    <div className="lrr-doc-meta" style={{ color: '#b4c2d0' }}>Not uploaded yet</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* SECTION 5 — APPLICATION DETAILS (Expandable) */}
      <div className="lrr-section-card">
        <div className="lrr-section-header" onClick={() => toggleSection('details')}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#d4dbe5', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>description</span> Application Details
          </span>
          <span className={`material-symbols-rounded ${expandedSection === 'details' ? 'open' : ''}`}>expand_more</span>
        </div>
        {expandedSection === 'details' && (
          <div className="lrr-section-body">
            {app.description && <div className="lrr-info-row"><span className="lrr-info-label">Additional Notes</span><span className="lrr-info-value">{app.description}</span></div>}
            {customer.dob && <div className="lrr-info-row"><span className="lrr-info-label">Date of Birth</span><span className="lrr-info-value">{formatDate(customer.dob)}</span></div>}
            {customer.gender && <div className="lrr-info-row"><span className="lrr-info-label">Gender</span><span className="lrr-info-value">{customer.gender}</span></div>}
            {customer.marital_status && <div className="lrr-info-row"><span className="lrr-info-label">Marital Status</span><span className="lrr-info-value">{customer.marital_status}</span></div>}
            {customer.nominee_name && <div className="lrr-info-row"><span className="lrr-info-label">Nominee</span><span className="lrr-info-value">{customer.nominee_name} ({customer.nominee_relationship || '—'})</span></div>}
            {customer.education && <div className="lrr-info-row"><span className="lrr-info-label">Education</span><span className="lrr-info-value">{customer.education}</span></div>}
            {app.created_at && <div className="lrr-info-row"><span className="lrr-info-label">Application Created</span><span className="lrr-info-value">{formatDateTime(app.created_at)}</span></div>}
            {app.submitted_at && <div className="lrr-info-row"><span className="lrr-info-label">Submitted On</span><span className="lrr-info-value">{formatDateTime(app.submitted_at)}</span></div>}
          </div>
        )}
      </div>

      {/* SECTION 6 — LOAN TIMELINE */}
      <div className="lrr-info-card" style={{ marginBottom: 20 }}>
        <div className="lrr-info-card-title">
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>timeline</span> Loan Timeline
        </div>
        <div className="lrr-timeline">
          {sortedHistory.length > 0 ? sortedHistory.map((h, i) => {
            const color = TIMELINE_COLORS[h.new_status] || '#6b7280'
            const icon = TIMELINE_ICONS[h.new_status] || 'circle'
            const isClarification = h.new_status === 'clarification_required'
            const isApproved = h.new_status === 'approved'
            const isRejected = h.new_status === 'rejected'
            const isActivated = h.new_status === 'disbursed'
            let cardClass = 'lrr-tl-card'
            if (isClarification) cardClass += ' lrr-tl-clarification'
            else if (isApproved) cardClass += ' lrr-tl-approved'
            else if (isRejected) cardClass += ' lrr-tl-rejected'
            else if (isActivated) cardClass += ' lrr-tl-activated'
            const isLast = i === sortedHistory.length - 1
            const expectedRole = STATUS_ROLE[h.new_status] || ''
            const actualRole = h.changed_by_role || ''
            const role = expectedRole || actualRole
            const rawName = (h.changed_by || '').replace(/^(?:User|Staff|Admin)[:\-]\s*/i, '')
            const crossPortal = /^(?:User|Staff|Admin)$/i.test(rawName)
            const cleanName = (expectedRole && expectedRole === actualRole && !crossPortal) ? rawName : role
            return (
              <div key={h.id || i} className="lrr-tl-item">
                <div className="lrr-tl-dot" style={{ background: `${color}1a`, color, border: `2px solid ${color}` }}>
                  <span className="material-symbols-rounded mat-icon">{icon}</span>
                </div>
                {!isLast && <div className="lrr-tl-line" style={{ background: color }} />}
                <div className={cardClass}>
                  <div className="lrr-tl-card-header">
                    <span className="material-symbols-rounded mat-icon">{icon}</span>
                    <span className="lrr-tl-card-title">{STATUS_LABEL[h.new_status] || h.new_status.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="lrr-tl-card-details">
                    <span>
                      <span className="material-symbols-rounded" style={{ fontSize: 14 }}>calendar_today</span>
                      {formatDate(h.changed_at)}
                    </span>
                    <span>
                      <span className="material-symbols-rounded" style={{ fontSize: 14 }}>schedule</span>
                      {formatTime(h.changed_at)}
                    </span>
                    {h.changed_by && (
                      <span>
                        <span className="material-symbols-rounded" style={{ fontSize: 14 }}>person</span>
                        {role && <span>By {role}<br /></span>}
                        {cleanName}
                      </span>
                    )}
                  </div>
                  {h.remarks && <div className="lrr-tl-remark">{h.remarks}</div>}
                </div>
              </div>
            )
          }) : (
            <div className="lrr-tl-empty">
              <span className="material-symbols-rounded" style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>timeline</span>
              No activity recorded yet
            </div>
          )}
        </div>
      </div>

      {/* SECTION 7 — ADMIN DECISION PANEL */}
      <div className="lrr-decision-bar">
        <div className="lrr-decision-bar-inner">
          <div className="lrr-decision-remarks">
            <div style={{ fontSize: 13, fontWeight: 800, color: '#d4dbe5', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Decision Remarks</div>
            <textarea className="form-control" rows={2} placeholder="Add internal remarks or notes..."
              value={remarks} onChange={e => setRemarks(e.target.value)} style={{ fontSize: 13 }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#d4dbe5', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Actions</div>
            <div className="lrr-decision-actions">
              {['visit_scheduled', 'final_review', 'documents_verified'].includes(app.status) ? (
                <>
                  <button className="btn btn-success" onClick={() => setAction('approve')} disabled={processing}>
                    <span className="material-symbols-rounded">check_circle</span> Approve Loan
                  </button>
                  <button className="btn btn-danger" onClick={() => { setAction('reject'); setRemarks('') }} disabled={processing}>
                    <span className="material-symbols-rounded">cancel</span> Reject Loan
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setAction('return'); setRemarks('') }} disabled={processing}>
                    <span className="material-symbols-rounded">undo</span> Request Clarification
                  </button>
                </>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 500, color: '#b4c2d0' }}>No actions available for current status</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION PANEL */}
      {['approve', 'reject', 'return'].includes(action) && (
        <div className="lrr-decision-bar" style={{ borderColor: action === 'approve' ? 'var(--success)' : action === 'reject' ? 'var(--danger)' : 'var(--accent-color)', marginTop: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: action === 'approve' ? 'var(--success)' : action === 'reject' ? 'var(--danger)' : 'var(--accent-color)', marginBottom: 4 }}>
                {action === 'approve' ? 'Confirm Loan Approval' : action === 'reject' ? 'Confirm Rejection' : 'Return to Staff'}
              </div>
              {action === 'approve' ? (
                <p style={{ color: '#b4c2d0', fontSize: 13, margin: 0, fontWeight: 500 }}>This will approve the loan, create the loan account, generate repayment schedule, and disburse funds to the customer's account.</p>
              ) : (
                <p style={{ color: '#b4c2d0', fontSize: 13, margin: 0, fontWeight: 500 }}>{action === 'reject' ? 'Rejection reason is required.' : 'Provide a reason for returning to staff.'}</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button className="btn btn-sm btn-secondary" onClick={() => { setAction(null); setRemarks('') }} disabled={processing}>Cancel</button>
              <button className={`btn btn-sm ${action === 'approve' ? 'btn-success' : action === 'reject' ? 'btn-danger' : 'btn-primary'}`}
                onClick={action === 'approve' ? handleApprove : action === 'reject' ? handleReject : handleReturnToStaff}
                disabled={processing || (action !== 'approve' && !remarks.trim())}>
                {processing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT ZOOM MODAL */}
      {zoomDoc && (
        <div className="modal-overlay" onClick={() => setZoomDoc(null)} style={{ zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{zoomDoc.file_name}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={`/${zoomDoc.file_url}`} download className="btn btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 16 }}>download</span> Download
                </a>
                <button className="btn btn-sm btn-secondary" onClick={() => setZoomDoc(null)}>Close</button>
              </div>
            </div>
            <img src={`/${zoomDoc.file_url}`} alt={zoomDoc.file_name}
              style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 50px)', borderRadius: 8, objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none' }} />
          </div>
        </div>
      )}
    </>
  )
}
