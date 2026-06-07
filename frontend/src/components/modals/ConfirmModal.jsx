import React from 'react'

export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
    }}>
      <div className="form-card" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '3rem', color: 'var(--danger)', marginBottom: '16px' }}>warning</span>
        {title && <h3 style={{ color: '#fff', marginBottom: '12px' }}>{title}</h3>}
        {message && <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{message}</p>}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={onCancel} className="btn btn-secondary">{cancelText}</button>
          <button onClick={onConfirm} className={`btn btn-${variant}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}
