import React, { useState, useEffect } from 'react'
import { formatDateTime } from '../../utils/helpers'
import StatusBadge from '../../components/common/StatusBadge'

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([])
  const [actions, setActions] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [limit, setLimit] = useState('50')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchLogs = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (actionFilter) params.set('action', actionFilter)
    if (limit) params.set('limit', limit)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    fetch(`/api/audit-logs/?${params}`)
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetch('/api/audit-logs/actions').then(r => r.json()).then(d => setActions(d.actions || [])).catch(() => {})
    fetch('/api/audit-logs/summary').then(r => r.json()).then(d => setSummary(d)).catch(() => {})
    fetchLogs()
  }, [])

  useEffect(() => { fetchLogs() }, [actionFilter, limit, dateFrom, dateTo])

  const actionDisplay = (action) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>Audit Logs</h1>
          <p>Track all system actions and user activities</p>
        </div>
      </div>

      {summary && (
        <div className="grid-stats" style={{ marginBottom: '20px' }}>
          <div className="card-stat"><span className="stat-title">Total Events</span><span className="stat-value">{summary.total_logs}</span></div>
          <div className="card-stat"><span className="stat-title">Today</span><span className="stat-value">{summary.today_logs}</span></div>
          <div className="card-stat stat-danger"><span className="stat-title">Failed</span><span className="stat-value">{summary.failed_actions}</span></div>
        </div>
      )}

      <div className="table-container">
        <div className="table-header-bar" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <span className="table-title">Activity Log</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="form-control" style={{ width: 'auto', minWidth: '160px', padding: '6px 10px' }}>
              <option value="">All Actions</option>
              {actions.map(a => (
                <option key={a.action} value={a.action}>{actionDisplay(a.action)} ({a.count})</option>
              ))}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-control" style={{ width: 'auto', minWidth: '130px', padding: '6px 10px' }} placeholder="From" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="form-control" style={{ width: 'auto', minWidth: '130px', padding: '6px 10px' }} placeholder="To" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo('') }} className="btn btn-sm btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>clear</span>
              </button>
            )}
            <select value={limit} onChange={e => setLimit(e.target.value)} className="form-control" style={{ width: 'auto', minWidth: '80px', padding: '6px 10px' }}>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Description</th>
                  <th>IP</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No audit logs found.</td></tr>
                ) : (
                  logs.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDateTime(l.created_at)}</td>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{l.username || '—'}</td>
                      <td><StatusBadge status={l.role} /></td>
                      <td><code style={{ fontSize: '0.8rem' }}>{actionDisplay(l.action)}</code></td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {l.resource_type ? <><span style={{ color: 'var(--text-secondary)' }}>{l.resource_type}</span>{l.resource_id ? <code style={{ marginLeft: '4px' }}>#{l.resource_id}</code> : null}</> : '—'}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.description || '—'}</td>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{l.ip_address || '—'}</td>
                      <td><StatusBadge status={l.status || 'success'} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
