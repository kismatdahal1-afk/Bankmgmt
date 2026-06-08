import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import NotificationItem from '../../components/notifications/NotificationItem'
import EmptyState from '../../components/common/EmptyState'

export default function UserNotifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/customer/notifications')
      .then(r => { setNotifications(r.data.notifications || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleMarkRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Notifications</div>
          <div className="page-subtitle">Stay updated on your account activity.</div>
        </div>
      </div>

      {loading ? (
        <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>
      ) : (
        <div className="table-container">
          {notifications.length > 0 ? notifications.map(n => (
            <NotificationItem key={n.id} notification={n} onMarkRead={handleMarkRead} />
          )) : (
            <EmptyState icon="notifications_off" message="No notifications yet." />
          )}
        </div>
      )}
    </>
  )
}
