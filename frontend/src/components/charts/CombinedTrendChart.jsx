import { useRef, useEffect, useState, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAILY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function formatNPR(val) {
  if (val >= 10000000) return 'NPR ' + (val / 10000000).toFixed(1) + 'Cr'
  if (val >= 100000) return 'NPR ' + (val / 100000).toFixed(1) + 'L'
  if (val >= 1000) return 'NPR ' + (val / 1000).toFixed(1) + 'K'
  return 'NPR ' + Math.round(val)
}

function buildMonthlyData(raw) {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  return (raw || []).map(d => ({
    ...d,
    outstanding: d.month > currentMonth ? null : d.outstanding,
    emi_collected: d.month > currentMonth ? null : d.emi_collected
  }))
}

function buildDailyData(raw) {
  const now = new Date()
  const todayIdx = (now.getDay() + 6) % 7
  const lookup = {}
  ;(raw || []).forEach(d => { lookup[d.label] = d })
  return DAILY_LABELS.map((label, i) => {
    const entry = lookup[label]
    if (entry && i <= todayIdx) {
      return { label, outstanding: entry.outstanding, emi_collected: entry.emi_collected }
    }
    return { label, outstanding: null, emi_collected: null }
  })
}

export default function CombinedTrendChart({ data, height = 260, timeRange = 'monthly' }) {
  const chartRef = useRef(null)
  const [gradients, setGradients] = useState(null)

  const chartData = useMemo(() => {
    const raw = data || []
    return timeRange === 'daily' ? buildDailyData(raw) : buildMonthlyData(raw)
  }, [data, timeRange])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || chartData.length === 0) return
    const ctx = chart.ctx
    const h = chart.height
    const gBlue = ctx.createLinearGradient(0, 0, 0, h)
    gBlue.addColorStop(0, 'rgba(59, 130, 246, 0.3)')
    gBlue.addColorStop(1, 'rgba(59, 130, 246, 0.02)')
    const gGreen = ctx.createLinearGradient(0, 0, 0, h)
    gGreen.addColorStop(0, 'rgba(16, 185, 129, 0.3)')
    gGreen.addColorStop(1, 'rgba(16, 185, 129, 0.02)')
    setGradients({ blue: gBlue, green: gGreen })
  }, [chartData])

  const labels = chartData.map(d => timeRange === 'daily' ? d.label : MONTHS[d.month])
  const outstandingData = chartData.map(d => d.outstanding)
  const emiData = chartData.map(d => d.emi_collected)

  const lineData = {
    labels,
    datasets: [
      {
        label: 'Outstanding Balance (NPR)',
        data: outstandingData,
        borderColor: '#3b82f6',
        backgroundColor: gradients?.blue || 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2.5,
        tension: 0.35,
        fill: true,
        spanGaps: false,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#3b82f6',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
      },
      {
        label: 'EMI Collection (NPR)',
        data: emiData,
        borderColor: '#10b981',
        backgroundColor: gradients?.green || 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2.5,
        tension: 0.35,
        fill: true,
        spanGaps: false,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#10b981',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: 'easeOutQuart'
    },
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#d1d5db',
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '500' },
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle'
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
        boxPadding: 4,
        usePointStyle: true,
        callbacks: {
          title: (items) => items[0].label,
          label: (ctx) => {
            if (ctx.parsed.y === null) return ''
            return `  ${ctx.dataset.label}: ${formatNPR(ctx.parsed.y)}`
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(55, 65, 81, 0.4)', drawBorder: false },
        ticks: { color: '#9ca3af', font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '500' } }
      },
      y: {
        grid: { color: 'rgba(55, 65, 81, 0.4)', drawBorder: false },
        ticks: {
          color: '#9ca3af',
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '500' },
          callback: (val) => formatNPR(val)
        },
        beginAtZero: true
      }
    }
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ height, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
        <span className="material-symbols-rounded" style={{ fontSize:36, marginRight:8 }}>bar_chart</span>
        No trend data available
      </div>
    )
  }

  return (
    <div style={{ width:'100%', height, position:'relative' }}>
      <Line ref={chartRef} data={lineData} options={options} />
    </div>
  )
}
