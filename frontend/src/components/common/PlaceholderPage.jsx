import React from 'react'

export default function PlaceholderPage({ title = 'Module', icon = 'construction' }) {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">{title}</div>
          <div className="page-subtitle">This module is currently under development</div>
        </div>
      </div>
      <div className="placeholder-card">
        <span className="material-symbols-rounded" style={{ fontSize: '64px', color: 'var(--text-muted)', marginBottom: '16px' }}>{icon}</span>
        <h3 style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px' }}>Coming Soon</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{title} will be available in the next update.</p>
      </div>
    </>
  )
}
