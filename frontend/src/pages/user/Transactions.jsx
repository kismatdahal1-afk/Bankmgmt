import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import { formatCurrency, formatDateTime } from '../../utils/helpers'
import StatusBadge from '../../components/common/StatusBadge'
import ReceiptView, { buildPrintHTML } from '../../components/common/ReceiptView'
import Pagination from '../../components/common/Pagination'

export default function UserTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [receiptData, setReceiptData] = useState(null)
  const [receiptLoading, setReceiptLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const buildUrl = () => {
    const params = new URLSearchParams()
    if (filterType) params.set('type', filterType)
    if (filterStatus) params.set('status', filterStatus)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    const qs = params.toString()
    return `/customer/transactions${qs ? '?' + qs : ''}`
  }

  const fetchData = () => {
    setLoading(true)
    api.get(buildUrl())
      .then(r => { setTransactions(r.data.transactions || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = () => {
    setFilterType('')
    setFilterStatus('')
    setDateFrom('')
    setDateTo('')
    api.get('/customer/transactions')
      .then(r => { setTransactions(r.data.transactions || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const exportCSV = () => {
    const headers = ['Date', 'Account', 'Type', 'Status', 'Amount', 'Balance After']
    const rows = transactions.map(t => [
      t.created_at,
      t.account?.account_number || '',
      t.type,
      t.status || 'successful',
      t.amount,
      t.balance_after
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const closeReceipt = () => { setReceipt(null); setReceiptData(null) }

  useEffect(() => {
    if (receipt) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [receipt])

  const exportPDF = () => {
    const printWindow = window.open('', '_blank')
    const rows = transactions.map(t => `
      <tr>
        <td>${formatDateTime(t.created_at)}</td>
        <td>${t.account?.account_number || ''}</td>
        <td>${t.type}</td>
        <td>${t.status || 'successful'}</td>
        <td style="text-align:right">${t.type === 'deposit' || t.type === 'transfer_in' ? '+' : '-'} ${formatCurrency(t.amount)}</td>
        <td style="text-align:right">${formatCurrency(t.balance_after)}</td>
      </tr>
    `).join('')
    printWindow.document.write(`
      <html>
      <head>
        <title>Transaction Statement</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .sub { color: #666; font-size: 13px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f5f5f5; text-align: left; padding: 8px 10px; border-bottom: 2px solid #ddd; }
          td { padding: 6px 10px; border-bottom: 1px solid #eee; }
          .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <h1>Transaction Statement</h1>
        <div class="sub">Generated on ${new Date().toLocaleDateString()} &middot; ${transactions.length} transactions</div>
        <table>
          <thead><tr><th>Date</th><th>Account</th><th>Type</th><th>Status</th><th style="text-align:right">Amount</th><th style="text-align:right">Balance</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">Village Bank &middot; Confidential</div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const fetchReceipt = (txn) => {
    setReceiptLoading(true)
    setReceiptData(null)
    if (txn.type === 'transfer_out' || txn.type === 'transfer_in') {
      if (txn.reference_number) {
        api.get(`/customer/transaction-receipt/${txn.reference_number}`)
          .then(r => { setReceiptData(r.data.receipt); setReceiptLoading(false) })
          .catch(() => setReceiptLoading(false))
        return
      }
    }
    const now = new Date(txn.created_at)
    setReceiptData({
      reference: txn.reference_number || txn.transaction_uuid,
      transaction_type: txn.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      status: txn.status || 'successful',
      date: now.toISOString().slice(0, 10),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      from_account: txn.account_number || txn.account?.account_number || '',
      from_customer: txn.customer_name || '',
      to_account: '',
      to_customer: '',
      amount: Number(txn.amount),
      remaining_balance: Number(txn.balance_after),
      description: txn.description || ''
    })
    setReceiptLoading(false)
  }

  const paginatedTransactions = useMemo(() => transactions.slice((currentPage - 1) * pageSize, currentPage * pageSize), [transactions, currentPage, pageSize])

  useEffect(() => { setCurrentPage(1) }, [transactions.length])

  const handleViewReceipt = () => {
    if (!receiptData) return
    const w = window.open('', '_blank')
    w.document.write(buildPrintHTML(receiptData))
    w.document.close()
  }

  const handleDownloadPDF = () => {
    if (!receiptData) return
    const w = window.open('', '_blank')
    w.document.write(buildPrintHTML(receiptData, true))
    w.document.close()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Transaction History</div>
          <div className="page-subtitle">Complete ledger of deposits and withdrawals.</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0, minWidth: '120px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="form-control" style={{ padding: '4px 8px', fontSize: '0.85rem' }}>
              <option value="">All Types</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="transfer_in">Transfer In</option>
              <option value="transfer_out">Transfer Out</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '120px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-control" style={{ padding: '4px 8px', fontSize: '0.85rem' }}>
              <option value="">All Status</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '130px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-control" style={{ padding: '4px 8px', fontSize: '0.85rem' }} />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '130px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="form-control" style={{ padding: '4px 8px', fontSize: '0.85rem' }} />
          </div>
          <button onClick={fetchData} className="btn btn-sm btn-secondary" style={{ padding: '4px 12px', fontSize: '0.85rem', height: '32px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>filter_alt</span> Filter
          </button>
          <button onClick={handleReset} className="btn btn-sm btn-secondary" style={{ padding: '4px 12px', fontSize: '0.85rem', height: '32px' }}>
            Reset
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={exportCSV} className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '6px 14px', height: '32px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>file_download</span> CSV
          </button>
          <button onClick={exportPDF} className="btn btn-sm" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', padding: '6px 14px', height: '32px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>picture_as_pdf</span> PDF
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Account</th>
              <th>Type</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ textAlign: 'right' }}>Balance After</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6"><div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div></td></tr>
            ) : transactions.length > 0 ? (
              paginatedTransactions.map((txn, i) => (
                <tr key={i} onClick={() => { setReceipt(txn); fetchReceipt(txn); }} style={{ cursor: 'pointer' }}>
                  <td className="text-muted">{formatDateTime(txn.created_at)}</td>
                  <td className="mono">{txn.account?.account_number}</td>
                  <td><StatusBadge status={txn.type} /></td>
                  <td><StatusBadge status={txn.status || 'successful'} /></td>
                  <td style={{ textAlign: 'right' }} className={txn.type === 'deposit' || txn.type === 'transfer_in' ? 'amount-pos' : 'amount-neg'}>
                    {txn.type === 'deposit' || txn.type === 'transfer_in' ? '+' : '\u2212'} {formatCurrency(txn.amount)}
                  </td>
                  <td style={{ textAlign: 'right' }} className="mono">{formatCurrency(txn.balance_after)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">
                  <div className="empty">
                    <span className="material-symbols-rounded">receipt_long</span>
                    <div>No transactions found.</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination currentPage={currentPage} totalItems={transactions.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
      </div>

      {receipt && (
        <div className="modal-overlay" onClick={closeReceipt}>
          <div className="modal-receipt-wrap" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <button className="receipt-close-btn" onClick={closeReceipt}>Close</button>
              {receiptLoading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', width: '100%' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '2.5rem', color: 'var(--text-muted)' }}>sync</span>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Loading receipt...</div>
                </div>
              ) : receiptData ? (
                <ReceiptView
                  receipt={receiptData}
                  showActions={true}
                  onViewReceipt={handleViewReceipt}
                  onDownloadPDF={handleDownloadPDF}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0', width: '100%' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '2.5rem', color: 'var(--text-muted)' }}>receipt_long</span>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Receipt not available.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 20px;
        }
        .modal-receipt-wrap {
          width: 100%; max-width: 680px;
          max-height: 85vh; overflow-y: auto;
        }
        .receipt-close-btn {
          background: rgba(239,68,68,0.12); color: var(--danger);
          border: 1px solid rgba(239,68,68,0.3);
          padding: 4px 14px; border-radius: 999px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.4px;
          cursor: pointer; transition: all 0.2s;
          text-transform: uppercase;
        }
        .receipt-close-btn:hover { background: rgba(239,68,68,0.2); }
        .modal-receipt-wrap::-webkit-scrollbar { width: 6px; }
        .modal-receipt-wrap::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
      `}</style>
    </>
  )
}
