import React, { useState, useEffect } from 'react'
import StatusBadge from '../../components/common/StatusBadge'

export default function AdminStaffManagement() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ username: '', password: '', role: 'staff' })

  useEffect(() => {
    fetch('/api/staff/')
      .then(r => r.json())
      .then(d => { setStaff(d.staff || d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/staff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (data.staff) {
        setStaff(prev => [...prev, data.staff])
        setShowForm(false)
        setFormData({ username: '', password: '', role: 'staff' })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return
    try {
      await fetch(`/api/staff/delete/${id}`, { method: 'POST' })
      setStaff(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>Staff Management</h1>
          <p>Manage system operators and their access privileges</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          <span className="material-symbols-rounded">person_add</span>
          {showForm ? 'Cancel' : 'Create Staff'}
        </button>
      </div>

      {showForm && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div className="form-card" style={{ maxWidth: '450px' }}>
            <h3 style={{ marginBottom: '20px', color: '#fff' }}>Register New Staff Operator</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input type="text" id="username" className="form-control" required
                  value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="password">Temporary Password</label>
                <input type="text" id="password" className="form-control" required
                  value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select id="role" className="form-control" value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                <span className="material-symbols-rounded">save</span> Create Staff Account
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <div className="table-header-bar">
          <span className="table-title">System Operators</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Staff: {staff.length}</span>
        </div>
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Role</th>
              <th>Created</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.length > 0 ? staff.map(s => (
              <tr key={s.id}>
                <td><code style={{ fontFamily: 'monospace' }}>#{s.id}</code></td>
                <td style={{ fontWeight: 600, color: '#fff' }}>{s.username}</td>
                <td><StatusBadge status={s.role} /></td>
                <td>{new Date(s.created_at).toLocaleDateString()}</td>
                <td style={{ textAlign: 'right' }}>
                  <button onClick={() => handleDelete(s.id)} className="btn btn-danger btn-sm">
                    <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>person_remove</span>
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>badge</span>
                No staff accounts registered.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
