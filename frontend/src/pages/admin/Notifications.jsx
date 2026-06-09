import React, { useState, useEffect } from 'react'
import NotificationItem from '../../components/notifications/NotificationItem'
import EmptyState from '../../components/common/EmptyState'

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchNotifications() }, [])

  const fetchNotifications = () => {
    fetch('/api/notifications/', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setNotifications(d.notifications || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const handleMarkRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST', credentials: 'include' })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (e) { console.error(e) }
  }

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST', credentials: 'include' })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (e) { console.error(e) }
  }

  const handleClear = async () => {
    if (!confirm('Clear all notifications?')) return
    try {
      await fetch('/api/notifications/clear', { method: 'POST', credentials: 'include' })
      setNotifications([])
    } catch (e) { console.error(e) }
  }

  const handleClearSingle = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/clear`, { method: 'POST', credentials: 'include' })
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (e) { console.error(e) }
  }

  if (loading) return <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>Notifications</h1>
          <p>System notifications and alerts</p>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header-bar">
          <span className="table-title">All Notifications ({notifications.length})</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="btn btn-sm btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '4px' }}>mark_email_read</span>
                Mark All Read
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={handleClear} className="btn btn-sm btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '4px' }}>delete_sweep</span>
                Clear All
              </button>
            )}
          </div>
        </div>
        {notifications.length > 0 ? notifications.map(n => (
          <NotificationItem key={n.id} notification={n} onMarkRead={handleMarkRead} onClear={handleClearSingle} />
        )) : (
          <EmptyState icon="notifications_off" message="No notifications yet." />
        )}
      </div>
    </>
  )
}
