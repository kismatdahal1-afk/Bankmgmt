import React from 'react'
import { formatDateTime } from '../../utils/helpers'

export default function NotificationItem({ notification, onMarkRead }) {
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
        <p style={{ color: '#fff', fontWeight: notification.read ? 400 : 600, marginBottom: '4px' }}>
          {notification.message || notification.title}
        </p>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {formatDateTime(notification.created_at)}
        </span>
      </div>
      {!notification.read && (
        <button onClick={() => onMarkRead?.(notification.id)} className="btn btn-sm btn-secondary">
          <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>done</span>
        </button>
      )}
    </div>
  )
}
