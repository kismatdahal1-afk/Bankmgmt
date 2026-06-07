import React, { useState, useEffect } from 'react'
import { formatCurrency, formatDateTime } from '../../utils/helpers'

export default function UserTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/customer/transactions')
      .then(r => r.json())
      .then(d => { setTransactions(d.transactions || d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Transaction History</div>
          <div className="page-subtitle">Complete ledger of deposits and withdrawals.</div>
        </div>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Account</th>
              <th>Type</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ textAlign: 'right' }}>Balance After</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length > 0 ? transactions.map((txn, i) => (
              <tr key={i}>
                <td className="text-muted">{formatDateTime(txn.created_at)}</td>
                <td className="mono">{txn.account?.account_number}</td>
                <td>
                  {txn.type === 'deposit' ? (
                    <span className="badge badge-success"><span className="material-symbols-rounded" style={{ fontSize: '14px' }}>south_west</span> Deposit</span>
                  ) : txn.type === 'withdrawal' ? (
                    <span className="badge badge-danger"><span className="material-symbols-rounded" style={{ fontSize: '14px' }}>north_east</span> Withdrawal</span>
                  ) : (
                    <span className="badge badge-info">{txn.type}</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }} className={txn.type === 'deposit' ? 'amount-pos' : 'amount-neg'}>
                  {txn.type === 'deposit' ? '+' : '\u2212'} {formatCurrency(txn.amount)}
                </td>
                <td style={{ textAlign: 'right' }} className="mono">{formatCurrency(txn.balance_after)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5">
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
    </>
  )
}
