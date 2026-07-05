import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const TYPE_COLORS = {
  'Personal Loan': { bg: 'rgba(59, 130, 246, 0.85)', border: '#3b82f6' },
  'Business Loan': { bg: 'rgba(16, 185, 129, 0.85)', border: '#10b981' },
  'Home Loan': { bg: 'rgba(139, 92, 246, 0.85)', border: '#8b5cf6' },
  'Education Loan': { bg: 'rgba(245, 158, 11, 0.85)', border: '#f59e0b' },
  'Agriculture Loan': { bg: 'rgba(34, 197, 94, 0.85)', border: '#22c55e' },
  'Vehicle Loan': { bg: 'rgba(236, 72, 153, 0.85)', border: '#ec4899' },
  'Other': { bg: 'rgba(107, 114, 128, 0.85)', border: '#6b7280' }
}

const FALLBACK_COLORS = [
  { bg: 'rgba(59, 130, 246, 0.85)', border: '#3b82f6' },
  { bg: 'rgba(16, 185, 129, 0.85)', border: '#10b981' },
  { bg: 'rgba(139, 92, 246, 0.85)', border: '#8b5cf6' },
  { bg: 'rgba(245, 158, 11, 0.85)', border: '#f59e0b' },
  { bg: 'rgba(34, 197, 94, 0.85)', border: '#22c55e' },
  { bg: 'rgba(236, 72, 153, 0.85)', border: '#ec4899' }
]

function formatTooltip(val) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`
  return `₹${val}`
}

export default function LoanTypeDoughnut({ distribution, totalActive }) {
  const dist = distribution || []
  const labels = dist.map(d => d.loan_type)
  const counts = dist.map(d => d.count)
  const colors = dist.map((d, i) => {
    const known = TYPE_COLORS[d.loan_type]
    if (known) return known
    return FALLBACK_COLORS[i % FALLBACK_COLORS.length]
  })

  const data = {
    labels,
    datasets: [
      {
        data: counts,
        backgroundColor: colors.map(c => c.bg),
        borderColor: colors.map(c => c.border),
        borderWidth: 2,
        hoverOffset: 8
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    animation: {
      animateRotate: true,
      duration: 800,
      easing: 'easeOutQuart'
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#d1d5db',
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 10, weight: '500' },
          padding: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          generateLabels: (chart) => {
            const data = chart.data
            return data.labels.map((label, i) => ({
              text: `${label} (${counts[i]})`,
              fillStyle: colors[i].bg,
              strokeStyle: colors[i].border,
              pointStyle: 'circle',
              index: i
            }))
          }
        }
      },
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
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0) || 1
            const pct = ((ctx.parsed / total) * 100).toFixed(1)
            return `  ${ctx.label}: ${ctx.parsed} loan${ctx.parsed !== 1 ? 's' : ''} (${pct}%)`
          }
        }
      }
    }
  }

  const total = counts.reduce((a, b) => a + b, 0)

  if (dist.length === 0) {
    return (
      <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', flexDirection:'column', gap:8 }}>
        <span className="material-symbols-rounded" style={{ fontSize:36 }}>donut_small</span>
        No loan type data
      </div>
    )
  }

  return (
    <div style={{ position:'relative', width:'100%', height:240 }}>
      <Doughnut data={data} options={options} />
      <div style={{ position:'absolute', top:'42%', left:'50%', transform:'translate(-50%, -50%)', textAlign:'center', pointerEvents:'none' }}>
        <div style={{ fontSize:22, fontWeight:700, color:'#fff', lineHeight:1.1 }}>{totalActive || total}</div>
        <div style={{ fontSize:10, color:'var(--text-muted)' }}>Active Loans</div>
      </div>
    </div>
  )
}
