import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import ReceiptView from '../../components/common/ReceiptView'

export default function TransferSuccess() {
  const location = useLocation()
  const navigate = useNavigate()
  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const txData = location.state?.transferData || {}
  const reference = txData.reference || location.state?.reference

  useEffect(() => {
    if (!reference) {
      setError('No transaction reference found.')
      setLoading(false)
      return
    }

    if (txData.amount && txData.from_customer && txData.to_customer) {
      const now = new Date()
      setReceipt({
        reference: reference,
        transaction_type: 'Fund Transfer',
        status: 'successful',
        date: txData.date || now.toISOString().slice(0, 10),
        time: txData.time || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        from_account: txData.from_account || '',
        from_account_type: txData.from_account_type || '',
        from_customer: txData.from_customer || '',
        to_account: txData.to_account || '',
        to_account_type: txData.to_account_type || '',
        to_customer: txData.to_customer || '',
        amount: Number(txData.amount),
        remaining_balance: Number(txData.from_balance_after || 0),
        description: txData.description || ''
      })
      setLoading(false)
      return
    }

    api.get(`/customer/transaction-receipt/${reference}`)
      .then(r => {
        setReceipt(r.data.receipt)
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load receipt details.')
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference])

  if (loading) {
    return <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading receipt...</div></div>
  }

  if (error) {
    return (
      <>
        <div className="page-header">
          <div>
            <div className="page-title">Transfer Status</div>
          </div>
        </div>
        <div className="badge badge-danger" style={{ marginBottom: '16px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'none', fontWeight: 500, fontSize: '13px', letterSpacing: '0', width: 'fit-content' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>error</span>
          {error}
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/user/transfer')}>
          <span className="material-symbols-rounded">arrow_back</span>
          Back to Transfer
        </button>
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Transfer Successful</div>
          <div className="page-subtitle">Your fund transfer has been completed successfully.</div>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/user/transfer')}>
          <span className="material-symbols-rounded">send_money</span>
          New Transfer
        </button>
      </div>

      <ReceiptView
        receipt={receipt}
        variant="success"
        showActions={true}
      />
    </>
  )
}
