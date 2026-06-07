import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency, formatDateTime } from '../../utils/helpers'

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/transactions/')
      .then(r => r.json())
      .then(d => { setTransactions(d.transactions || d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>Transaction Ledger</h1>
          <p>Audit and view all financial deposits and withdrawals</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '10px' }}>
        <Link to="/admin/transactions/deposit" className="btn btn-success">
          <span className="material-symbols-rounded">add_circle</span>
          Deposit Funds
        </Link>
        <Link to="/admin/transactions/withdraw" className="btn btn-danger">
          <span className="material-symbols-rounded">remove_circle</span>
          Withdraw Funds
        </Link>
      </div>

      <div className="table-container">
        <div className="table-header-bar">
          <span className="table-title">System Transactions Ledger</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Recorded Transactions: {transactions.length}</span>
        </div>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Txn ID</th>
              <th>Timestamp</th>
              <th>Customer / Acc</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Balance After</th>
              <th>Memo</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length > 0 ? transactions.map(txn => (
              <tr key={txn.id}>
                <td><code style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{txn.transaction_uuid}</code></td>
                <td>{formatDateTime(txn.created_at)}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{txn.account?.customer?.full_name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Acc: {txn.account?.account_number}</span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${txn.type === 'deposit' ? 'badge-success' : 'badge-danger'}`}>
                    {txn.type}
                  </span>
                </td>
                <td className={txn.type === 'deposit' ? 'text-success' : 'text-danger'} style={{ fontWeight: 700 }}>
                  {txn.type === 'deposit' ? '+' : '-'}{formatCurrency(txn.amount)}
                </td>
                <td style={{ fontWeight: 600, color: '#fff' }}>
                  {formatCurrency(txn.balance_after)}
                </td>
                <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {txn.description || '—'}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>account_balance_wallet</span>
                  No transactions recorded in the ledger yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
