import React from 'react'
import { formatCurrency } from '../../utils/helpers'

export default function BalanceCard({ balance, accountCount }) {
  return (
    <div className="balance-card" style={{ marginBottom: '22px' }}>
      <div className="balance-label">Total Balance</div>
      <div className="balance-amount">{formatCurrency(balance)}</div>
      <div className="balance-foot">
        <span>
          <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--success)' }}>trending_up</span>
          {' '}Across {accountCount} active accounts
        </span>
        <span className="text-muted">Last updated just now</span>
      </div>
    </div>
  )
}
