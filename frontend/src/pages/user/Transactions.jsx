import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import { formatCurrency, formatDateTime } from '../../utils/helpers'
import StatusBadge from '../../components/common/StatusBadge'

export default function UserTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/customer/transactions')
      .then(r => { setTransactions(r.data.transactions || []); setLoading(false) })
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
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ textAlign: 'right' }}>Balance After</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length > 0 ? transactions.map((txn, i) => (
              <tr key={i}>
                <td className="text-muted">{formatDateTime(txn.created_at)}</td>
                <td className="mono">{txn.account?.account_number}</td>
                <td><StatusBadge status={txn.type} /></td>
                <td><StatusBadge status={txn.status || 'successful'} /></td>
                <td style={{ textAlign: 'right' }} className={txn.type === 'deposit' ? 'amount-pos' : 'amount-neg'}>
                  {txn.type === 'deposit' ? '+' : '\u2212'} {formatCurrency(txn.amount)}
                </td>
                <td style={{ textAlign: 'right' }} className="mono">{formatCurrency(txn.balance_after)}</td>
              </tr>
            )) : (
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
    </>
  )
}
