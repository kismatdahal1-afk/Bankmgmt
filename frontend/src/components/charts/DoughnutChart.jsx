import { useState, useMemo } from 'react'

const COLORS = {
  healthy: '#10b981',
  upcoming: '#3b82f6',
  overdue: '#ef4444',
  at_risk: '#f59e0b',
  completed_soon: '#8b5cf6'
}

const LABELS = {
  healthy: 'Healthy',
  upcoming: 'Upcoming Payments',
  overdue: 'Overdue',
  at_risk: 'At Risk',
  completed_soon: 'Completed Soon'
}

function formatTooltip(val) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`
  return `₹${val}`
}

export default function DoughnutChart({ healthDistribution, totalActive, size = 200 }) {
  const [hovered, setHovered] = useState(null)
  const [activeFilter, setActiveFilter] = useState(null)

  const segments = useMemo(() => {
    const hd = healthDistribution || {}
    const raw = [
      { key: 'healthy', value: hd.healthy || 0, color: COLORS.healthy },
      { key: 'upcoming', value: hd.upcoming || 0, color: COLORS.upcoming },
      { key: 'overdue', value: hd.overdue || 0, color: COLORS.overdue },
      { key: 'at_risk', value: hd.high_risk || 0, color: COLORS.at_risk },
      { key: 'completed_soon', value: hd.near_completion || 0, color: COLORS.completed_soon }
    ]
    const total = raw.reduce((s, r) => s + r.value, 0) || 1
    return raw.map(r => ({ ...r, pct: (r.value / total) * 100 }))
  }, [healthDistribution])

  const total = segments.reduce((s, r) => s + r.value, 0)
  const radius = 15
  const circ = 2 * Math.PI * radius
  const half = size / 2
  const strokeW = 4.5
  const innerR = radius - strokeW / 2

  let offset = 0
  const arcs = segments.filter(s => s.value > 0).map(s => {
    const len = (s.pct / 100) * circ
    const seg = { ...s, dash: `${len} ${circ - len}`, offset: -offset, len }
    offset += len
    return seg
  })

  const filteredSegments = activeFilter ? segments.filter(s => s.key === activeFilter) : segments
  const activeTotal = activeFilter ? (segments.find(s => s.key === activeFilter)?.value || 0) : total

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
      <div style={{ position:'relative', width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} style={{ width:'100%', height:'100%', transform:'rotate(-90deg)' }}>
          <circle cx={half} cy={half} r={radius} fill="none" stroke="var(--bg-tertiary)" strokeWidth={strokeW} />
          {arcs.map((s, i) => (
            <circle
              key={s.key}
              cx={half} cy={half} r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeW}
              strokeDasharray={s.dash}
              strokeDashoffset={s.offset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.6s ease, opacity 0.2s ease',
                opacity: hovered && hovered !== s.key ? 0.3 : 1,
                cursor: 'pointer'
              }}
              onMouseEnter={() => setHovered(s.key)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setActiveFilter(activeFilter === s.key ? null : s.key)}
            />
          ))}
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>{activeTotal}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{activeFilter ? LABELS[activeFilter] : 'Total Loans'}</span>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 16px', width:'100%', maxWidth:260 }}>
        {segments.map(s => {
          const isActive = activeFilter === s.key
          const isHovered = hovered === s.key
          const show = !activeFilter || isActive
          return (
            <div
              key={s.key}
              style={{
                display:'flex', alignItems:'center', gap:7, padding:'4px 6px', borderRadius:6,
                cursor:'pointer', fontSize:12, color:'var(--text-secondary)',
                background: isActive ? `${s.color}15` : 'transparent',
                opacity: (!hovered || isHovered) ? 1 : 0.4,
                transition: 'all 0.15s'
              }}
              onMouseEnter={() => setHovered(s.key)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setActiveFilter(isActive ? null : s.key)}
            >
              <span style={{ width:8, height:8, borderRadius:'50%', background:s.color, flexShrink:0 }} />
              <span style={{ flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{LABELS[s.key]}</span>
              {s.value > 0 && <span style={{ fontWeight:600, color:'#fff', fontSize:12 }}>{s.value}</span>}
              {s.value > 0 && total > 0 && <span style={{ color:'var(--text-muted)', fontSize:10 }}>({s.pct.toFixed(0)}%)</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
