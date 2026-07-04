import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { staffGetLoanApplication, staffVerifyDocuments, staffRequestClarification, staffScheduleVisit, staffAddRemarks, staffMoveToReview } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'

const DOC_LABELS = { citizenship: 'Citizenship / National ID', income_proof: 'Income Proof', collateral: 'Collateral Document' }
const STATUS_COLORS = { submitted: '#3b82f6', clarification_required: '#f59e0b', documents_verified: '#10b981', visit_scheduled: '#6366f1', final_review: '#8b5cf6', approved: '#10b981', rejected: '#ef4444' }
const STATUS_ROLE = {
  submitted:'User', under_review:'Staff', clarification_required:'Staff',
  documents_verified:'Staff', visit_scheduled:'Staff',
  final_review:'Admin', approved:'Admin', rejected:'Admin', disbursed:'Admin'
}

function derivePerformer(h) {
  var er = STATUS_ROLE[h.new_status] || ''
  var ar = h.changed_by_role || ''
  var r = er || ar
  var rn = (h.changed_by || '').replace(/^(?:User|Staff|Admin)[:\-]\s*/i, '')
  var cp = /^(?:User|Staff|Admin)$/i.test(rn)
  return (er && er === ar && !cp) ? rn : r
}

export default function StaffLoanReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [affectDoc, setAffectDoc] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [visitTime, setVisitTime] = useState('')
  const [visitNotes, setVisitNotes] = useState('')
  const [docStatus, setDocStatus] = useState({})
  const [processing, setProcessing] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [zoomDoc, setZoomDoc] = useState(null)

  const fetchApp = useCallback(() => {
    setLoading(true)
    staffGetLoanApplication(id)
      .then(res => {
        const a = res.data.application
        setApp(a)
        const initial = {}
        ;(a.documents || []).forEach(d => { initial[d.document_type] = 'verified' })
        setDocStatus(initial)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchApp() }, [fetchApp])

  const showMsg = (t, text) => { setMsg({ type: t, text }); setTimeout(() => setMsg({ type: '', text: '' }), 4000) }

  const handleVerifyDocs = async () => {
    setProcessing(true)
    try {
      const res = await staffVerifyDocuments(id, { remarks })
      setApp(res.data.application)
      showMsg('success', 'Documents verified successfully')
      setAction(null)
      setRemarks('')
    } catch (e) {
      showMsg('danger', e.response?.data?.error || 'Failed')
    } finally { setProcessing(false) }
  }

  const handleRequestClarification = async () => {
    if (!remarks.trim()) { showMsg('danger', 'Clarification reason is required'); return }
    setProcessing(true)
    try {
      const clarifyText = affectDoc ? `[${DOC_LABELS[affectDoc] || affectDoc}] ${remarks}` : remarks
      const res = await staffRequestClarification(id, { remarks: clarifyText })
      setApp(res.data.application)
      showMsg('success', 'Clarification requested')
      setAction(null)
      setRemarks('')
      setAffectDoc('')
    } catch (e) {
      showMsg('danger', e.response?.data?.error || 'Failed')
    } finally { setProcessing(false) }
  }

  const handleScheduleVisit = async () => {
    if (!visitDate) { showMsg('danger', 'Visit date is required'); return }
    setProcessing(true)
    try {
      const res = await staffScheduleVisit(id, { appointment_date: visitDate, appointment_time: visitTime, notes: visitNotes })
      setApp(res.data.application)
      showMsg('success', 'Visit scheduled successfully')
      setAction(null)
      setVisitDate('')
      setVisitTime('')
      setVisitNotes('')
    } catch (e) {
      showMsg('danger', e.response?.data?.error || 'Failed')
    } finally { setProcessing(false) }
  }

  const handleMoveToReview = async () => {
    setProcessing(true)
    try {
      const res = await staffMoveToReview(id, { remarks })
      setApp(res.data.application)
      showMsg('success', 'Moved to final review')
      setAction(null)
    } catch (e) {
      showMsg('danger', e.response?.data?.error || 'Failed')
    } finally { setProcessing(false) }
  }

  const handleAddRemarks = async () => {
    setProcessing(true)
    try {
      await staffAddRemarks(id, { remarks })
      showMsg('success', 'Internal notes saved')
      setAction(null)
      setRemarks('')
    } catch (e) {
      showMsg('danger', 'Failed to save notes')
    } finally { setProcessing(false) }
  }

  const statusColor = STATUS_COLORS[app?.status] || '#6b7280'

  if (loading) return <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /></div>
  if (!app) return <div className="empty"><span className="material-symbols-rounded">search_off</span><div>Application not found</div></div>

  return (
    <>
      <style>{`
        .sr-layout { display: flex; gap: 24px; align-items: flex-start; }
        .sr-main { flex: 7; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
        .sr-side { flex: 3; min-width: 260px; max-width: 380px; display: flex; flex-direction: column; gap: 16px; position: sticky; top: 16px; }
        @media (max-width: 900px) { .sr-layout { flex-direction: column; } .sr-side { max-width: 100%; position: static; } }

        .sr-section { background: var(--card-bg,#1a1f2e); border: 1px solid var(--border-color,#2a2f3e); border-radius: 14px; padding: 20px 22px; }
        .sr-section-title { font-size: 13px; font-weight: 700; color: var(--text-secondary,#94a3b8); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; display: flex; align-items: center; gap: 6px; }
        .sr-section-title .mat-icon { font-size: 18px; color: var(--accent-color,#3b82f6); }

        .sr-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 600px) { .sr-grid-2 { grid-template-columns: 1fr; } }
        .sr-field { background: rgba(0,0,0,0.06); border-radius: 8px; padding: 10px 12px; }
        .sr-field-label { font-size: 11px; color: var(--text-secondary,#94a3b8); text-transform: uppercase; letter-spacing: 0.3px; }
        .sr-field-value { font-size: 14px; font-weight: 600; color: #fff; margin-top: 3px; }
        .sr-field-value.mono { font-family: 'JetBrains Mono', monospace; font-size: 13px; }

        .sr-doc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 8px; }
        @media (max-width: 700px) { .sr-doc-grid { grid-template-columns: 1fr; } }
        .sr-doc-card { background: var(--card-bg,#1a1f2e); border: 1px solid var(--border-color,#2a2f3e); border-radius: 12px; overflow: hidden; }
        .sr-doc-card:hover { border-color: rgba(59,130,246,0.3); }
        .sr-doc-label { font-size: 12px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.4px; padding: 10px 12px 6px; }
        .sr-doc-thumb { width: 100%; height: 140px; object-fit: cover; cursor: pointer; display: block; border-bottom: 1px solid var(--border-color,#2a2f3e); }
        .sr-doc-placeholder { width: 100%; height: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: rgba(0,0,0,0.1); color: var(--text-muted); font-size: 12px; cursor: pointer; border-bottom: 1px solid var(--border-color,#2a2f3e); }
        .sr-doc-placeholder .mat-icon { font-size: 32px; }
        .sr-doc-body { padding: 10px 12px; }
        .sr-doc-name { font-size: 13px; font-weight: 600; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sr-doc-meta { font-size: 12px; color: var(--text-secondary,#94a3b8); margin-top: 2px; display: flex; gap: 10px; }
        .sr-doc-actions { display: flex; align-items: center; gap: 8px; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(55,65,81,0.15); }
        .sr-doc-actions .btn { flex: 1; font-size: 11px; padding: 5px 8px; justify-content: center; }
        .sr-doc-missing { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 24px; color: var(--text-muted); font-size: 12px; text-align: center; border: 1px dashed rgba(55,65,81,0.3); border-radius: 8px; margin: 8px; }
        .sr-doc-missing .mat-icon { font-size: 28px; }

        .sr-verif-panel { background: var(--card-bg,#1a1f2e); border: 1px solid var(--border-color,#2a2f3e); border-radius: 14px; padding: 18px; }
        .sr-verif-title { font-size: 13px; font-weight: 700; color: var(--text-secondary,#94a3b8); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; display: flex; align-items: center; gap: 6px; }
        .sr-verif-title .mat-icon { font-size: 18px; color: var(--accent-color,#3b82f6); }
        .sr-verif-item { padding: 8px 0; border-bottom: 1px solid rgba(55,65,81,0.08); }
        .sr-verif-item:last-child { border-bottom: none; }
        .sr-verif-item-label { font-size: 12px; color: var(--text-secondary,#94a3b8); margin-bottom: 4px; }
        .sr-verif-status { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; }

        .sr-action-stack { display: flex; flex-direction: column; gap: 8px; }

        .sr-timeline { background: var(--card-bg,#1a1f2e); border: 1px solid var(--border-color,#2a2f3e); border-radius: 14px; padding: 16px 18px; }
        .sr-tl-item { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(55,65,81,0.06); }
        .sr-tl-item:last-child { border-bottom: none; }
        .sr-tl-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
        .sr-tl-content { flex: 1; min-width: 0; }
        .sr-tl-action { font-size: 13px; color: #fff; font-weight: 600; }
        .sr-tl-remark { font-size: 11px; color: var(--text-secondary,#94a3b8); margin-top: 2px; }
        .sr-tl-date { font-size: 11px; color: var(--text-muted); }

        .sr-panel-card { background: var(--card-bg,#1a1f2e); border: 1px solid var(--border-color,#2a2f3e); border-radius: 14px; padding: 18px; }
        .sr-panel-title { font-size: 13px; font-weight: 700; color: var(--text-secondary,#94a3b8); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
        .sr-panel-title .mat-icon { font-size: 18px; color: var(--accent-color,#3b82f6); }

        .sr-quick-info { background: var(--card-bg,#1a1f2e); border: 1px solid var(--border-color,#2a2f3e); border-radius: 14px; padding: 16px 18px; display: flex; align-items: center; gap: 14px; }
        .sr-qi-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sr-qi-icon .mat-icon { font-size: 22px; }
        .sr-qi-info { flex: 1; min-width: 0; }
        .sr-qi-id { font-size: 12px; color: var(--text-secondary,#94a3b8); font-family: 'JetBrains Mono', monospace; }
        .sr-qi-name { font-size: 15px; font-weight: 700; color: #fff; }
        .sr-qi-meta { font-size: 12px; color: var(--text-muted); margin-top: 1px; }
        .sr-qi-badge { font-size: 12px; font-weight: 700; padding: 5px 14px; border-radius: 20px; letter-spacing: 0.3px; }
      `}</style>

      <div className="page-header">
        <div>
          <div className="page-title">Application Review</div>
          <div className="page-subtitle">
            <span className="mono">{app.application_number}</span>
            <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>&middot;</span>
            {app.customer_name}
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <span className="material-symbols-rounded">arrow_back</span> Back
        </button>
      </div>

      {msg.text && (
        <div className={`flash-message flash-${msg.type}`} style={{ marginBottom: '16px' }}>
          <span className="material-symbols-rounded" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
            {msg.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {msg.text}
        </div>
      )}

      {/* Quick Info Bar */}
      <div className="sr-quick-info" style={{ marginBottom: '16px' }}>
        <div className="sr-qi-icon" style={{ background: `${statusColor}18`, color: statusColor }}>
          <span className="material-symbols-rounded mat-icon">account_balance</span>
        </div>
        <div className="sr-qi-info">
          <div className="sr-qi-id">{app.application_number}</div>
          <div className="sr-qi-name">{app.customer_name}</div>
          <div className="sr-qi-meta">{app.loan_type} &middot; {app.duration_months} months &middot; {formatCurrency(app.amount)}</div>
        </div>
        <span className="sr-qi-badge" style={{ background: `${statusColor}18`, color: statusColor }}>
          {app.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="sr-layout">
        {/* LEFT — 70% */}
        <div className="sr-main">
          {/* Application Details */}
          <div className="sr-section">
            <div className="sr-section-title">
              <span className="material-symbols-rounded mat-icon">person</span>
              Applicant Information
            </div>
              <div className="sr-grid-2">

              <div style={{gridColumn:'span 2', fontSize:'11px', fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.5px', padding:'4px 0 0'}}>Personal Information</div>

              <div className="sr-field">
                <div className="sr-field-label">Full Name</div>
                <div className="sr-field-value">{app.customer_name}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Father Name</div>
                <div className="sr-field-value">{app.father_name || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Grandfather Name</div>
                <div className="sr-field-value">{app.grandfather_name || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Date of Birth</div>
                <div className="sr-field-value">{app.dob ? formatDate(app.dob) : '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Gender</div>
                <div className="sr-field-value">{app.gender || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Citizenship Number</div>
                <div className="sr-field-value mono">{app.citizenship_number || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Citizenship Issue District</div>
                <div className="sr-field-value">{app.citizenship_issue_district || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Marital Status</div>
                <div className="sr-field-value">{app.marital_status || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Occupation</div>
                <div className="sr-field-value">{app.occupation || '—'}</div>
              </div>

              <div style={{gridColumn:'span 2', fontSize:'11px', fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.5px', padding:'14px 0 0'}}>Contact Information</div>

              <div className="sr-field">
                <div className="sr-field-label">Mobile Number</div>
                <div className="sr-field-value">{app.customer_phone || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Alternate Mobile</div>
                <div className="sr-field-value">{app.alternate_mobile || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Email</div>
                <div className="sr-field-value">{app.customer_email || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Permanent Address</div>
                <div className="sr-field-value">{app.permanent_address || app.customer_address || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Current Address</div>
                <div className="sr-field-value">{app.current_address || '—'}</div>
              </div>

              <div style={{gridColumn:'span 2', fontSize:'11px', fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.5px', padding:'14px 0 0'}}>Nominee Information</div>

              <div className="sr-field">
                <div className="sr-field-label">Nominee Name</div>
                <div className="sr-field-value">{app.nominee_name || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Nominee Contact</div>
                <div className="sr-field-value">{app.nominee_contact || '—'}</div>
              </div>
              <div className="sr-field">
                <div className="sr-field-label">Nominee Relationship</div>
                <div className="sr-field-value">{app.nominee_relationship || '—'}</div>
              </div>

            </div>

            <div className="sr-section-title" style={{ marginTop: '18px' }}>
              <span className="material-symbols-rounded mat-icon">receipt_long</span>
              Loan Information
            </div>
            <div className="sr-grid-2">
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
                <div className="sr-field-value" style={{ color: '#10b981' }}>
                  {formatCurrency(app.amount && app.interest_rate && app.duration_months
                    ? (() => { const mr = (app.interest_rate / 12) / 100; const n = app.duration_months; const p = app.amount; return p * mr * Math.pow(1 + mr, n) / (Math.pow(1 + mr, n) - 1) || 0 })()
                    : 0)}
                </div>
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
                <div className="sr-field-value" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDate(app.submitted_at)}</div>
              </div>
            </div>
          </div>

          {/* Uploaded Documents */}
          <div className="sr-section">
            <div className="sr-section-title">
              <span className="material-symbols-rounded mat-icon">description</span>
              Uploaded Documents
            </div>
            <div className="sr-doc-grid">
              {Object.entries(DOC_LABELS).map(([key, label]) => {
                const doc = (app.documents || []).find(d => d.document_type === key)
                return (
                  <div key={key} className="sr-doc-card">
                    <div className="sr-doc-label">{label}</div>
                    {doc ? (
                      <>
                        <img src={`/${doc.file_url}`} alt={doc.file_name} className="sr-doc-thumb"
                          onClick={() => setZoomDoc(doc)}
                          onError={e => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }} />
                        <div className="sr-doc-placeholder" style={{ display: 'none' }} onClick={() => setZoomDoc(doc)}>
                          <span className="material-symbols-rounded">description</span>
                          <span>Preview not available</span>
                        </div>
                        <div className="sr-doc-body">
                          <div className="sr-doc-name">{doc.file_name}</div>
                          <div className="sr-doc-meta">
                            <span>{doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '—'}</span>
                            <span>{doc.uploaded_at ? formatDate(doc.uploaded_at) : '—'}</span>
                          </div>
                          <div className="sr-doc-actions">
                            <button className="btn btn-sm btn-secondary" onClick={() => setZoomDoc(doc)}>
                              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>zoom_in</span> View
                            </button>
                            <a href={`/${doc.file_url}`} download className="btn btn-sm btn-secondary"
                              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>download</span> Download
                            </a>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="sr-doc-missing">
                        <span className="material-symbols-rounded">add_circle</span>
                        <span>Not uploaded</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Internal Notes */}
          {app.staff_remark && (
            <div className="sr-section">
              <div className="sr-section-title">
                <span className="material-symbols-rounded mat-icon">edit_note</span>
                Staff Notes
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {app.staff_remark}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT — 30% */}
        <div className="sr-side">
          {/* Quick Actions */}
          <div className="sr-panel-card">
            <div className="sr-panel-title">
              <span className="material-symbols-rounded mat-icon">bolt</span>
              Actions
            </div>
            <div className="sr-action-stack">
              {['submitted', 'clarification_required'].includes(app.status) && (
                <>
                  <button className="btn btn-success" style={{ width: '100%' }} onClick={() => setAction('verify')}>
                    <span className="material-symbols-rounded">verified</span> Verify Documents
                  </button>
                  <button className="btn" style={{ width: '100%', background: '#f59e0b', color: '#000' }} onClick={() => setAction('clarify')}>
                    <span className="material-symbols-rounded">feedback</span> Request Clarification
                  </button>
                </>
              )}
              {app.status === 'documents_verified' && (
                <>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setAction('schedule')}>
                    <span className="material-symbols-rounded">calendar_month</span> Schedule Branch Visit
                  </button>
                  <button className="btn" style={{ width: '100%', background: '#f59e0b', color: '#000' }} onClick={() => setAction('clarify')}>
                    <span className="material-symbols-rounded">feedback</span> Request Clarification
                  </button>
                </>
              )}
              {app.status === 'visit_scheduled' && (
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleMoveToReview} disabled={processing}>
                  <span className="material-symbols-rounded">arrow_forward</span> {processing ? 'Processing...' : 'Move to Final Review'}
                </button>
              )}
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setAction('remark')}>
                <span className="material-symbols-rounded">edit_note</span> Add Internal Notes
              </button>
            </div>
          </div>

          {/* Action Panels */}
          {action && (
            <div className="sr-panel-card" style={{ borderColor: action === 'verify' ? 'rgba(16,185,129,0.3)' : action === 'clarify' ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)' }}>
              <div className="sr-panel-title">
                <span className="material-symbols-rounded mat-icon">
                  {action === 'verify' ? 'verified' : action === 'clarify' ? 'feedback' : action === 'schedule' ? 'calendar_month' : 'edit_note'}
                </span>
                {action === 'verify' ? 'Verify Documents' : action === 'clarify' ? 'Request Clarification' : action === 'schedule' ? 'Schedule Branch Visit' : 'Add Internal Notes'}
              </div>

              {action === 'verify' && (
                <div>
                  <div className="form-group">
                    <textarea className="form-control" rows="3" placeholder="Verification notes (optional)"
                      value={remarks} onChange={e => setRemarks(e.target.value)} />
                  </div>
                  <button className="btn btn-success" style={{ width: '100%' }} onClick={handleVerifyDocs} disabled={processing}>
                    <span className="material-symbols-rounded">check</span> {processing ? 'Processing...' : '✓ Confirm Verification'}
                  </button>
                  <button className="btn btn-sm btn-secondary" style={{ width: '100%', marginTop: '6px' }}
                    onClick={() => { setAction(null); setRemarks('') }}>Cancel</button>
                </div>
              )}

              {action === 'clarify' && (
                <div>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Affected Document</label>
                    <select className="form-control" value={affectDoc} onChange={e => setAffectDoc(e.target.value)}>
                      <option value="">All Documents</option>
                      {Object.entries(DOC_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <textarea className="form-control" rows="3" placeholder="Enter reason for clarification (required)"
                      value={remarks} onChange={e => setRemarks(e.target.value)} />
                  </div>
                  <button className="btn" style={{ width: '100%', background: '#f59e0b', color: '#000' }}
                    onClick={handleRequestClarification} disabled={processing || !remarks.trim()}>
                    <span className="material-symbols-rounded">feedback</span> {processing ? 'Sending...' : 'Submit Clarification Request'}
                  </button>
                  <button className="btn btn-sm btn-secondary" style={{ width: '100%', marginTop: '6px' }}
                    onClick={() => { setAction(null); setRemarks(''); setAffectDoc('') }}>Cancel</button>
                </div>
              )}

              {action === 'schedule' && (
                <div>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Visit Date</label>
                    <input type="date" className="form-control" value={visitDate} onChange={e => setVisitDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Visit Time</label>
                    <input type="time" className="form-control" value={visitTime} onChange={e => setVisitTime(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Notes</label>
                    <textarea className="form-control" rows="2" placeholder="Additional visit notes"
                      value={visitNotes} onChange={e => setVisitNotes(e.target.value)} />
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleScheduleVisit} disabled={processing || !visitDate}>
                    <span className="material-symbols-rounded">calendar_month</span> {processing ? 'Scheduling...' : 'Confirm Schedule'}
                  </button>
                  <button className="btn btn-sm btn-secondary" style={{ width: '100%', marginTop: '6px' }}
                    onClick={() => { setAction(null); setVisitDate(''); setVisitTime(''); setVisitNotes('') }}>Cancel</button>
                </div>
              )}

              {action === 'remark' && (
                <div>
                  <div className="form-group">
                    <textarea className="form-control" rows="3" placeholder="Internal notes (not visible to customer)"
                      value={remarks} onChange={e => setRemarks(e.target.value)} />
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddRemarks} disabled={processing}>
                    <span className="material-symbols-rounded">save</span> {processing ? 'Saving...' : 'Save Notes'}
                  </button>
                  <button className="btn btn-sm btn-secondary" style={{ width: '100%', marginTop: '6px' }}
                    onClick={() => { setAction(null); setRemarks('') }}>Cancel</button>
                </div>
              )}
            </div>
          )}

          {/* Document Verification Status */}
          <div className="sr-verif-panel">
            <div className="sr-verif-title">
              <span className="material-symbols-rounded mat-icon">verified_user</span>
              Document Verification Status
            </div>
            {(app.documents || []).length > 0 ? (
              app.documents.map(doc => (
                <div key={doc.id} className="sr-verif-item">
                  <div className="sr-verif-item-label">{DOC_LABELS[doc.document_type] || doc.document_type}</div>
                  <div className="sr-verif-status">
                    <span className="material-symbols-rounded" style={{
                      fontSize: '16px',
                      color: doc.is_verified ? '#10b981' : '#f59e0b'
                    }}>
                      {doc.is_verified ? 'check_circle' : 'hourglass_empty'}
                    </span>
                    {doc.is_verified ? 'Verified' : 'Pending'}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px 0', textAlign: 'center' }}>
                No documents uploaded yet
              </div>
            )}
          </div>

          {/* Status History */}
          <div className="sr-timeline">
            <div className="sr-panel-title" style={{ marginBottom: '8px' }}>
              <span className="material-symbols-rounded mat-icon">history</span>
              Status History
            </div>
            {(app.status_history || []).length > 0 ? (
              app.status_history.slice().reverse().map(h => (
                <div key={h.id} className="sr-tl-item">
                  <div className="sr-tl-dot" style={{
                    background: h.new_status === 'documents_verified' ? '#10b981'
                      : h.new_status === 'clarification_required' ? '#f59e0b'
                        : h.new_status === 'visit_scheduled' ? '#6366f1'
                          : h.new_status === 'final_review' ? '#8b5cf6'
                            : h.new_status === 'submitted' ? '#3b82f6'
                              : h.new_status === 'rejected' ? '#ef4444' : '#94a3b8'
                  }} />
                  <div className="sr-tl-content">
                    <div className="sr-tl-action">{h.old_status || '—'} → {h.new_status}</div>
                    {h.remarks && <div className="sr-tl-remark">{h.remarks}</div>}
                    <div className="sr-tl-date">{formatDate(h.changed_at)} by {derivePerformer(h)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>No history</div>
            )}
          </div>
        </div>
      </div>

      {/* Image Viewer */}
      {zoomDoc && (
        <div className="modal-overlay" onClick={() => setZoomDoc(null)}
          style={{ zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{zoomDoc.file_name}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a href={`/${zoomDoc.file_url}`} download className="btn btn-sm btn-secondary"
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>download</span> Download
                </a>
                <button className="btn btn-sm btn-secondary" onClick={() => setZoomDoc(null)}>
                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>close</span>
                </button>
              </div>
            </div>
            <img src={`/${zoomDoc.file_url}`} alt={zoomDoc.file_name}
              style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 50px)', borderRadius: '8px', objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none' }} />
          </div>
        </div>
      )}
    </>
  )
}
