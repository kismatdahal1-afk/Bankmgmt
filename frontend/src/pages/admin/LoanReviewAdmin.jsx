import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminGetLoanApplication, adminApproveLoan, adminRejectLoan, adminReturnToStaff } from '../../services/loanApplicationService'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/helpers'

const DOC_LABELS = {
  citizenship:'Citizenship / National ID',
  income_proof:'Income Proof / Salary Slip',
  collateral:'Collateral Document',
  bank_statement:'Bank Statement',
  business_license:'Business License',
  property_document:'Property Document'
}

export default function AdminLoanReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [action, setAction] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [msg, setMsg] = useState({ type:'', text:'' })
  const [zoomDoc, setZoomDoc] = useState(null)

  const fetchApp = useCallback(() => {
    setLoading(true)
    adminGetLoanApplication(id)
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchApp() }, [fetchApp])

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type:'', text:'' }), 5000) }

  const handleApprove = async () => {
    setProcessing(true)
    try { const res = await adminApproveLoan(id); setData(res.data); showMsg('success','Loan approved and disbursed successfully!'); setAction(null) }
    catch (e) { showMsg('danger', e.response?.data?.error || 'Approval failed') }
    finally { setProcessing(false) }
  }

  const handleReject = async () => {
    if (!remarks.trim()) { showMsg('danger','Rejection reason is mandatory'); return }
    setProcessing(true)
    try { const res = await adminRejectLoan(id, { reason: remarks }); setData(res.data); showMsg('success','Loan rejected'); setAction(null); setRemarks('') }
    catch (e) { showMsg('danger', e.response?.data?.error || 'Failed') }
    finally { setProcessing(false) }
  }

  const handleReturnToStaff = async () => {
    setProcessing(true)
    try { const res = await adminReturnToStaff(id, { reason: remarks }); setData(res.data); showMsg('success','Returned to staff for re-review'); setAction(null); setRemarks('') }
    catch (e) { showMsg('danger', e.response?.data?.error || 'Failed') }
    finally { setProcessing(false) }
  }

  if (loading) return <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /></div>
  if (!data) return <div className="empty"><span className="material-symbols-rounded">search_off</span><div>Application not found</div></div>

  const app = data.application || data
  const riskLevel = app.amount > 1000000 ? 'high' : app.amount > 500000 ? 'medium' : 'low'
  const existingLoans = (data.existing_loans||[]).filter(l => l.status === 'approved')
  const totalExistingDebt = existingLoans.reduce((s, l) => s + l.amount, 0)
  const monthlyIncome = data.customer?.occupation === 'Business' ? 100000 : data.customer?.occupation === 'Government' ? 80000 : 50000
  const dti = monthlyIncome > 0 ? Math.round(((parseFloat(app.emi || 0) + (totalExistingDebt > 0 ? totalExistingDebt * 0.01 : 0)) / monthlyIncome) * 100) : 0
  const customer = data.customer || {}

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Application Review</div>
          <div className="page-subtitle"><span className="mono">{app.application_number}</span> &mdash; {app.customer_name}</div>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/admin/loan/applications')}>
          <span className="material-symbols-rounded">arrow_back</span> Back
        </button>
      </div>

      {msg.text && <div className={`flash-message flash-${msg.type}`} style={{ marginBottom: 16 }}>{msg.text}</div>}

      <div className="admin-review-layout">
        <div className="admin-review-main">
          <div className="card">
            <div className="card-title">Applicant Profile</div>
            <div className="review-item"><span>Full Name</span><span style={{ fontWeight: 600 }}>{customer.full_name || app.customer_name || '—'}</span></div>
            <div className="review-item"><span>Phone</span><span>{customer.phone_number || app.customer_phone || '—'}</span></div>
            <div className="review-item"><span>Email</span><span>{customer.email || app.customer_email || '—'}</span></div>
            <div className="review-item"><span>Address</span><span>{customer.address || app.customer_address || '—'}</span></div>
            <div className="review-item"><span>Citizenship</span><span>{customer.citizenship_id || app.citizenship_number || '—'}</span></div>
            <div className="review-item"><span>Occupation</span><span>{customer.occupation || app.occupation || '—'}</span></div>
            {customer.dob && <div className="review-item"><span>Date of Birth</span><span>{formatDate(customer.dob)}</span></div>}
            {customer.gender && <div className="review-item"><span>Gender</span><span>{customer.gender}</span></div>}
            {customer.marital_status && <div className="review-item"><span>Marital Status</span><span>{customer.marital_status}</span></div>}
            {customer.nominee_name && <div className="review-item"><span>Nominee</span><span>{customer.nominee_name} ({customer.nominee_relationship || '—'})</span></div>}
          </div>

          <div className="card">
            <div className="card-title">Employment & Income</div>
            <div className="review-item"><span>Occupation</span><span>{customer.occupation || app.occupation || 'N/A'}</span></div>
            <div className="review-item"><span>Estimated Monthly Income</span><span style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(monthlyIncome)}</span></div>
            <div className="review-item"><span>Existing Loan EMI Burden</span><span>{formatCurrency(totalExistingDebt > 0 ? totalExistingDebt * 0.01 : 0)}/mo</span></div>
            <div className="review-item"><span>DTI Ratio</span><span style={{ color: dti > 50 ? 'var(--danger)' : dti > 35 ? 'var(--warning)' : 'var(--success)', fontWeight: 700 }}>{dti}%</span></div>
          </div>

          <div className="card">
            <div className="card-title">Loan Details</div>
            <div className="review-item"><span>Loan Type</span><span>{app.loan_type}</span></div>
            <div className="review-item"><span>Requested Amount</span><span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatCurrency(app.amount)}</span></div>
            <div className="review-item"><span>Interest Rate</span><span>{app.interest_rate}% per annum</span></div>
            <div className="review-item"><span>Duration</span><span>{app.duration_months} months</span></div>
            <div className="review-item"><span>Estimated EMI</span><span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{app.emi ? formatCurrency(app.emi) : formatCurrency(parseFloat(app.amount) * (1 + parseFloat(app.interest_rate || 12) / 100) / app.duration_months)}</span></div>
            <div className="review-item"><span>Purpose</span><span>{app.purpose || 'N/A'}</span></div>
            <div className="review-item"><span>Collateral</span><span>{app.collateral_type || 'None provided'}</span></div>
            <div className="review-item"><span>Submitted</span><span>{formatDate(app.submitted_at)}</span></div>
          </div>

          <div className="card">
            <div className="card-title">Document Gallery</div>
            <div className="documents-gallery">
              {Object.entries(DOC_LABELS).map(([key, label]) => {
                const doc = (app.documents||[]).find(d => d.document_type === key)
                return (
                  <div key={key} className="doc-gallery-item">
                    <div className="doc-gallery-label">{label}</div>
                    {doc ? (
                      <>
                        <div className="doc-gallery-img" style={{ cursor: 'pointer' }} onClick={() => setZoomDoc(doc)}>
                          <img src={`/${doc.file_url}`} alt={doc.file_name}
                            style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                          <div style={{ display: 'none', height: 120, alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: 32 }}>description</span>
                          </div>
                        </div>
                        <div className="doc-gallery-actions">
                          <button className="btn btn-sm btn-secondary" onClick={() => setZoomDoc(doc)}>
                            <span className="material-symbols-rounded" style={{ fontSize: 14 }}>zoom_in</span> Preview
                          </button>
                          <a href={`/${doc.file_url}`} download className="btn btn-sm btn-secondary"
                            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-symbols-rounded" style={{ fontSize: 14 }}>download</span>
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="doc-gallery-missing">
                        <span className="material-symbols-rounded">add_circle</span>
                        <span>Not uploaded</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Staff Verification Summary</div>
            <div className="review-item"><span>Verified By</span><span style={{ fontWeight: 600 }}>{app.assigned_staff_name || '—'}</span></div>
            <div className="review-item"><span>Staff Remarks</span><span>{app.staff_remark || 'No remarks'}</span></div>
            {app.appointment_date && (
              <div className="review-item"><span>Branch Visit</span><span>{formatDate(app.appointment_date)}{app.appointment_time ? ` at ${app.appointment_time}` : ''}</span></div>
            )}
            {(app.verification_notes || []).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Verification Notes</div>
                {app.verification_notes.map((vn, i) => (
                  <div key={vn.id || i} className="review-item" style={{ padding: '6px 0' }}>
                    <span style={{ fontSize: 12 }}>{vn.notes}{vn.staff_name ? ` — ${vn.staff_name}` : ''}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{vn.created_at ? formatDate(vn.created_at) : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Status History</div>
            <div className="timeline-vertical">
              {(app.status_history || []).slice().reverse().map(h => (
                <div key={h.id} className="tlv-item">
                  <div className="tlv-dot" style={{
                    background: ['approved','disbursed'].includes(h.new_status) ? 'var(--success)'
                      : h.new_status === 'rejected' ? 'var(--danger)'
                      : h.new_status === 'clarification_required' ? 'var(--warning)'
                      : 'var(--accent-color)'
                  }} />
                  <div className="tlv-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{h.new_status.replace(/_/g, ' ')}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.changed_at ? formatDate(h.changed_at) : ''}</span>
                    </div>
                    {h.remarks && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{h.remarks}</div>}
                    {h.changed_by && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>by {h.changed_by_role || h.changed_by}</div>}
                  </div>
                </div>
              ))}
              {(!app.status_history || app.status_history.length === 0) && <div className="text-muted" style={{ padding: 8 }}>No history</div>}
            </div>
          </div>
        </div>

        <div className="admin-review-sidebar">
          <div className="card">
            <div className="card-title">Loan Summary</div>
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff' }}>{formatCurrency(app.amount)}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Requested Amount</div>
            </div>
            <div className="review-item"><span>Interest Rate</span><span>{app.interest_rate}%</span></div>
            <div className="review-item"><span>Duration</span><span>{app.duration_months} months</span></div>
            <div className="review-item"><span>EMI</span><span style={{ fontWeight: 600 }}>{formatCurrency(app.emi || parseFloat(app.amount) * (1 + parseFloat(app.interest_rate || 12) / 100) / app.duration_months)}</span></div>
          </div>

          <div className="card">
            <div className="card-title">Risk Assessment</div>
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{
                fontSize: '1.8rem', fontWeight: 700,
                color: riskLevel === 'high' ? 'var(--danger)' : riskLevel === 'medium' ? 'var(--warning)' : 'var(--success)'
              }}>{riskLevel.toUpperCase()}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
                <div>Amount: {formatCurrency(app.amount)}</div>
                <div>Existing Debt: {formatCurrency(totalExistingDebt)}</div>
                <div>Active Loans: {existingLoans.length}</div>
                <div>DTI: {dti}%</div>
              </div>
            </div>
          </div>

          {['visit_scheduled', 'final_review', 'documents_verified'].includes(app.status) && (
            <div className="card" style={{ borderColor: 'var(--accent-color)' }}>
              <div className="card-title" style={{ color: 'var(--accent-color)' }}>Admin Action Center</div>
              <div className="action-stack">
                <button className="btn btn-success" onClick={() => setAction('approve')} style={{ width: '100%' }}>
                  <span className="material-symbols-rounded">check_circle</span> Approve Loan
                </button>
                <button className="btn btn-danger" onClick={() => { setAction('reject'); setRemarks('') }} style={{ width: '100%' }}>
                  <span className="material-symbols-rounded">cancel</span> Reject Loan
                </button>
                <button className="btn btn-secondary" onClick={() => { setAction('return'); setRemarks('') }} style={{ width: '100%' }}>
                  <span className="material-symbols-rounded">undo</span> Return to Staff
                </button>
              </div>
            </div>
          )}

          {app.status === 'approved' && (
            <div className="card" style={{ borderColor: 'var(--success)' }}>
              <div className="card-title" style={{ color: 'var(--success)' }}>Approved</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Approved on {app.approved_at ? formatDate(app.approved_at) : '—'}</p>
            </div>
          )}

          {app.status === 'rejected' && (
            <div className="card" style={{ borderColor: 'var(--danger)' }}>
              <div className="card-title" style={{ color: 'var(--danger)' }}>Rejected</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Reason: {app.admin_remark || 'N/A'}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Rejected on {app.rejected_at ? formatDate(app.rejected_at) : '—'}</p>
            </div>
          )}

          {['approve', 'reject', 'return'].includes(action) && (
            <div className="card action-panel">
              <div className="card-title" style={{ color: action === 'approve' ? 'var(--success)' : action === 'reject' ? 'var(--danger)' : 'var(--accent-color)' }}>
                {action === 'approve' ? 'Confirm Approval' : action === 'reject' ? 'Rejection Reason' : 'Return Reason'}
              </div>
              {action !== 'approve' && (
                <textarea className="form-control" rows={3}
                  placeholder={action === 'reject' ? 'Rejection reason (required)' : 'Reason for returning to staff'}
                  value={remarks} onChange={e => setRemarks(e.target.value)} style={{ marginBottom: 12 }} />
              )}
              {action === 'approve' && (
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12 }}>This will approve the loan, create the loan account, generate repayment schedule, and disburse funds to the customer's account.</p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm btn-secondary" onClick={() => { setAction(null); setRemarks('') }} style={{ flex: 1 }}>Cancel</button>
                <button className={`btn btn-sm ${action === 'approve' ? 'btn-success' : action === 'reject' ? 'btn-danger' : 'btn-primary'}`}
                  onClick={action === 'approve' ? handleApprove : action === 'reject' ? handleReject : handleReturnToStaff}
                  disabled={processing || (action !== 'approve' && !remarks.trim())} style={{ flex: 1 }}>
                  {processing ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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