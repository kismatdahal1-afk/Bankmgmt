import React, { useEffect } from 'react'

export default function FlashMessage({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`flash-message flash-${type}`}>
      <span>{message}</span>
      <span
        className="material-symbols-rounded"
        style={{ cursor: 'pointer', fontSize: '1.2rem' }}
        onClick={onClose}
      >
        close
      </span>
    </div>
  )
}
