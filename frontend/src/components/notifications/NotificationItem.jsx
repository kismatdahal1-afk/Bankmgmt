import React from 'react'
import { formatDateTime } from '../../utils/helpers'

export default function NotificationItem({ notification, onMarkRead, onClear }) {
  const read = notification.is_read
  return (
    <div style={{
      padding: '16px',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ color: '#fff', fontWeight: read ? 400 : 600, marginBottom: '4px' }}>
          {notification.message || notification.title}
        </p>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {formatDateTime(notification.created_at)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {!read && (
          <button onClick={() => onMarkRead?.(notification.id)} className="btn btn-sm btn-secondary" title="Mark as read">
            <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>done</span>
          </button>
        )}
        {onClear && (
          <button onClick={() => onClear(notification.id)} className="btn btn-sm btn-danger" style={{ padding: '2px 6px', fontSize: '0.75rem', border: 'none', cursor: 'pointer', background: 'rgba(244,67,54,0.15)', color: '#f44336', borderRadius: '6px' }} title="Clear">
            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>close</span>
          </button>
        )}
      </div>
    </div>
  )
}
