import React from 'react'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/helpers'
import StatusBadge from '../common/StatusBadge'

export default function AccountCard({ account, onAction }) {
  return (
    <div className="account-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="account-num">{account.account_number}</div>
          <div className="account-balance">{formatCurrency(account.balance)}</div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '13px', verticalAlign: '-3px' }}>swap_vert</span>
            &nbsp;Dep: {formatCurrency(account.total_deposits || 0)} &middot; Wth: {formatCurrency(account.total_withdrawals || 0)}
          </div>
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
        {account.last_transaction_date && (
          <div className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '14px', verticalAlign: '-3px' }}>schedule</span>
            Last Txn {formatDateTime(account.last_transaction_date)}
          </div>
        )}
      </div>
      {onAction && account.status !== 'closed' && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
          {account.status === 'pending' && (
            <button onClick={() => onAction('activate', account.id)} className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>check_circle</span> Activate
            </button>
          )}
          {account.status === 'active' && (
            <button onClick={() => onAction('freeze', account.id)} className="btn btn-sm" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>ac_unit</span> Freeze
            </button>
          )}
          {account.status === 'frozen' && (
            <button onClick={() => onAction('unfreeze', account.id)} className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>check_circle</span> Unfreeze
            </button>
          )}
          {(account.status === 'active' || account.status === 'frozen') && account.balance === 0 && (
            <button onClick={() => onAction('close', account.id)} className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>close</span> Close
            </button>
          )}
        </div>
      )}
    </div>
  )
}
