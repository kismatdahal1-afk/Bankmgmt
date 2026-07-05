import { useState, useMemo } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'

ChartJS.register(ArcElement, Tooltip)

const VIEWS = [
  { key: 'repayment', label: 'Repayment Performance' },
  { key: 'health', label: 'Loan Health' },
  { key: 'type', label: 'Loan Type' },
  { key: 'risk', label: 'Risk Level' },
  { key: 'status', label: 'Loan Status' }
]

const PALETTES = {
  repayment: [
    { bg: 'rgba(16,185,129,0.85)', border: '#10b981' },
    { bg: 'rgba(245,158,11,0.85)', border: '#f59e0b' },
    { bg: 'rgba(249,115,22,0.85)', border: '#f97316' },
    { bg: 'rgba(239,68,68,0.85)', border: '#ef4444' },
    { bg: 'rgba(107,114,128,0.85)', border: '#6b7280' }
  ],
  health: [
    { bg: 'rgba(16,185,129,0.85)', border: '#10b981' },
    { bg: 'rgba(245,158,11,0.85)', border: '#f59e0b' },
    { bg: 'rgba(249,115,22,0.85)', border: '#f97316' },
    { bg: 'rgba(239,68,68,0.85)', border: '#ef4444' }
  ],
  type: [
    { bg: 'rgba(59,130,246,0.85)', border: '#3b82f6' },
    { bg: 'rgba(16,185,129,0.85)', border: '#10b981' },
    { bg: 'rgba(139,92,246,0.85)', border: '#8b5cf6' },
    { bg: 'rgba(245,158,11,0.85)', border: '#f59e0b' },
    { bg: 'rgba(34,197,94,0.85)', border: '#22c55e' },
    { bg: 'rgba(236,72,153,0.85)', border: '#ec4899' },
    { bg: 'rgba(107,114,128,0.85)', border: '#6b7280' }
  ],
  risk: [
    { bg: 'rgba(16,185,129,0.85)', border: '#10b981' },
    { bg: 'rgba(245,158,11,0.85)', border: '#f59e0b' },
    { bg: 'rgba(249,115,22,0.85)', border: '#f97316' },
    { bg: 'rgba(239,68,68,0.85)', border: '#ef4444' }
  ],
  status: [
    { bg: 'rgba(59,130,246,0.85)', border: '#3b82f6' },
    { bg: 'rgba(16,185,129,0.85)', border: '#10b981' },
    { bg: 'rgba(107,114,128,0.85)', border: '#6b7280' },
    { bg: 'rgba(245,158,11,0.85)', border: '#f59e0b' }
  ]
}

const CENTER_LABELS = {
  repayment: 'Payments',
  health: 'Loans',
  type: 'Active Loans',
  risk: 'Loans',
  status: 'Loans'
}

export default function PortfolioDoughnut({ distributions, totalActive, view: externalView, onViewChange }) {
  const [internalView, setInternalView] = useState('repayment')
  const view = externalView || internalView

  const distData = useMemo(() => {
    const raw = distributions?.[view] || []
    return raw.filter(d => d.value > 0)
  }, [distributions, view])

  const palette = PALETTES[view] || PALETTES.repayment
  const values = distData.map(d => d.value)
  const labels = distData.map(d => d.label)
  const total = values.reduce((a, b) => a + b, 0)
  const centerTotal = view === 'repayment' ? total : totalActive ?? total

  const chartData = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: palette.map((p, i) => p.bg).slice(0, values.length),
      borderColor: palette.map((p, i) => p.border).slice(0, values.length),
      borderWidth: 2,
      hoverOffset: 8
    }]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    animation: { animateRotate: true, duration: 600, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#f3f4f6',
        titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '600' },
        bodyColor: '#d1d5db',
        bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => {
            const t = ctx.dataset.data.reduce((a, b) => a + b, 0) || 1
            const pct = ((ctx.parsed / t) * 100).toFixed(1)
            return `  ${ctx.label}: ${ctx.parsed} (${pct}%)`
          }
        }
      }
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ position:'relative', width:'100%', height:200 }}>
        {distData.length === 0 ? (
          <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', flexDirection:'column', gap:6 }}>
            <span className="material-symbols-rounded" style={{ fontSize:32 }}>donut_small</span>
            No data for this view
          </div>
        ) : (
          <>
            <Doughnut data={chartData} options={options} />
            <div style={{ position:'absolute', top:'38%', left:'50%', transform:'translate(-50%, -50%)', textAlign:'center', pointerEvents:'none' }}>
              <div style={{ fontSize:22, fontWeight:700, color:'#fff', lineHeight:1.1 }}>{centerTotal}</div>
              <div style={{ fontSize:9, color:'var(--text-muted)', marginTop:1 }}>{CENTER_LABELS[view]}</div>
            </div>
          </>
        )}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {distData.map((d, i) => {
          const c = palette[i] || palette[palette.length - 1]
          const barW = Math.max(2, d.percentage)
          return (
            <div key={d.label} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:c.bg, flexShrink:0 }} />
              <span style={{ flex:'0 0 auto', color:'var(--text-secondary)', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.label}</span>
              <div style={{ flex:1, height:4, background:'var(--bg-tertiary)', borderRadius:2, overflow:'hidden', minWidth:30 }}>
                <div style={{ width:`${barW}%`, height:'100%', background:c.bg, borderRadius:2, transition:'width 0.4s ease' }} />
              </div>
              <span style={{ flexShrink:0, fontWeight:600, color:'#fff', minWidth:20, textAlign:'right' }}>{d.value}</span>
              <span style={{ flexShrink:0, color:'var(--text-muted)', minWidth:36, textAlign:'right' }}>{d.percentage.toFixed(0)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
