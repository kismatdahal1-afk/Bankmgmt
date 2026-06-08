import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from '../../components/notifications/NotificationBell'

export default function StaffLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="material-symbols-rounded" style={{ color: 'var(--accent-color)', fontSize: '2rem' }}>account_balance</span>
          <h2>Village Bank</h2>
        </div>
        <ul className="sidebar-nav">
          <li><NavLink to="/staff/dashboard"><span className="material-symbols-rounded">dashboard</span>Dashboard</NavLink></li>
          <li><NavLink to="/staff/accounts"><span className="material-symbols-rounded">account_balance</span>Accounts</NavLink></li>
          <li><NavLink to="/staff/transactions"><span className="material-symbols-rounded">payments</span>Transactions</NavLink></li>
          <li><NavLink to="/staff/loans"><span className="material-symbols-rounded">handshake</span>Loans</NavLink></li>
          <li><NavLink to="/staff/emi"><span className="material-symbols-rounded">calendar_month</span>EMI</NavLink></li>
          <li><NavLink to="/staff/reports"><span className="material-symbols-rounded">analytics</span>Reports</NavLink></li>
        </ul>
        <div className="sidebar-footer">
          <div className="user-info" style={{ justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="user-avatar">{user?.username?.[0]?.toUpperCase() || 'S'}</div>
              <div className="user-details">
                <span className="user-name">{user?.username}</span>
                <span className="user-role">{user?.role}</span>
              </div>
            </div>
            <button onClick={handleLogout} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }} title="Logout">
              <span className="material-symbols-rounded">logout</span>
            </button>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)', marginBottom: '10px' }}>
          <NotificationBell />
        </div>
        <Outlet />
      </main>
    </div>
  )
}
