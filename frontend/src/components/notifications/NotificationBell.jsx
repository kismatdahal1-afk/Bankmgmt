import React, { useState, useEffect, useRef } from 'react'
import { formatDateTime } from '../../utils/helpers'

export default function NotificationBell() {
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const authHeaders = () => {
    const token = sessionStorage.getItem('auth_token')
    return token ? { 'X-Auth-Token': token } : {}
  }

  const fetchUnread = () => {
    fetch('/api/notifications/?unread=true', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        setUnread(d.unread_count || 0)
        setItems((d.notifications || []).slice(0, 5))
      })
      .catch(err => console.error('Fetch error:', err))
  }

  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST', headers: authHeaders() })
      fetchUnread()
    } catch (e) { console.error(e) }
  }

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST', headers: authHeaders() })
      setUnread(0)
      setItems([])
    } catch (e) { console.error(e) }
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', position: 'relative', padding: '4px' }}>
        <span className="material-symbols-rounded">notifications</span>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: '0', right: '0', background: 'var(--danger)', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: '0', top: '100%', width: '340px', maxHeight: '400px', overflowY: 'auto', background: '#151a22', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 1000, marginTop: '8px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#fff' }}>Notifications</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {unread > 0 && (
                <button onClick={markAllRead} className="btn btn-sm btn-secondary" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="btn btn-sm btn-secondary" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                Close
              </button>
            </div>
          </div>
          {items.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>notifications_off</span>
              No new notifications
            </div>
          ) : (
            items.map(n => (
              <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#fff', fontWeight: n.is_read ? 400 : 600, margin: 0, fontSize: '0.85rem' }}>{n.message || n.title}</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateTime(n.created_at)}</span>
                  </div>
                  {!n.is_read && (
                    <button onClick={() => markRead(n.id)} className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', padding: '2px 6px', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer', alignSelf: 'flex-start' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>done</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
