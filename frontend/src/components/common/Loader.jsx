import React from 'react'

export default function Loader() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '60px 20px',
      color: 'var(--text-muted)'
    }}>
      <span className="material-symbols-rounded" style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>
        sync
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
