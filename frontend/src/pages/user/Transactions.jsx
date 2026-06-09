import React, { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import { formatCurrency, formatDateTime } from '../../utils/helpers'
import StatusBadge from '../../components/common/StatusBadge'

export default function UserTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [receipt, setReceipt] = useState(null)
  const printRef = useRef()

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

  useEffect(() => { fetchData() }, [])

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
        <\/script>
      </body>
      </html>
    `)
    printWindow.document.close()
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
              transactions.map((txn, i) => (
                <tr key={i} onClick={() => setReceipt(txn)} style={{ cursor: 'pointer' }}>
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
      </div>

      {receipt && (
        <div className="modal-overlay" onClick={() => setReceipt(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Transaction Receipt</h2>
              <button className="modal-close" onClick={() => setReceipt(null)}><span className="material-symbols-rounded">close</span></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Reference</span>
                  <span style={{ fontWeight: 600, color: '#fff', fontFamily: 'monospace', fontSize: '0.85rem' }}>{receipt.reference_number || receipt.transaction_uuid}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Date & Time</span>
                  <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>{formatDateTime(receipt.created_at)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Type</span>
                  <StatusBadge status={receipt.type} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Status</span>
                  <StatusBadge status={receipt.status || 'successful'} />
                </div>
                {receipt.customer_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Customer</span>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{receipt.customer_name}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Account</span>
                  <span style={{ fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>{receipt.account_number || receipt.account?.account_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Amount</span>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: receipt.type === 'deposit' || receipt.type === 'transfer_in' ? 'var(--success)' : 'var(--danger)' }}>
                    {receipt.type === 'deposit' || receipt.type === 'transfer_in' ? '+' : '\u2212'} {formatCurrency(receipt.amount)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Balance After</span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(receipt.balance_after)}</span>
                </div>
                {receipt.description && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Description</span>
                    <span style={{ fontWeight: 500, color: '#fff', textAlign: 'right', maxWidth: '220px' }}>{receipt.description}</span>
                  </div>
                )}
              </div>
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
