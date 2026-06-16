import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../../utils/helpers'
import StatusBadge from '../../components/common/StatusBadge'
import ReceiptView from '../../components/common/ReceiptView'

function splitTxnId(id) {
  if (!id) return ['', '—']
  const idx = id.lastIndexOf('-')
  if (idx === -1) return ['', id]
  return [id.slice(0, idx + 1), id.slice(idx + 1)]
}

function splitTimestamp(dateStr) {
  if (!dateStr) return ['—', '']
  const d = new Date(dateStr)
  const pad = n => String(n).padStart(2, '0')
  return [
    `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  ]
}

function amountColor(txn) {
  if (txn.type === 'deposit' || txn.type === 'transfer_in') return 'var(--success)'
  return 'var(--danger)'
}

function amountSign(txn) {
  if (txn.type === 'deposit' || txn.type === 'transfer_in') return '+'
  return '-'
}

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([])
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [receiptTxn, setReceiptTxn] = useState(null)
  const [receiptData, setReceiptData] = useState(null)
  const [receiptLoading, setReceiptLoading] = useState(false)

  const fetchTransactions = useCallback(async (url = '/api/transactions/') => {
    try {
      const r = await fetch(url)
      const d = await r.json()
      setTransactions(d.transactions || d)
    } catch (e) { console.error(e) }
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
    const headers = ['Txn ID', 'Date', 'Customer', 'Account', 'Type', 'Status', 'Amount', 'Balance Before', 'Balance After', 'Counterparty', 'Counterparty Account', 'Initiated By', 'Memo']
    const rows = transactions.map(t => [
      t.reference_number || t.transaction_uuid,
      t.created_at,
      t.account?.customer?.full_name || '',
      t.account?.account_number || '',
      t.type,
      t.status || 'successful',
      t.amount,
      t.balance_before,
      t.balance_after,
      t.counterparty_name || '',
      t.counterparty_account || '',
      t.initiated_by_name || t.initiated_by_type || '',
      (t.description || '').replace(/,/g, ';')
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  const exportPDF = () => {
    const rowsHtml = transactions.map(t => {
      const [txnPrefix, txnNum] = splitTxnId(t.reference_number || t.transaction_uuid)
      const [date, time] = splitTimestamp(t.created_at)
      const cptyName = t.counterparty_name || ''
      const cptyAcc = t.counterparty_account || ''
      const cpty = cptyName ? `${cptyName}${cptyAcc ? ` (${cptyAcc})` : ''}` : '—'
      const balBefore = t.balance_before != null ? formatCurrency(t.balance_before) : '—'
      const balAfter = t.balance_after != null ? formatCurrency(t.balance_after) : '—'
      const amtColor = amountColor(t)
      const sign = amountSign(t)
      return `<tr>
        <td style="padding:5px 8px;border:1px solid #d1d5db;font-size:11px;font-family:monospace;vertical-align:top">
          ${txnPrefix}<b>${txnNum}</b><br><span style="color:#4b5563;font-size:10px;font-family:sans-serif">${date} ${time}</span>
        </td>
        <td style="padding:5px 8px;border:1px solid #d1d5db;font-size:12px;vertical-align:top">${t.account?.customer?.full_name || ''}<br><span style="color:#6b7280;font-size:11px">${t.account?.account_number || ''}</span></td>
        <td style="padding:5px 8px;border:1px solid #d1d5db;font-size:11px;text-align:center;vertical-align:top">${t.type}</td>
        <td style="padding:5px 8px;border:1px solid #d1d5db;font-size:11px;text-align:center;vertical-align:top">${t.status || 'successful'}</td>
        <td style="padding:5px 8px;border:1px solid #d1d5db;font-size:12px;font-weight:700;text-align:right;white-space:nowrap;vertical-align:top;color:${amtColor}">${sign}${formatCurrency(t.amount)}</td>
        <td style="padding:5px 8px;border:1px solid #d1d5db;font-size:11px;text-align:right;white-space:nowrap;vertical-align:top"><span style="color:#6b7280">${balBefore}</span><br><b>${balAfter}</b></td>
        <td style="padding:5px 8px;border:1px solid #d1d5db;font-size:11px;vertical-align:top">${cpty}</td>
        <td style="padding:5px 8px;border:1px solid #d1d5db;font-size:11px;color:#6b7280;vertical-align:top">${t.initiated_by_name || (t.initiated_by_type === 'system' ? '—' : t.initiated_by_type || '—')}</td>
        <td style="padding:5px 8px;border:1px solid #d1d5db;font-size:11px;color:#6b7280;vertical-align:top">${(t.description || '—').replace(/</g,'&lt;')}</td>
      </tr>`
    }).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Transaction Ledger</title><style>
      @page { margin: 6mm; size: landscape; }
      * { box-sizing:border-box; margin:0; padding:0; }
      body{font-family:'Segoe UI',Arial,sans-serif;padding:12px;color:#111;}
      h2{font-size:16px;margin-bottom:2px;}
      .meta{color:#6b7280;font-size:10px;margin-bottom:10px;}
      table{width:100%;border-collapse:collapse;}
      th{background:#1f2937;color:#fff;padding:5px 6px;font-size:10px;text-align:left;white-space:nowrap;}
      tr:nth-child(even){background:#f9fafb;}
    </style></head><body>
      <h2>Transaction Ledger</h2>
      <div class="meta">Generated: ${new Date().toLocaleString()} | ${transactions.length} entries</div>
      <table><thead><tr>
        <th>Txn ID / Date</th><th>Customer / Acc</th><th>Type</th><th>Status</th><th style="text-align:right">Amount</th><th style="text-align:right">Balance (B/A)</th><th>Counterparty</th><th>By</th><th>Memo</th>
      </tr></thead><tbody>${rowsHtml}</tbody></table>
    </body></html>`
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }

  const totals = useMemo(() => {
    const total = transactions.length
    const deposits = transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0)
    const withdrawals = transactions.filter(t => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0)
    const transfers = transactions.filter(t => t.type === 'transfer_out' || t.type === 'transfer_in').reduce((s, t) => s + t.amount, 0)
    return { total, deposits, withdrawals, transfers }
  }, [transactions])

  const initiatedByLabel = (txn) => {
    if (txn.initiated_by_type === 'system' || !txn.initiated_by_name) return '—'
    const role = txn.initiated_by_type.charAt(0).toUpperCase() + txn.initiated_by_type.slice(1)
    return `${role}: ${txn.initiated_by_name}`
  }

  const counterpartyLabel = (txn) => {
    if (!txn.counterparty_name && !txn.counterparty_account) return '—'
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.85rem', color: '#fff' }}>{txn.counterparty_name}</span>
        {txn.counterparty_account && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{txn.counterparty_account}</span>}
      </div>
    )
  }

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>Transaction Ledger</h1>
          <p>Audit and view all financial transactions</p>
        </div>
      </div>

      <div className="grid-stats" style={{ gap: '16px', marginBottom: '16px' }}>
        <div className="card-stat" style={{ padding: '22px 24px', gap: '6px' }}>
          <span className="stat-title">Total Transactions</span>
          <span className="stat-value">{totals.total}</span>
        </div>
        <div className="card-stat stat-success" style={{ padding: '22px 24px', gap: '6px' }}>
          <span className="stat-title">Total Deposits</span>
          <span className="stat-value">{formatCurrency(totals.deposits)}</span>
        </div>
        <div className="card-stat stat-warning" style={{ padding: '22px 24px', gap: '6px' }}>
          <span className="stat-title">Total Withdrawals</span>
          <span className="stat-value">{formatCurrency(totals.withdrawals)}</span>
        </div>
        <div className="card-stat" style={{ borderLeftColor: '#3b82f6', padding: '22px 24px', gap: '6px' }}>
          <span className="stat-title">Total Transfers</span>
          <span className="stat-value">{formatCurrency(totals.transfers)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0, minWidth: '120px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="form-control" style={{ padding: '6px 10px', fontSize: '0.85rem' }}>
              <option value="">All Types</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="transfer_out">Transfer Out</option>
              <option value="transfer_in">Transfer In</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '120px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-control" style={{ padding: '6px 10px', fontSize: '0.85rem' }}>
              <option value="">All Status</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="reversed">Reversed</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '130px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-control" style={{ padding: '6px 10px', fontSize: '0.85rem' }} />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '130px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="form-control" style={{ padding: '6px 10px', fontSize: '0.85rem' }} />
          </div>
          <button onClick={handleFilter} className="btn btn-sm btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>filter_alt</span> Filter
          </button>
          <button onClick={handleReset} className="btn btn-sm btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
            Reset
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/admin/transactions/deposit" className="btn btn-success btn-sm" style={{ minWidth: '130px', textAlign: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '16px', verticalAlign: 'middle' }}>add_circle</span> Deposit
            </Link>
            <Link to="/admin/transactions/withdraw" className="btn btn-danger btn-sm" style={{ minWidth: '130px', textAlign: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '16px', verticalAlign: 'middle' }}>remove_circle</span> Withdraw
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={exportCSV} className="btn btn-sm" style={{ minWidth: '130px', textAlign: 'center', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '6px 14px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '16px', verticalAlign: 'middle' }}>file_download</span> Export CSV
            </button>
            <button onClick={exportPDF} className="btn btn-sm" style={{ minWidth: '130px', textAlign: 'center', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', padding: '6px 14px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '16px', verticalAlign: 'middle' }}>picture_as_pdf</span> Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header-bar">
          <span className="table-title">Transaction Ledger</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{transactions.length} entries</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table txn-ledger-table">
            <thead>
              <tr>
                <th style={{ width: '10%' }}>Txn ID</th>
                <th style={{ width: '9%' }}>Date</th>
                <th style={{ width: '12%' }}>Customer / Acc</th>
                <th style={{ width: '7%' }}>Type</th>
                <th style={{ width: '7%' }}>Status</th>
                <th style={{ width: '9%' }}>Amount</th>
                <th style={{ width: '10%' }}>Balance (B/A)</th>
                <th style={{ width: '12%' }}>Counterparty</th>
                <th style={{ width: '8%' }}>By</th>
                <th style={{ width: '7%' }}>Memo</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length > 0 ? transactions.map(txn => {
                const [txnPrefix, txnNum] = splitTxnId(txn.reference_number || txn.transaction_uuid)
                const [txnDate, txnTime] = splitTimestamp(txn.created_at)
                const balBefore = txn.balance_before != null ? formatCurrency(txn.balance_before) : '—'
                const balAfter = txn.balance_after != null ? formatCurrency(txn.balance_after) : '—'
                return (
                <tr key={txn.id} onClick={() => fetchReceipt(txn)} style={{ cursor: 'pointer' }}>
                  <td style={{ verticalAlign: 'top' }}>
                    <code style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <div>{txnPrefix}</div>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{txnNum}</div>
                    </code>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                    <div style={{ fontSize: '0.82rem' }}>{txnDate}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{txnTime}</div>
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{txn.account?.customer?.full_name}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{txn.account?.account_number}</span>
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'top' }}><StatusBadge status={txn.type} /></td>
                  <td style={{ verticalAlign: 'top' }}><StatusBadge status={txn.status || 'successful'} /></td>
                  <td style={{ fontWeight: 700, color: amountColor(txn), verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    {amountSign(txn)}{formatCurrency(txn.amount)}
                  </td>
                  <td style={{ verticalAlign: 'top', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{balBefore}</div>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{balAfter}</div>
                  </td>
                  <td style={{ verticalAlign: 'top', fontSize: '0.82rem' }}>{counterpartyLabel(txn)}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', verticalAlign: 'top' }}>{initiatedByLabel(txn)}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'top' }} title={txn.description || ''}>
                    {txn.description || '—'}
                  </td>
                </tr>
                )
              }) : (
                <tr><td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>account_balance_wallet</span>
                  No transactions found.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
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
        .txn-ledger-table th,
        .txn-ledger-table td { padding: 8px 10px !important; }
      `}</style>
    </>
  )
}
