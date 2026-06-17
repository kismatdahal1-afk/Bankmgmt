import React from 'react'

export default function StatsCard({ title, value, subtitle, variant = '', valueStyle, style }) {
  return (
    <div className={`card-stat ${variant ? `stat-${variant}` : ''}`} style={style}>
      <span className="stat-title">{title}</span>
      <span className="stat-value" style={valueStyle}>{value}</span>
      {subtitle && <span className="stat-sub">{subtitle}</span>}
    </div>
  )
}
