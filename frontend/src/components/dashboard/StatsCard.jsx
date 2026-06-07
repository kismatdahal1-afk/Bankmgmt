import React from 'react'

export default function StatsCard({ title, value, subtitle, variant = '' }) {
  return (
    <div className={`card-stat ${variant ? `stat-${variant}` : ''}`}>
      <span className="stat-title">{title}</span>
      <span className="stat-value">{value}</span>
      {subtitle && <span className="stat-sub">{subtitle}</span>}
    </div>
  )
}
