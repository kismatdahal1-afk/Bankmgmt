import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from '../../components/notifications/NotificationBell'

const loanLinks = [
  { to: '/admin/loan/dashboard', label: 'Loan Dashboard', icon: 'monitoring' },
  { to: '/admin/loan/applications', label: 'Loan Applications', icon: 'description' },
  { to: '/admin/loan/pending', label: 'Pending Reviews', icon: 'rate_review' },
  { to: '/admin/loan/active', label: 'Active Loans', icon: 'request_quote' },
  { to: '/admin/loan/disbursed', label: 'Disbursed Loans', icon: 'payments' },
  { to: '/admin/loan/closed', label: 'Closed Loans', icon: 'folder' },
  { to: '/admin/loan/reports', label: 'Loan Reports', icon: 'analytics' }
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loanOpen, setLoanOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' }))

  useEffect(() => {
    if (location.pathname.startsWith('/admin/loan/')) setLoanOpen(true)
  }, [location.pathname])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' })), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleLogout = () => { logout(); navigate('/') }

  const isLoanActive = () => location.pathname.startsWith('/admin/loan/')

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="material-symbols-rounded" style={{ color: 'var(--accent-color)', fontSize: '2rem' }}>account_balance</span>
          <h2>Village Bank</h2>
        </div>
        <div className="sidebar-scroll">
          <ul className="sidebar-nav">
            <li><NavLink to="/admin/dashboard"><span className="material-symbols-rounded">dashboard</span>Dashboard</NavLink></li>
            <li><NavLink to="/admin/accounts"><span className="material-symbols-rounded">account_balance</span>Accounts</NavLink></li>
            <li><NavLink to="/admin/transactions"><span className="material-symbols-rounded">payments</span>Transactions</NavLink></li>

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

            <li><NavLink to="/admin/emi"><span className="material-symbols-rounded">calendar_month</span>EMI</NavLink></li>
            <li><NavLink to="/admin/reports"><span className="material-symbols-rounded">analytics</span>Reports</NavLink></li>
            <li><NavLink to="/admin/staff"><span className="material-symbols-rounded">badge</span>Staff</NavLink></li>
            <li><NavLink to="/admin/settings"><span className="material-symbols-rounded">settings</span>Settings</NavLink></li>
            <li><NavLink to="/admin/audit-logs"><span className="material-symbols-rounded">monitor_heart</span>Audit Logs</NavLink></li>
            <li><NavLink to="/admin/notifications"><span className="material-symbols-rounded">notifications</span>Notifications</NavLink></li>
          </ul>
        </div>
        <div className="sidebar-footer">
          <div className="user-info" style={{ justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="user-avatar">{user?.username?.[0]?.toUpperCase() || 'A'}</div>
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
