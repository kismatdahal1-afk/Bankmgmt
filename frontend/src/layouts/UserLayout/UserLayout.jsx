import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from '../../components/notifications/NotificationBell'

export default function UserLayout() {
  const { customer, customerLogout } = useAuth()
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleString()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleLogout = () => {
    customerLogout()
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
          <li><NavLink to="/user/dashboard"><span className="material-symbols-rounded">dashboard</span>Dashboard</NavLink></li>
          <li><NavLink to="/user/my-accounts"><span className="material-symbols-rounded">account_balance_wallet</span>Accounts</NavLink></li>
          <li><NavLink to="/user/my-balance"><span className="material-symbols-rounded">account_balance</span>Balance</NavLink></li>
          <li><NavLink to="/user/transactions"><span className="material-symbols-rounded">receipt_long</span>Transactions</NavLink></li>
          <li><NavLink to="/user/my-loans"><span className="material-symbols-rounded">request_quote</span>Loans</NavLink></li>
          <li><NavLink to="/user/emi-status"><span className="material-symbols-rounded">calendar_month</span>EMI Status</NavLink></li>
          <li><NavLink to="/user/notifications"><span className="material-symbols-rounded">notifications</span>Notifications</NavLink></li>
          <li><NavLink to="/user/profile"><span className="material-symbols-rounded">person</span>Profile</NavLink></li>
        </ul>
        <div className="sidebar-footer">
          <div className="user-info" style={{ justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="user-avatar">{customer?.name?.[0]?.toUpperCase() || 'C'}</div>
              <div className="user-details">
                <span className="user-name">{customer?.name || 'Customer'}</span>
                <span className="user-role">customer</span>
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
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{currentTime}</span>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
