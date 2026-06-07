import React from 'react'
import { formatCurrency, formatDate } from '../../utils/helpers'
import StatusBadge from '../common/StatusBadge'

export default function AccountCard({ account }) {
  return (
    <div className="account-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="account-num">{account.account_number}</div>
          <div className="account-balance">{formatCurrency(account.balance)}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
          <StatusBadge status={account.account_type} />
          <StatusBadge status={account.status} />
        </div>
      </div>
      <div className="account-meta">
        <div className="text-muted" style={{ fontSize: '12px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '14px', verticalAlign: '-3px' }}>event</span>
          Opened {formatDate(account.created_at)}
        </div>
      </div>
    </div>
  )
}
