import React from 'react'
import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div style={{
      margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary, #090d16)', fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif"
    }}>
      <div className="landing-container">
        <div className="landing-icon">
          <span className="material-symbols-rounded" style={{ fontSize: '4rem' }}>account_balance</span>
        </div>
        <div className="landing-title">Village Bank</div>
        <div className="landing-sub">Management System &middot; Select your portal</div>

        <div className="landing-grid">
          <Link to="/admin/login" className="landing-card">
            <div className="landing-card-icon">
              <span className="material-symbols-rounded" style={{ fontSize: '3rem', color: '#3b82f6' }}>admin_panel_settings</span>
            </div>
            <div className="landing-card-title">Admin Portal</div>
            <div className="landing-card-desc">Full system control, staff management, reports, and configuration.</div>
            <div style={{
              display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '11px',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '12px',
              background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>Administrators</div>
          </Link>

          <Link to="/staff/login" className="landing-card">
            <div className="landing-card-icon">
              <span className="material-symbols-rounded" style={{ fontSize: '3rem', color: '#8b5cf6' }}>badge</span>
            </div>
            <div className="landing-card-title">Staff Portal</div>
            <div className="landing-card-desc">Manage customers, process transactions, approve loans, and view reports.</div>
            <div style={{
              display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '11px',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '12px',
              background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.3)'
            }}>Operators &amp; Staff</div>
          </Link>

          <Link to="/user/login" className="landing-card">
            <div className="landing-card-icon">
              <span className="material-symbols-rounded" style={{ fontSize: '3rem', color: '#10b981' }}>person</span>
            </div>
            <div className="landing-card-title">Customer Portal</div>
            <div className="landing-card-desc">View account balances, transaction history, loans, and profile details.</div>
            <div style={{
              display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '11px',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '12px',
              background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>Bank Customers</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
