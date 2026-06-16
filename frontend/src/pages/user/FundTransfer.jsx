import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { formatCurrency } from '../../utils/helpers'

export default function FundTransfer() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [fromId, setFromId] = useState('')
  const [toNumber, setToNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/customer/accounts')
      .then(r => {
        const accs = r.data.accounts || []
        setAccounts(accs)
        if (accs.length > 0) setFromId(String(accs[0].id))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const selected = accounts.find(a => String(a.id) === fromId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const res = await api.post('/customer/transfer', {
        from_account_id: fromId,
        to_account_number: toNumber,
        amount,
        description
      })
      const tx = res.data.transaction
      navigate('/user/transfer/success', {
        state: {
          transferData: tx,
          reference: tx.reference
        }
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Transfer failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Fund Transfer</div>
          <div className="page-subtitle">Send money to another account.</div>
        </div>
      </div>

      {error && (
        <div className="badge badge-danger" style={{ marginBottom: '16px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'none', fontWeight: 500, fontSize: '13px', letterSpacing: '0', width: 'fit-content' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>error</span>
          {error}
        </div>
      )}
      {success && (
        <div className="badge badge-success" style={{ marginBottom: '16px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'none', fontWeight: 500, fontSize: '13px', letterSpacing: '0', width: 'fit-content' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>check_circle</span>
          {success}
        </div>
      )}

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div className="form-card" style={{ flex: 1, maxWidth: '550px' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="from">From Account</label>
              <select id="from" className="form-control" value={fromId} onChange={e => setFromId(e.target.value)} required>
                <option value="" disabled>Select source account</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.account_number} &mdash; {formatCurrency(a.balance)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="to">To Account Number</label>
              <input type="text" id="to" className="form-control" placeholder="Enter account number"
                value={toNumber} onChange={e => setToNumber(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="amount">Amount (NPR)</label>
              <input type="number" id="amount" className="form-control"
                step="0.01" min="1" placeholder="0.00"
                value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="desc">Description (optional)</label>
              <input type="text" id="desc" className="form-control" placeholder="e.g. Rent payment"
                value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }} disabled={submitting}>
              <span className="material-symbols-rounded">{submitting ? 'sync' : 'send_money'}</span>
              {submitting ? 'Processing...' : 'Send Transfer'}
            </button>
          </form>
        </div>

        <div className="form-card" style={{ flex: 1, maxWidth: '400px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderStyle: 'dashed' }}>
          <h3 style={{ marginBottom: '20px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--accent-color)' }}>receipt</span>
            Transfer Summary
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>From:</span>
              <span style={{ fontWeight: 600, color: '#fff', textAlign: 'right' }}>{selected ? `${selected.account_number}` : '\u2014'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Available Balance:</span>
              <span style={{ fontWeight: 600, color: '#fff' }}>{selected ? formatCurrency(selected.balance) : '\u2014'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Transfer Amount:</span>
              <span style={{ fontWeight: 700, color: 'var(--warning)', fontSize: '1.1rem' }}>{amount ? formatCurrency(amount) : '\u2014'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>To Account:</span>
              <span style={{ fontWeight: 600, color: '#fff' }}>{toNumber || '\u2014'}</span>
            </div>
            {description && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Note:</span>
                <span style={{ fontWeight: 500, color: '#fff', textAlign: 'right' }}>{description}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
