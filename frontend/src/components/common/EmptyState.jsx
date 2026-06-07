import React from 'react'

export default function EmptyState({ icon = 'inbox', message = 'No data available.' }) {
  return (
    <div className="empty">
      <span className="material-symbols-rounded">{icon}</span>
      <div>{message}</div>
    </div>
  )
}
