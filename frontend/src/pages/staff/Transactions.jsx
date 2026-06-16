import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency, formatDateTime } from '../../utils/helpers'
import StatusBadge from '../../components/common/StatusBadge'
import ReceiptView, { buildPrintHTML } from '../../components/common/ReceiptView'

export default function StaffTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [receiptTxn, setReceiptTxn] = useState(null)
  const [receiptData, setReceiptData] = useState(null)
  const [receiptLoading, setReceiptLoading] = useState(false)

  const fetchTransactions = useCallback(async (url = '/api/transactions/') => {
    setLoading(true)
    try {
      const r = await fetch(url)
      const d = await r.json()
      setTransactions(d.transactions || d)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  const fetchReceipt = async (txn) => {
    setReceiptTxn(txn)
    setReceiptData(null)
    setReceiptLoading(true)
    try {
      const r = await fetch(`/api/transactions/${txn.id}/receipt`)
      const d = await r.json()
      if (d.receipt) setReceiptData(d.receipt)
    } catch (e) { console.error(e) }
    setReceiptLoading(false)
  }

  const closeReceipt = () => { setReceiptTxn(null); setReceiptData(null) }

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  useEffect(() => {
    if (receiptTxn) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [receiptTxn])

  const handleFilter = () => {
    const params = new URLSearchParams()
    if (filterType) params.set('type', filterType)
    if (filterStatus) params.set('status', filterStatus)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    fetchTransactions(`/api/transactions/filter?${params.toString()}`)
  }

  const handleReset = () => {
    setFilterType('')
    setFilterStatus('')
    setDateFrom('')
    setDateTo('')
    fetchTransactions('/api/transactions/')
  }

  const exportCSV = () => {
    const headers = ['Txn ID', 'Date', 'Customer', 'Account', 'Type', 'Amount', 'Balance After', 'Description', 'Status', 'Reference']
    const rows = transactions.map(t => [
      t.reference_number || t.transaction_uuid, t.created_at, t.account?.customer?.full_name || '',
      t.account?.account_number || '', t.type, t.amount, t.balance_after,
      (t.description || '').replace(/,/g, ';'), t.status || 'successful', t.reference_number || ''
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>Transaction Ledger</h1>
          <p>Audit and view all financial deposits and withdrawals</p>
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
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '120px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-control" style={{ padding: '4px 8px', fontSize: '0.85rem' }}>
              <option value="">All Status</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="reversed">Reversed</option>
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
          <button onClick={handleFilter} className="btn btn-sm btn-secondary" style={{ padding: '4px 12px', fontSize: '0.85rem', height: '32px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>filter_alt</span> Filter
          </button>
          <button onClick={handleReset} className="btn btn-sm btn-secondary" style={{ padding: '4px 12px', fontSize: '0.85rem', height: '32px' }}>Reset</button>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={exportCSV} className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '6px 14px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>file_download</span> Export CSV
          </button>
          <Link to="/staff/transactions/deposit" className="btn btn-success btn-sm">
            <span className="material-symbols-rounded">add_circle</span> Deposit
          </Link>
          <Link to="/staff/transactions/withdraw" className="btn btn-danger btn-sm">
            <span className="material-symbols-rounded">remove_circle</span> Withdraw
          </Link>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header-bar">
          <span className="table-title">System Transactions Ledger</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{transactions.length} transactions</span>
        </div>
        <table className="custom-table">
          <thead>
            <tr><th>Txn ID</th><th>Timestamp</th><th>Customer / Acc</th><th>Type</th><th>Status</th><th>Amount</th><th>Balance After</th><th>Memo</th></tr>
          </thead>
          <tbody>
            {transactions.length > 0 ? transactions.map(txn => (
              <tr key={txn.id} onClick={() => fetchReceipt(txn)} style={{ cursor: 'pointer' }}>
                <td><code style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{txn.reference_number || txn.transaction_uuid}</code></td>
                <td style={{ fontSize: '0.85rem' }}>{formatDateTime(txn.created_at)}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{txn.account?.customer?.full_name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Acc: {txn.account?.account_number}</span>
                  </div>
                </td>
                <td><StatusBadge status={txn.type} /></td>
                <td><StatusBadge status={txn.status || 'successful'} /></td>
                <td className={txn.type === 'deposit' ? 'text-success' : 'text-danger'} style={{ fontWeight: 700 }}>
                  {txn.type === 'deposit' ? '+' : '-'}{formatCurrency(txn.amount)}
                </td>
                <td style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(txn.balance_after)}</td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{txn.description || '—'}</td>
              </tr>
            )) : (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>account_balance_wallet</span>
                No transactions found.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {receiptTxn && (
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
                <ReceiptView receipt={receiptData} showActions />
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
