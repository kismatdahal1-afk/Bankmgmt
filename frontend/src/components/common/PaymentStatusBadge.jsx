import React from 'react'

const CONFIG = {
  current: { label: 'Current', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  due_soon: { label: 'Due Soon', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  overdue: { label: 'Overdue', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
}

export default function PaymentStatusBadge({ status, overdueDays, showDetail }) {
  const c = CONFIG[status] || CONFIG.current
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, background:c.bg, color:c.color, whiteSpace:'nowrap' }}>
      <span style={{ width:7, height:7, borderRadius:'50%', backgroundColor:c.color, display:'inline-block', flexShrink:0 }} />
      {c.label}
      {showDetail && status === 'overdue' && overdueDays != null && (
        <span style={{ fontSize:'0.7rem', opacity:0.8, marginLeft:2 }}>({overdueDays}d)</span>
      )}
    </span>
  )
}
