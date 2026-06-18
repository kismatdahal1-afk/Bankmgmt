import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { saveLoanDraft, submitLoanApplication, uploadLoanDocument, deleteLoanDocument, getLoanApplication } from '../../services/loanApplicationService'
import { getCustomerProfile, updateCustomerProfile } from '../../services/customerService'
import { formatCurrency, formatDate, calculateEMI } from '../../utils/helpers'

const STEPS = ['Loan Details', 'Documents', 'Review', 'Submitted']
const LOAN_TYPES = ['Personal Loan', 'Business Loan', 'Agriculture Loan', 'Emergency Loan']
const COLLATERAL_TYPES = ['Land', 'Building', 'Vehicle', 'Gold', 'Fixed Deposit', 'Other', 'None']
const DOC_TYPES = [
  { key: 'citizenship', label: 'Citizenship / National ID', accept: '.jpg,.jpeg,.png', icon: 'badge' },
  { key: 'income_proof', label: 'Income Proof', accept: '.jpg,.jpeg,.png', icon: 'receipt_long' },
  { key: 'collateral', label: 'Collateral Document', accept: '.jpg,.jpeg,.png', icon: 'description' }
]

export default function LoanApplyWizard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const appIdParam = searchParams.get('id')

  const [step, setStep] = useState(0)
  const [appId, setAppId] = useState(appIdParam || null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [checked, setChecked] = useState(false)
  const [submittedApp, setSubmittedApp] = useState(null)
  const [personal, setPersonal] = useState(null)
  const [personalSaving, setPersonalSaving] = useState(false)

  const [form, setForm] = useState({
    loan_type: '', amount: '', duration_months: '', purpose: '', collateral_type: '', interest_rate: 12.00
  })

  const [documents, setDocuments] = useState({ citizenship: null, income_proof: null, collateral: null })
  const [uploading, setUploading] = useState({})
  const [docErrors, setDocErrors] = useState({})
  const [previews, setPreviews] = useState({})

  const emi = calculateEMI(parseFloat(form.amount) || 0, parseFloat(form.interest_rate) || 0, parseInt(form.duration_months) || 0)

  const fetchApplication = useCallback(async (id) => {
    try {
      const res = await getLoanApplication(id)
      const app = res.data.application
      setForm({
        loan_type: app.loan_type || '', amount: app.amount || '', duration_months: app.duration_months || '',
        purpose: app.purpose || '', collateral_type: app.collateral_type || '', interest_rate: app.interest_rate || 12.00
      })
      const docs = { citizenship: null, income_proof: null, collateral: null }
      app.documents.forEach(d => { docs[d.document_type] = d })
      setDocuments(docs)
      if (app.status === 'submitted') { setStep(3); setSubmittedApp(app) }
    } catch (e) { setError('Failed to load application') }
  }, [])

  useEffect(() => { if (appId) fetchApplication(appId) }, [appId, fetchApplication])

  useEffect(() => {
    getCustomerProfile().then(res => setPersonal(res.data.customer)).catch(() => {})
  }, [])

  const handlePersonalChange = (field, value) => setPersonal(prev => ({ ...prev, [field]: value }))

  const handleSavePersonal = async () => {
    setPersonalSaving(true)
    try {
      const res = await updateCustomerProfile({
        email: personal.email,
        alternate_mobile: personal.alternate_mobile,
        address: personal.address,
        permanent_address: personal.permanent_address,
        temporary_address: personal.temporary_address,
        occupation: personal.occupation
      })
      setPersonal(res.data.customer)
      setSuccess('Personal details updated'); setTimeout(() => setSuccess(''), 2000)
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update profile')
    } finally { setPersonalSaving(false) }
  }

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const saveDraft = async () => {
    setSaving(true); setError('')
    try {
      const payload = { ...form, application_id: appId || undefined }
      const res = await saveLoanDraft(payload)
      if (!appId) setAppId(res.data.application.id)
      setSuccess('Draft saved'); setTimeout(() => setSuccess(''), 2000)
      return true
    } catch (e) { setError(e.response?.data?.error || 'Save failed'); return false }
    finally { setSaving(false) }
  }

  const handleNext = async () => {
    if (step === 0) {
      if (!form.loan_type || !form.amount || !form.duration_months || !form.collateral_type) {
        setError('Please fill all required fields'); return
      }
      if (parseFloat(form.amount) <= 0) { setError('Amount must be > 0'); return }
      const ok = await saveDraft()
      if (ok) { setError(''); setStep(1) }
    } else if (step === 1) {
      const missing = DOC_TYPES.filter(dt => !documents[dt.key])
      if (missing.length > 0) { setError('Please upload all required documents'); return }
      setError(''); setStep(2)
    }
  }

  const handleBack = () => { setStep(Math.max(0, step - 1)); setError('') }

  const handleFileUpload = async (docType, file) => {
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { setDocErrors(prev => ({ ...prev, [docType]: 'File size exceeds the maximum limit of 3 MB.' })); return }
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['jpg', 'jpeg', 'png'].includes(ext)) { setDocErrors(prev => ({ ...prev, [docType]: 'Only JPG, JPEG and PNG image files are allowed.' })); return }
    setUploading(prev => ({ ...prev, [docType]: true })); setDocErrors(prev => ({ ...prev, [docType]: '' }))
    try {
      if (!appId) { const draft = await saveLoanDraft({ ...form }); setAppId(draft.data.application.id) }
      const fd = new FormData()
      fd.append('application_id', appId); fd.append('document_type', docType); fd.append('file', file)
      const res = await uploadLoanDocument(fd)
      setDocuments(prev => ({ ...prev, [docType]: res.data.document }))
      const reader = new FileReader()
      reader.onload = e => setPreviews(prev => ({ ...prev, [docType]: e.target.result }))
      reader.readAsDataURL(file)
    } catch (e) { setDocErrors(prev => ({ ...prev, [docType]: e.response?.data?.error || 'Upload failed' })) }
    finally { setUploading(prev => ({ ...prev, [docType]: false })) }
  }

  const handleRemoveDoc = async (docType) => {
    const doc = documents[docType]
    setPreviews(prev => ({ ...prev, [docType]: null }))
    if (!doc || !doc.id) { setDocuments(prev => ({ ...prev, [docType]: null })); return }
    try { await deleteLoanDocument(doc.id); setDocuments(prev => ({ ...prev, [docType]: null })) }
    catch (e) { setError('Failed to remove document') }
  }

  const handleSubmit = async () => {
    if (!checked) { setError('Please confirm the information is correct'); return }
    setSubmitting(true); setError('')
    try {
      const res = await submitLoanApplication({ application_id: appId })
      setSubmittedApp(res.data.application)
      setSuccess('Application submitted successfully!')
      setStep(3)
    } catch (e) { setError(e.response?.data?.error || 'Submission failed') }
    finally { setSubmitting(false) }
  }

  const renderProgress = () => (
    <div className="loan-progress-tracker">
      {STEPS.map((s, i) => {
        let cls = 'step'
        if (i < step) cls += ' completed'; else if (i === step) cls += ' active'; else cls += ' pending'
        return (
          <div key={s} className={cls}>
            <div className="step-indicator">
              {i < step ? <span className="material-symbols-rounded">check</span> : i === step ? <span className="material-symbols-rounded">radio_button_checked</span> : <span>{i + 1}</span>}
            </div>
            <span className="step-label">{s}</span>
            {i < STEPS.length - 1 && <div className="step-connector" />}
          </div>
        )
      })}
    </div>
  )

  const renderStep1 = () => (
    <div className="loan-wizard-layout">
      <div className="form-card" style={{ flex: 1, maxWidth: '620px' }}>
        <h3 className="section-title"><span className="material-symbols-rounded" style={{ color: 'var(--accent-color)' }}>info</span>Loan Information</h3>
        <div className="form-group">
          <label>Loan Type <span className="text-danger">*</span></label>
          <select className="form-control" value={form.loan_type} onChange={e => handleChange('loan_type', e.target.value)}>
            <option value="">Select Loan Type</option>
            {LOAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Loan Amount (NPR) <span className="text-danger">*</span></label>
            <input type="number" className="form-control" placeholder="e.g. 100000" min="1" value={form.amount} onChange={e => handleChange('amount', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Duration (Months) <span className="text-danger">*</span></label>
            <input type="number" className="form-control" placeholder="e.g. 12" min="1" max="120" value={form.duration_months} onChange={e => handleChange('duration_months', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Interest Rate (% p.a.)</label>
            <input type="number" className="form-control" value={form.interest_rate} onChange={e => handleChange('interest_rate', e.target.value)} step="0.1" />
          </div>
          <div className="form-group">
            <label>Collateral Type <span className="text-danger">*</span></label>
            <select className="form-control" value={form.collateral_type} onChange={e => handleChange('collateral_type', e.target.value)}>
              <option value="">Select Collateral</option>
              {COLLATERAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Purpose of Loan</label>
          <textarea className="form-control" rows="3" placeholder="Describe the purpose of this loan..." value={form.purpose} onChange={e => handleChange('purpose', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={saveDraft} disabled={saving}>
            <span className="material-symbols-rounded">{saving ? 'sync' : 'save'}</span>{saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button className="btn btn-primary" onClick={handleNext}>Next <span className="material-symbols-rounded">arrow_forward</span></button>
        </div>
      </div>
      <div className="form-card emi-card">
        <h3 className="section-title"><span className="material-symbols-rounded" style={{ color: 'var(--accent-color)' }}>calculate</span>EMI Calculator</h3>
        <div className="emi-summary">
          <div className="emi-row"><span>Loan Amount</span><span className="emi-value">{formatCurrency(form.amount || 0)}</span></div>
          <div className="emi-row"><span>Interest Rate</span><span className="emi-value">{form.interest_rate || 0}%</span></div>
          <div className="emi-row"><span>Duration</span><span className="emi-value">{form.duration_months || 0} months</span></div>
          <div className="emi-divider" />
          <div className="emi-row highlight"><span>Monthly EMI</span><span className="emi-value accent">{formatCurrency(emi.emi)}</span></div>
          <div className="emi-row"><span>Total Interest</span><span className="emi-value warning">{formatCurrency(emi.totalInterest)}</span></div>
          <div className="emi-row highlight"><span>Total Repayment</span><span className="emi-value success">{formatCurrency(emi.totalPayable)}</span></div>
        </div>
        <p className="emi-note">*Calculated at {form.interest_rate}% annual interest on reducing balance</p>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div>
      <h3 className="section-title"><span className="material-symbols-rounded" style={{ color: 'var(--accent-color)' }}>upload_file</span>Upload Required Documents</h3>
      <div className="loan-docs-grid">
        {DOC_TYPES.map(dt => {
          const doc = documents[dt.key]
          return (
            <div key={dt.key} className="doc-upload-card" onClick={() => { if (!doc) document.getElementById(`file-${dt.key}`)?.click() }} style={{ cursor: doc ? 'default' : 'pointer' }}>
              {!doc ? (
                <>
                  <div className="doc-header">
                    <span className="material-symbols-rounded doc-icon">{dt.icon}</span>
                    <div>
                      <div className="doc-label">{dt.label}</div>
                      <div className="doc-status text-muted">⚠ Missing</div>
                    </div>
                  </div>
                  <div className="doc-dropzone-inner" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(dt.key, f) }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '40px', color: 'var(--text-muted)' }}>cloud_upload</span>
                    <p>Drag & drop or <span className="browse-link">browse</span></p>
                    <p className="doc-hint">JPG, PNG, JPEG (max 3MB)</p>
                    <input id={`file-${dt.key}`} type="file" accept={dt.accept} style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) handleFileUpload(dt.key, f) }} />
                  </div>
                </>
              ) : (
                <>
                  <div className="doc-header">
                    <span className="material-symbols-rounded doc-icon" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)' }}>check_circle</span>
                    <div>
                      <div className="doc-label">{dt.label}</div>
                      <div className="doc-status text-success">✓ Uploaded</div>
                    </div>
                  </div>
                  <div className="doc-preview-card">
                    {previews[dt.key] ? (
                      <img src={previews[dt.key]} alt={doc.file_name} className="doc-preview-img" />
                    ) : (
                      <div className="doc-placeholder">
                        <span className="material-symbols-rounded" style={{ fontSize: '36px' }}>description</span>
                      </div>
                    )}
                    <div className="doc-meta">
                      <span className="doc-filename">{doc.file_name}</span>
                      {doc.file_size && <span className="doc-size">{(doc.file_size / 1024).toFixed(1)} KB</span>}
                    </div>
                    <div className="doc-actions">
                      <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>sync</span> Replace
                        <input type="file" accept={dt.accept} style={{ display: 'none' }}
                          onChange={e => { const f = e.target.files[0]; if (f) { handleRemoveDoc(dt.key); handleFileUpload(dt.key, f) } }} />
                      </label>
                      <button className="btn btn-sm btn-danger" onClick={() => handleRemoveDoc(dt.key)}>
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>delete</span> Remove
                      </button>
                    </div>
                  </div>
                </>
              )}
              {uploading[dt.key] && <div className="doc-uploading"><span className="material-symbols-rounded">sync</span> Uploading...</div>}
              {docErrors[dt.key] && <div className="doc-error">{docErrors[dt.key]}</div>}
            </div>
          )
        })}
      </div>

      {personal && (
        <div className="form-card" style={{ marginTop: '24px', maxWidth: '100%' }}>
          <h3 className="section-title">
            <span className="material-symbols-rounded" style={{ color: 'var(--accent-color)' }}>person</span>
            Applicant Profile
          </h3>

          <h4 style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Personal Information</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" className="form-control" value={personal.full_name || ''} disabled />
            </div>
            <div className="form-group">
              <label>Father Name</label>
              <input type="text" className="form-control" value={personal.father_name || ''} disabled />
            </div>
            <div className="form-group">
              <label>Grandfather Name</label>
              <input type="text" className="form-control" value={personal.grandfather_name || ''} disabled />
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input type="text" className="form-control" value={personal.dob ? formatDate(personal.dob) : ''} disabled />
            </div>
            <div className="form-group">
              <label>Gender</label>
              <input type="text" className="form-control" value={personal.gender || ''} disabled />
            </div>
            <div className="form-group">
              <label>Citizenship Number</label>
              <input type="text" className="form-control" value={personal.citizenship_id || ''} disabled />
            </div>
            <div className="form-group">
              <label>Citizenship Issue District</label>
              <input type="text" className="form-control" value={personal.citizenship_issue_district || ''} disabled />
            </div>
            <div className="form-group">
              <label>Marital Status</label>
              <input type="text" className="form-control" value={personal.marital_status || ''} disabled />
            </div>
            <div className="form-group">
              <label>Occupation</label>
              <input type="text" className="form-control" value={personal.occupation || ''}
                onChange={e => handlePersonalChange('occupation', e.target.value)} />
            </div>
          </div>

          <h4 style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Contact Information</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div className="form-group">
              <label>Mobile Number</label>
              <input type="text" className="form-control" value={personal.phone_number || ''} disabled />
            </div>
            <div className="form-group">
              <label>Alternate Mobile</label>
              <input type="text" className="form-control" value={personal.alternate_mobile || ''}
                onChange={e => handlePersonalChange('alternate_mobile', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" className="form-control" value={personal.email || ''}
                onChange={e => handlePersonalChange('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Permanent Address</label>
              <textarea className="form-control" rows="2" value={personal.permanent_address || personal.address || ''}
                onChange={e => handlePersonalChange('permanent_address', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Current Address</label>
              <textarea className="form-control" rows="2" value={personal.temporary_address || ''}
                onChange={e => handlePersonalChange('temporary_address', e.target.value)} />
            </div>
          </div>

          <h4 style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Nominee Information</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Nominee Name</label>
              <input type="text" className="form-control" value={personal.nominee_name || ''} disabled />
            </div>
            <div className="form-group">
              <label>Nominee Contact</label>
              <input type="text" className="form-control" value={personal.nominee_contact || ''} disabled />
            </div>
            <div className="form-group">
              <label>Nominee Relationship</label>
              <input type="text" className="form-control" value={personal.nominee_relationship || ''} disabled />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={handleSavePersonal} disabled={personalSaving}>
              <span className="material-symbols-rounded">{personalSaving ? 'sync' : 'save'}</span>
              {personalSaving ? 'Saving...' : 'Save Personal Details'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'space-between' }}>
        <button className="btn btn-secondary" onClick={handleBack}><span className="material-symbols-rounded">arrow_back</span> Back</button>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={saveDraft} disabled={saving}>
            <span className="material-symbols-rounded">{saving ? 'sync' : 'save'}</span>{saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button className="btn btn-primary" onClick={handleNext}>Next <span className="material-symbols-rounded">arrow_forward</span></button>
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div>
      <h3 className="section-title"><span className="material-symbols-rounded" style={{ color: 'var(--accent-color)' }}>fact_check</span>Review & Confirmation</h3>
      <div className="loan-review-grid">
        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><span className="material-symbols-rounded" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>info</span>Loan Details</span>
            <button className="btn btn-sm btn-secondary" onClick={() => setStep(0)}><span className="material-symbols-rounded" style={{ fontSize: '16px' }}>edit</span> Edit</button>
          </div>
          <div className="review-item"><span>Loan Type</span><span>{form.loan_type}</span></div>
          <div className="review-item"><span>Amount</span><span>{formatCurrency(form.amount)}</span></div>
          <div className="review-item"><span>Duration</span><span>{form.duration_months} months</span></div>
          <div className="review-item"><span>Collateral</span><span>{form.collateral_type || 'N/A'}</span></div>
          <div className="review-item"><span>Purpose</span><span>{form.purpose || 'N/A'}</span></div>
        </div>
        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><span className="material-symbols-rounded" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>calculate</span>EMI Summary</span>
            <button className="btn btn-sm btn-secondary" onClick={() => setStep(0)}><span className="material-symbols-rounded" style={{ fontSize: '16px' }}>edit</span> Edit</button>
          </div>
          <div className="review-item"><span>Monthly EMI</span><span style={{ color: 'var(--accent-color)', fontWeight: 700 }}>{formatCurrency(emi.emi)}</span></div>
          <div className="review-item"><span>Total Interest</span><span style={{ color: 'var(--warning)' }}>{formatCurrency(emi.totalInterest)}</span></div>
          <div className="review-item"><span>Total Repayment</span><span style={{ color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(emi.totalPayable)}</span></div>
        </div>
        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><span className="material-symbols-rounded" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>upload_file</span>Documents</span>
            <button className="btn btn-sm btn-secondary" onClick={() => setStep(1)}><span className="material-symbols-rounded" style={{ fontSize: '16px' }}>edit</span> Edit</button>
          </div>
          {DOC_TYPES.map(dt => {
            const preview = previews[dt.key]
            const doc = documents[dt.key]
            return (
              <div key={dt.key} className="review-doc-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <span className="doc-label-sm">{dt.label}</span>
                  {preview ? (
                    <img src={preview} alt="" className="review-doc-thumb" />
                  ) : doc ? (
                    <span className="material-symbols-rounded" style={{ color: 'var(--success)', fontSize: '20px' }}>check_circle</span>
                  ) : (
                    <span className="material-symbols-rounded" style={{ color: 'var(--danger)', fontSize: '20px' }}>cancel</span>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {doc && <span className="doc-filename" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{doc.file_name}</span>}
                    <span style={{ fontSize: '11px', color: doc ? 'var(--success)' : 'var(--danger)' }}>{doc ? '✓ Uploaded' : '✕ Missing'}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {personal && (
          <div className="card">
            <div className="card-title">
              <span className="material-symbols-rounded" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>person</span>
              Applicant Profile
            </div>
            <div className="review-item"><span>Full Name</span><span>{personal.full_name}</span></div>
            <div className="review-item"><span>Father Name</span><span>{personal.father_name || '—'}</span></div>
            <div className="review-item"><span>Grandfather Name</span><span>{personal.grandfather_name || '—'}</span></div>
            <div className="review-item"><span>Date of Birth</span><span>{personal.dob ? formatDate(personal.dob) : '—'}</span></div>
            <div className="review-item"><span>Gender</span><span>{personal.gender || '—'}</span></div>
            <div className="review-item"><span>Citizenship Number</span><span>{personal.citizenship_id}</span></div>
            <div className="review-item"><span>Citizenship Issue District</span><span>{personal.citizenship_issue_district || '—'}</span></div>
            <div className="review-item"><span>Marital Status</span><span>{personal.marital_status || '—'}</span></div>
            <div className="review-item"><span>Occupation</span><span>{personal.occupation || '—'}</span></div>
            <div className="review-item"><span>Mobile Number</span><span>{personal.phone_number}</span></div>
            <div className="review-item"><span>Alternate Mobile</span><span>{personal.alternate_mobile || '—'}</span></div>
            <div className="review-item"><span>Email</span><span>{personal.email || '—'}</span></div>
            <div className="review-item"><span>Permanent Address</span><span>{personal.permanent_address || personal.address || '—'}</span></div>
            <div className="review-item"><span>Current Address</span><span>{personal.temporary_address || '—'}</span></div>
            <div className="review-item"><span>Nominee Name</span><span>{personal.nominee_name || '—'}</span></div>
            <div className="review-item"><span>Nominee Contact</span><span>{personal.nominee_contact || '—'}</span></div>
            <div className="review-item"><span>Nominee Relationship</span><span>{personal.nominee_relationship || '—'}</span></div>
          </div>
        )}
      </div>
      <div className="terms-section">
        <label className="terms-label">
          <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />
          <span>I confirm all the information provided is accurate and complete.</span>
        </label>
      </div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'space-between' }}>
        <button className="btn btn-secondary" onClick={handleBack}><span className="material-symbols-rounded">arrow_back</span> Back</button>
        <button className="btn btn-success" onClick={handleSubmit} disabled={submitting || !checked} style={{ minWidth: '200px' }}>
          <span className="material-symbols-rounded">{submitting ? 'sync' : 'send'}</span>
          {submitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="success-container">
      <div className="success-icon">
        <span className="material-symbols-rounded">check_circle</span>
      </div>
      <h2 className="success-title">Application Submitted Successfully</h2>
      <div className="success-details">
        <div className="success-row"><span>Loan Request ID</span><span className="mono">{submittedApp?.application_number || '—'}</span></div>
        <div className="success-row"><span>Application Date</span><span>{submittedApp?.submitted_at ? new Date(submittedApp.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span></div>
        <div className="success-row"><span>Current Status</span><span className="badge badge-success">Submitted</span></div>
      </div>
      <button className="btn btn-primary" onClick={() => navigate(`/user/loans/tracking/${submittedApp?.id || appId}`)} style={{ marginTop: '24px' }}>
        <span className="material-symbols-rounded">track_changes</span> Go To Loan Tracking
      </button>
    </div>
  )

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">{step < 3 ? 'Apply for New Loan' : 'Application Submitted'}</div>
          <div className="page-subtitle">
            {step === 0 ? 'Fill in your loan details' : step === 1 ? 'Upload required documents' : step === 2 ? 'Review and confirm your application' : 'Your application has been received'}
          </div>
        </div>
      </div>
      {step < 3 && renderProgress()}
      {error && <div className="flash-message flash-danger" style={{ marginBottom: '16px' }}><span>{error}</span><button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button></div>}
      {success && step < 3 && <div className="flash-message flash-success" style={{ marginBottom: '16px' }}><span>{success}</span></div>}
      {step === 0 && renderStep1()}
      {step === 1 && renderStep2()}
      {step === 2 && renderStep3()}
      {step === 3 && renderStep4()}
    </>
  )
}
