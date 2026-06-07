import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function UserLayout() {
  const { customer, customerLogout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    customerLogout()
    navigate('/')
  }

  const initials = customer?.name
    ? customer.name.split(' ').map(w => w[0].toUpperCase()).slice(0, 2).join('')
    : 'JD'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            <span className="material-symbols-rounded">account_balance</span>
          </div>
          <div>
            <div className="brand-name">Village Bank</div>
            <div className="brand-sub">Customer Portal</div>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{customer?.name || 'John Doe'}</div>
            <div className="sidebar-user-role">Customer</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/user/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="material-symbols-rounded">dashboard</span> Dashboard
          </NavLink>
          <NavLink to="/user/my-accounts" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="material-symbols-rounded">account_balance_wallet</span> Accounts
          </NavLink>
          <NavLink to="/user/my-balance" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="material-symbols-rounded">account_balance</span> Balance
          </NavLink>
          <NavLink to="/user/transactions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="material-symbols-rounded">receipt_long</span> Transactions
          </NavLink>
          <NavLink to="/user/my-loans" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="material-symbols-rounded">request_quote</span> Loans
          </NavLink>
          <NavLink to="/user/emi-status" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="material-symbols-rounded">calendar_month</span> EMI Status
          </NavLink>
          <NavLink to="/user/notifications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="material-symbols-rounded">notifications</span> Notifications
          </NavLink>
          <NavLink to="/user/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="material-symbols-rounded">person</span> Profile
          </NavLink>
          <button onClick={handleLogout} className="nav-link" style={{ marginTop: '12px' }}>
            <span className="material-symbols-rounded">logout</span> Logout
          </button>
        </nav>

        <div className="sidebar-foot">&copy; {new Date().getFullYear()} Village Bank</div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
