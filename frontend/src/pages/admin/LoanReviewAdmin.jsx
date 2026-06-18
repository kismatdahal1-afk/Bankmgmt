import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminGetLoanApplication, adminApproveLoan, adminRejectLoan, adminReturnToStaff } from '../../services/loanApplicationService'
import { formatCurrency, formatDate } from '../../utils/helpers'

const DOC_LABELS = { citizenship:'Citizenship / National ID', income_proof:'Income Proof', collateral:'Collateral Document' }

export default function AdminLoanReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [returnReason, setReturnReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [showReturn, setShowReturn] = useState(false)
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
    try { const res = await adminApproveLoan(id); setData(prev => ({ ...prev, application: res.data.application })); showMsg('success','Loan approved and disbursed successfully!') }
    catch (e) { showMsg('danger', e.response?.data?.error || 'Approval failed') }
    finally { setProcessing(false) }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { showMsg('danger','Rejection reason is mandatory'); return }
    setProcessing(true)
    try { const res = await adminRejectLoan(id, { reason: rejectReason }); setData(prev => ({ ...prev, application: res.data.application })); showMsg('success','Loan rejected'); setShowReject(false); setRejectReason('') }
    catch (e) { showMsg('danger', e.response?.data?.error || 'Failed') }
    finally { setProcessing(false) }
  }

  const handleReturnToStaff = async () => {
    setProcessing(true)
    try { const res = await adminReturnToStaff(id, { reason: returnReason }); setData(prev => ({ ...prev, application: res.data.application })); showMsg('success','Returned to staff for re-review'); setShowReturn(false); setReturnReason('') }
    catch (e) { showMsg('danger', e.response?.data?.error || 'Failed') }
    finally { setProcessing(false) }
  }

  if (loading) return <div className="loading-skeleton"><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /></div>
  if (!data) return <div className="empty"><span className="material-symbols-rounded">search_off</span><div>Not found</div></div>

  const app = data.application
  const riskLevel = app.amount > 500000 ? 'high' : app.amount > 100000 ? 'medium' : 'low'
  const existingActiveLoans = (data.existing_loans||[]).filter(l => l.status === 'approved').length
  const totalExistingDebt = (data.existing_loans||[]).filter(l => l.status === 'approved').reduce((s,l) => s + l.amount, 0)
  const dti = app.amount > 0 ? ((totalExistingDebt + app.amount) / (app.amount) * 100).toFixed(0) : 0

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Application Review</div>
          <div className="page-subtitle"><span className="mono">{app.application_number}</span> — {app.customer_name}</div>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/admin/loan/applications')}><span className="material-symbols-rounded">arrow_back</span> Back</button>
      </div>

      {msg.text && <div className={`flash-message flash-${msg.type}`} style={{marginBottom:'16px'}}>{msg.text}</div>}

      <div className="admin-review-layout">
        <div className="admin-review-main">
          <div className="card"><div className="card-title">Application Details</div>
            <div className="review-item"><span>Loan ID</span><span className="mono">{app.application_number}</span></div>
            <div className="review-item"><span>Customer</span><span style={{fontWeight:600}}>{app.customer_name}</span></div>
            <div className="review-item"><span>Loan Type</span><span>{app.loan_type}</span></div>
            <div className="review-item"><span>Amount</span><span style={{fontWeight:700,fontSize:'1.1rem'}}>{formatCurrency(app.amount)}</span></div>
            <div className="review-item"><span>Duration</span><span>{app.duration_months} months @ {app.interest_rate}%</span></div>
            <div className="review-item"><span>Collateral</span><span>{app.collateral_type || 'N/A'}</span></div>
            <div className="review-item"><span>Purpose</span><span>{app.purpose || 'N/A'}</span></div>
            <div className="review-item"><span>Submitted</span><span>{formatDate(app.submitted_at)}</span></div>
            <div className="review-item"><span>Status</span><span className={`badge ${app.status==='approved'?'badge-success':app.status==='rejected'?'badge-danger':'badge-info'}`}>{app.status.replace(/_/g,' ')}</span></div>
          </div>

          <div className="card"><div className="card-title">Customer Information</div>
            <div className="review-item"><span>Name</span><span style={{fontWeight:600}}>{data.customer?.full_name}</span></div>
            <div className="review-item"><span>Phone</span><span>{data.customer?.phone_number}</span></div>
            <div className="review-item"><span>Citizenship</span><span>{data.customer?.citizenship_id}</span></div>
            <div className="review-item"><span>Occupation</span><span>{data.customer?.occupation || 'N/A'}</span></div>
            <div className="review-item"><span>Address</span><span>{data.customer?.address || 'N/A'}</span></div>
          </div>

          <div className="card"><div className="card-title">Account & Financial Overview</div>
            <div className="review-item"><span>Active Balance</span><span style={{fontWeight:600}}>{data.accounts?.filter(a=>a.status==='active').length > 0 ? formatCurrency(data.accounts.find(a=>a.status==='active')?.balance||0) : 'No active account'}</span></div>
            <div className="review-item"><span>Existing Loans</span><span>{existingActiveLoans} active ({formatCurrency(totalExistingDebt)})</span></div>
            {data.recent_transactions?.slice(0,5).map(tx => (
              <div key={tx.id} className="review-item" style={{padding:'6px 0'}}>
                <span style={{fontSize:'12px'}}>{tx.description || tx.type}</span>
                <span style={{color: tx.type==='deposit'||tx.type==='transfer_in'?'var(--success)':'var(--danger)',fontSize:'13px'}}>{tx.type==='deposit'||tx.type==='transfer_in'?'+':'-'}{formatCurrency(tx.amount)}</span>
              </div>
            ))}
          </div>

          <div className="card"><div className="card-title">Uploaded Documents</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:'16px',marginTop:'12px'}}>
              {Object.entries(DOC_LABELS).map(([key,label]) => {
                const doc = (app.documents||[]).find(d => d.document_type === key)
                return (
                  <div key={key}>
                    <div style={{fontSize:'12px',fontWeight:600,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'8px'}}>{label}</div>
                    {doc ? (
                      <div className="doc-preview-card">
                        <img src={`/${doc.file_url}`} alt={doc.file_name} className="doc-preview-img" style={{cursor:'pointer'}} onClick={()=>setZoomDoc(doc)}
                          onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex'}} />
                        <div className="doc-placeholder" style={{display:'none',cursor:'pointer'}} onClick={()=>setZoomDoc(doc)}>
                          <span className="material-symbols-rounded" style={{fontSize:'36px'}}>description</span>
                        </div>
                        <div className="doc-meta">
                          <span className="doc-filename">{doc.file_name}</span>
                          {doc.file_size && <span className="doc-size">{(doc.file_size / 1024).toFixed(1)} KB</span>}
                        </div>
                        <div className="doc-actions">
                          <button className="btn btn-sm btn-secondary" onClick={()=>setZoomDoc(doc)} style={{flex:1}}><span className="material-symbols-rounded" style={{fontSize:'16px'}}>zoom_in</span> View Full</button>
                          <a href={`/${doc.file_url}`} download className="btn btn-sm btn-secondary" style={{textDecoration:'none',flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'4px'}}><span className="material-symbols-rounded" style={{fontSize:'16px'}}>download</span> Download</a>
                        </div>
                      </div>
                    ) : <div className="doc-gallery-missing"><span className="material-symbols-rounded">add_circle</span><span>Not uploaded</span></div>}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card"><div className="card-title">Verification Timeline</div>
            <div className="timeline-vertical">
              {app.status_history?.slice().reverse().map(h => (
                <div key={h.id} className="tlv-item">
                  <div className="tlv-dot" style={{background: h.new_status==='approved'||h.new_status==='disbursed'?'var(--success)':h.new_status==='rejected'?'var(--danger)':'var(--accent-color)'}} />
                  <div className="tlv-content">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontWeight:600,fontSize:'13px',textTransform:'capitalize'}}>{h.new_status.replace(/_/g,' ')}</span>
                      <span style={{fontSize:'11px',color:'var(--text-muted)'}}>{formatDate(h.changed_at)}</span>
                    </div>
                    {h.remarks && <div style={{fontSize:'12px',color:'var(--text-secondary)',marginTop:'4px'}}>{h.remarks}</div>}
                    {h.changed_by && <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>by {h.changed_by}</div>}
                  </div>
                </div>
              ))}
              {(!app.status_history||app.status_history.length===0) && <p className="text-muted">No history</p>}
            </div>
          </div>
        </div>

        <div className="admin-review-sidebar">
          <div className="card"><div className="card-title">Risk Assessment</div>
            <div style={{textAlign:'center',padding:'20px'}}>
              <div style={{fontSize:'2rem',fontWeight:700,color: riskLevel==='high'?'var(--danger)':riskLevel==='medium'?'var(--warning)':'var(--success)'}}>{riskLevel.toUpperCase()}</div>
              <div style={{color:'var(--text-secondary)',fontSize:'13px',marginTop:'8px'}}>
                <div>Amount: {formatCurrency(app.amount)}</div>
                <div>Existing Debt: {formatCurrency(totalExistingDebt)}</div>
                <div>DTI Ratio: {dti}%</div>
                <div>Active Loans: {existingActiveLoans}</div>
              </div>
            </div>
          </div>

          {(app.status === 'visit_scheduled' || app.status === 'final_review') && (
            <div className="card" style={{marginTop:'12px',borderColor:'var(--accent-color)'}}>
              <div className="card-title" style={{color:'var(--accent-color)'}}>Final Decision</div>
              <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                <button className="btn btn-success" onClick={handleApprove} disabled={processing} style={{width:'100%'}}>
                  <span className="material-symbols-rounded">check_circle</span> {processing ? 'Processing...' : 'Approve & Disburse'}
                </button>
                <button className="btn btn-danger" onClick={()=>setShowReject(!showReject)} style={{width:'100%'}}>
                  <span className="material-symbols-rounded">cancel</span> Reject Loan
                </button>
                {showReject && (
                  <div style={{marginTop:'8px'}}>
                    <textarea className="form-control" rows="3" placeholder="Rejection reason (required)" value={rejectReason} onChange={e=>setRejectReason(e.target.value)} />
                    <button className="btn btn-danger" onClick={handleReject} disabled={processing||!rejectReason.trim()} style={{width:'100%',marginTop:'8px'}}>{processing?'Processing...':'Confirm Rejection'}</button>
                  </div>
                )}
                <button className="btn btn-secondary" onClick={()=>setShowReturn(!showReturn)} style={{width:'100%'}}>
                  <span className="material-symbols-rounded">undo</span> Return to Staff
                </button>
                {showReturn && (
                  <div style={{marginTop:'8px'}}>
                    <textarea className="form-control" rows="3" placeholder="Reason for returning to staff (optional)" value={returnReason} onChange={e=>setReturnReason(e.target.value)} />
                    <button className="btn btn-secondary" onClick={handleReturnToStaff} disabled={processing} style={{width:'100%',marginTop:'8px'}}>{processing?'Processing...':'Confirm Return'}</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {app.status === 'approved' && (
            <div className="card" style={{marginTop:'12px',borderColor:'var(--success)'}}>
              <div className="card-title" style={{color:'var(--success)'}}>✓ Loan Approved</div>
              <p style={{color:'var(--text-secondary)'}}>Approved on {formatDate(app.approved_at)}</p>
            </div>
          )}

          {app.status === 'rejected' && (
            <div className="card" style={{marginTop:'12px',borderColor:'var(--danger)'}}>
              <div className="card-title" style={{color:'var(--danger)'}}>✕ Loan Rejected</div>
              <p style={{color:'var(--text-secondary)'}}>Reason: {app.admin_remark || 'N/A'}</p>
            </div>
          )}

          {app.appointment_date && <div className="card" style={{marginTop:'12px'}}><div className="card-title">Appointment</div>
            <div className="review-item"><span>Date</span><span>{formatDate(app.appointment_date)}</span></div>
            {app.appointment_time && <div className="review-item"><span>Time</span><span>{app.appointment_time}</span></div>}
          </div>}
        </div>
      </div>

      {zoomDoc && (
        <div className="modal-overlay" onClick={()=>setZoomDoc(null)} style={{zIndex:9999,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',position:'fixed',inset:0}}>
          <div onClick={e=>e.stopPropagation()} style={{position:'relative',maxWidth:'90vw',maxHeight:'90vh',display:'flex',flexDirection:'column',background:'transparent'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <span style={{color:'#fff',fontSize:'14px',fontWeight:600}}>{zoomDoc.file_name}</span>
              <div style={{display:'flex',gap:'8px'}}>
                <a href={`/${zoomDoc.file_url}`} download className="btn btn-sm btn-secondary" style={{textDecoration:'none'}}><span className="material-symbols-rounded" style={{fontSize:'16px'}}>download</span> Download</a>
                <button className="btn btn-sm btn-secondary" onClick={()=>setZoomDoc(null)}>✕</button>
              </div>
            </div>
            <img src={`/${zoomDoc.file_url}`} alt={zoomDoc.file_name} style={{maxWidth:'100%',maxHeight:'calc(90vh - 50px)',borderRadius:'8px',objectFit:'contain'}} onError={e=>{e.target.style.display='none'}} />
          </div>
        </div>
      )}
    </>
  )
}
