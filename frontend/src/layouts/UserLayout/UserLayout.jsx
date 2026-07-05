import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import NotificationBell from '../../components/notifications/NotificationBell'

const loanLinks = [
  { to: '/user/loan/apply', label: 'Apply for Loan', icon: 'note_add' },
  { to: '/user/loan/tracking', label: 'Loan Tracking', icon: 'track_changes' },
  { to: '/user/loan/active', label: 'Active Loans', icon: 'request_quote' },
  { to: '/user/loan/history', label: 'Loan History', icon: 'history' }
]

export default function UserLayout() {
  const { customer, customerLogout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loanOpen, setLoanOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' }))
  const [accountNumbers, setAccountNumbers] = useState([])

  useEffect(() => {
    if (location.pathname.startsWith('/user/loan/') || location.pathname.startsWith('/user/loans/') || location.pathname === '/user/dashboard') setLoanOpen(true)
  }, [location.pathname])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' })), 1000)
    api.get('/customer/accounts')
      .then(r => setAccountNumbers((r.data.accounts || []).map(a => a.account_number)))
      .catch(() => {})
    return () => clearInterval(timer)
  }, [])

  const handleLogout = () => { customerLogout(); navigate('/') }

  const isLoanActive = () => location.pathname.startsWith('/user/loan/') || location.pathname.startsWith('/user/loans/')

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="material-symbols-rounded" style={{ color: 'var(--accent-color)', fontSize: '2rem' }}>account_balance</span>
          <h2>Village Bank</h2>
        </div>
        <div className="sidebar-scroll">
          <ul className="sidebar-nav">
            <li><NavLink to="/user/dashboard"><span className="material-symbols-rounded">dashboard</span>Dashboard</NavLink></li>
            <li><NavLink to="/user/my-accounts"><span className="material-symbols-rounded">account_balance_wallet</span>Accounts</NavLink></li>
            <li><NavLink to="/user/my-balance"><span className="material-symbols-rounded">account_balance</span>Balance</NavLink></li>
            <li><NavLink to="/user/transfer"><span className="material-symbols-rounded">send_money</span>Transfer</NavLink></li>
            <li><NavLink to="/user/transactions"><span className="material-symbols-rounded">receipt_long</span>Transactions</NavLink></li>

            <li className={`nav-parent ${isLoanActive() ? 'active' : ''}`}>
              <button className="nav-toggle" onClick={() => setLoanOpen(!loanOpen)}>
                <span className="material-symbols-rounded">handshake</span>
                <span>Loan Management</span>
                <span className={`material-symbols-rounded arrow ${loanOpen ? 'open' : ''}`}>chevron_right</span>
              </button>
              <div className="nav-children">
                <div className={`nav-children-inner ${loanOpen ? 'open' : ''}`}>
                  {loanLinks.map((l, i) => (
                    <NavLink key={i} to={l.to} end={l.to !== '/user/loan/tracking'} className={({ isActive }) => {
                      const isDetail = l.to === '/user/loan/tracking' && (location.pathname.startsWith('/user/loan/tracking/') || location.pathname.startsWith('/user/loans/tracking/'))
                      return (isActive || isDetail) ? 'active' : ''
                    }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>{l.icon}</span>
                      {l.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </li>

            <li><NavLink to="/user/notifications"><span className="material-symbols-rounded">notifications</span>Notifications</NavLink></li>
            <li><NavLink to="/user/profile"><span className="material-symbols-rounded">person</span>Profile</NavLink></li>
          </ul>
        </div>
        <div className="sidebar-footer">
          <div className="user-info" style={{ justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="user-avatar">{customer?.name?.[0]?.toUpperCase() || 'C'}</div>
              <div className="user-details">
                <span className="user-name">{customer?.name || 'Customer'}</span>
                <span className="user-role" style={{ fontSize: '11px' }}>{accountNumbers.length > 0 ? accountNumbers.join(', ') : 'customer'}</span>
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
