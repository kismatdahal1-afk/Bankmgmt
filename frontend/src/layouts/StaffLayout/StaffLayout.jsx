import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from '../../components/notifications/NotificationBell'

const loanLinks = [
  { to: '/staff/loan/dashboard', label: 'Loan Dashboard', icon: 'monitoring' },
  { to: '/staff/loan/new-applications', label: 'New Applications', icon: 'assignment_add' },
  { to: '/staff/loan/verification-queue', label: 'Verification Queue', icon: 'verified' },
  { to: '/staff/loan/visits', label: 'Branch Visits', icon: 'calendar_month' },
  { to: '/staff/loan/active', label: 'Active Loans', icon: 'request_quote' }
]

export default function StaffLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loanOpen, setLoanOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' }))

  useEffect(() => {
    if (location.pathname.startsWith('/staff/loan/') || location.pathname.startsWith('/staff/loans/') || location.pathname === '/staff/dashboard') setLoanOpen(true)
  }, [location.pathname])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' })), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleLogout = () => { logout(); navigate('/') }

  const isLoanActive = () => location.pathname.startsWith('/staff/loan/') || location.pathname.startsWith('/staff/loans/')

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="material-symbols-rounded" style={{ color: 'var(--accent-color)', fontSize: '2rem' }}>account_balance</span>
          <h2>Village Bank</h2>
        </div>
        <div className="sidebar-scroll">
          <ul className="sidebar-nav">
            <li><NavLink to="/staff/dashboard"><span className="material-symbols-rounded">dashboard</span>Dashboard</NavLink></li>
            <li><NavLink to="/staff/accounts"><span className="material-symbols-rounded">account_balance</span>Accounts</NavLink></li>
            <li><NavLink to="/staff/transactions"><span className="material-symbols-rounded">payments</span>Transactions</NavLink></li>

            <li className={`nav-parent ${isLoanActive() ? 'active' : ''}`}>
              <button className="nav-toggle" onClick={() => setLoanOpen(!loanOpen)}>
                <span className="material-symbols-rounded">handshake</span>
                <span>Loan Management</span>
                <span className={`material-symbols-rounded arrow ${loanOpen ? 'open' : ''}`}>chevron_right</span>
              </button>
              <div className="nav-children">
                <div className={`nav-children-inner ${loanOpen ? 'open' : ''}`}>
                  {loanLinks.map(l => (
                    <NavLink key={l.to} to={l.to} end className={({ isActive }) => isActive ? 'active' : ''}>
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>{l.icon}</span>
                      {l.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </li>

            <li><NavLink to="/staff/reports"><span className="material-symbols-rounded">analytics</span>Reports</NavLink></li>
            <li><NavLink to="/staff/notifications"><span className="material-symbols-rounded">notifications</span>Notifications</NavLink></li>
          </ul>
        </div>
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
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{currentTime}</span>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
