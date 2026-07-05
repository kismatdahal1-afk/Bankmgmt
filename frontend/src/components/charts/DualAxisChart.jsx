import { useState, useEffect, useRef, useMemo } from 'react'

const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function smoothPoints(points) {
  if (points.length < 2) return points
  const result = []
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(points.length - 1, i + 1)]
    const cp1x = (points[i].x + prev.x) / 2
    const cp2x = (points[i].x + next.x) / 2
    const cp1y = prev.y
    const cp2y = next.y
    if (i === 0) {
      result.push({ type: 'M', x: points[i].x, y: points[i].y })
    } else {
      result.push({ type: 'C', x1: cp1x, y1: cp1y, x2: cp2x, y2: cp2y, x: points[i].x, y: points[i].y })
    }
  }
  return result
}

function buildPathData(commands) {
  return commands.map(c => {
    if (c.type === 'M') return `M ${c.x} ${c.y}`
    if (c.type === 'C') return `C ${c.x1} ${c.y1}, ${c.x2} ${c.y2}, ${c.x} ${c.y}`
    if (c.type === 'L') return `L ${c.x} ${c.y}`
    return ''
  }).join(' ')
}

function formatCurrencySVG(val) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`
  return `₹${val}`
}

export default function DualAxisChart({ data, height = 260 }) {
  const [animated, setAnimated] = useState(false)
  const [tooltip, setTooltip] = useState(null)
  const containerRef = useRef(null)
  const [dim, setDim] = useState({ width: 700, height })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDim(w => ({ ...w, width: entry.contentRect.width }))
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [height])

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(t)
  }, [])

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null
    const outstandingVals = data.map(d => d.outstanding)
    const emiVals = data.map(d => d.emi_collected)
    const maxOutstanding = Math.max(...outstandingVals, 1)
    const maxEMI = Math.max(...emiVals, 1)

    const padAmt = d => {
      const m = Math.max(maxOutstanding, maxEMI)
      if (m === 0) return 0
      return d / m
    }

    const labels = data.map(d => `${MONTHS[d.month]} ${d.year}`)
    const leftTicks = []
    const tickCount = 5
    for (let i = 0; i <= tickCount; i++) {
      leftTicks.push(Math.round((maxOutstanding / tickCount) * i))
    }
    const rightTicks = []
    for (let i = 0; i <= tickCount; i++) {
      rightTicks.push(Math.round((maxEMI / tickCount) * i))
    }

    const padL = 52, padR = 48, padTop = 16, padBot = 36
    const chartW = dim.width - padL - padR
    const chartH = dim.height - padTop - padBot

    const xScale = (i) => padL + (chartW / (data.length - 1 || 1)) * i
    const yScale = (v, max) => padTop + chartH - (v / max) * chartH

    const outstandingPoints = data.map((d, i) => ({
      x: xScale(i), y: yScale(d.outstanding, maxOutstanding)
    }))
    const emiPoints = data.map((d, i) => ({
      x: xScale(i), y: yScale(d.emi_collected, maxEMI)
    }))

    const outstandingSmooth = smoothPoints(outstandingPoints)

    let areaPath = ''
    if (outstandingSmooth.length > 0) {
      const first = outstandingSmooth[0]
      areaPath = buildPathData(outstandingSmooth)
      const lastPt = outstandingPoints[outstandingPoints.length - 1]
      areaPath += ` L ${lastPt.x} ${padTop + chartH} L ${first.x} ${padTop + chartH} Z`
    }

    const emiSmoothPath = buildPathData(smoothPoints(emiPoints))

    const gridLines = []
    for (let i = 0; i <= tickCount; i++) {
      const y = padTop + (chartH / tickCount) * i
      gridLines.push({ y, label: leftTicks[tickCount - i] })
    }

    const monthLabels = data.map((d, i) => ({
      x: xScale(i), label: `${MONTHS[d.month]}`, full: `${MONTHS[d.month]} ${d.year}`
    }))

    return {
      maxOutstanding, maxEMI, padL, padR, padTop, padBot, chartW, chartH,
      outstandingPoints, emiPoints, outstandingSmooth, areaPath, emiSmoothPath,
      gridLines, monthLabels, labels, leftTicks, rightTicks
    }
  }, [data, dim])

  const handleMouseMove = (e) => {
    if (!chartData || !data) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    let closest = 0
    let minDist = Infinity
    for (let i = 0; i < data.length; i++) {
      const dist = Math.abs(chartData.outstandingPoints[i].x - mouseX)
      if (dist < minDist) { minDist = dist; closest = i }
    }
    if (data[closest]) {
      setTooltip({
        index: closest,
        x: chartData.outstandingPoints[closest].x,
        y: Math.min(chartData.outstandingPoints[closest].y, chartData.emiPoints[closest].y) - 12,
        d: data[closest]
      })
    }
  }

  const handleMouseLeave = () => setTooltip(null)

  if (!chartData || !data || data.length === 0) {
    return <div style={{ height, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>No trend data available</div>
  }

  const animClass = animated ? 1 : 0

  return (
    <div ref={containerRef} style={{ width:'100%', height, position:'relative' }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <svg width={dim.width} height={dim.height} viewBox={`0 0 ${dim.width} ${dim.height}`} style={{ width:'100%', height:'100%', overflow:'visible' }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <filter id="shadow1"><feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15" /></filter>
        </defs>

        {chartData.gridLines.map((g, i) => (
          <g key={i}>
            <line x1={chartData.padL} y1={g.y} x2={dim.width - chartData.padR} y2={g.y} stroke="var(--border-color)" strokeOpacity="0.5" strokeWidth="1" />
            <text x={chartData.padL - 8} y={g.y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="10">{formatCurrencySVG(g.label)}</text>
          </g>
        ))}

        {chartData.rightTicks.map((val, i) => {
          const y = chartData.padTop + (chartData.chartH / chartData.rightTicks.length) * (chartData.rightTicks.length - i)
          return (
            <text key={`rt${i}`} x={dim.width - chartData.padR + 8} y={y + 4} textAnchor="start" fill="var(--text-muted)" fontSize="10" opacity="0.7">{formatCurrencySVG(val)}</text>
          )
        })}

        {chartData.monthLabels.map((m, i) => (
          <text key={i} x={m.x} y={dim.height - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="10">
            {i === 0 || i === chartData.monthLabels.length - 1 || data[i].emi_collected > 0 || data[i].outstanding > 0 ? m.label : ''}
          </text>
        ))}

        <path d={chartData.areaPath} fill="url(#areaGrad)" style={{ transition: 'opacity 0.8s ease', opacity: animClass }} />

        <path d={chartData.emiSmoothPath} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'opacity 0.8s ease 0.15s', opacity: animClass }} filter="url(#shadow1)" />

        {chartData.outstandingPoints.map((p, i) => (
          <circle key={`o${i}`} cx={p.x} cy={p.y} r={animClass ? 3.5 : 0} fill="#3b82f6" stroke="#fff" strokeWidth="1.5" style={{ transition: 'r 0.3s ease, opacity 0.3s ease', opacity: animClass, cursor:'pointer' }} />
        ))}

        {chartData.emiPoints.map((p, i) => (
          <circle key={`e${i}`} cx={p.x} cy={p.y} r={animClass ? 3 : 0} fill="#10b981" stroke="#fff" strokeWidth="1.5" style={{ transition: 'r 0.3s ease 0.2s, opacity 0.3s ease 0.2s', opacity: animClass, cursor:'pointer' }} />
        ))}

        {tooltip && (
          <g>
            <line x1={tooltip.x} y1={chartData.padTop} x2={tooltip.x} y2={dim.height - chartData.padBot} stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
            <rect x={tooltip.x - 66} y={tooltip.y - 54} width={132} height={50} rx="6" fill="var(--bg-secondary)" stroke="var(--border-color)" strokeWidth="1" filter="url(#shadow1)" />
            <text x={tooltip.x} y={tooltip.y - 38} textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontWeight="500">{chartData.monthLabels[tooltip.index]?.full}</text>
            <text x={tooltip.x} y={tooltip.y - 22} textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="600">Outstanding: {formatCurrencySVG(tooltip.d.outstanding)}</text>
            <text x={tooltip.x} y={tooltip.y - 8} textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="600">EMI Collected: {formatCurrencySVG(tooltip.d.emi_collected)}</text>
          </g>
        )}
      </svg>

      <div style={{ display:'flex', justifyContent:'center', gap:28, marginTop:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text-secondary)' }}>
          <span style={{ width:12, height:3, borderRadius:2, background:'#3b82f6', display:'inline-block' }} />
          Outstanding Balance
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text-secondary)' }}>
          <span style={{ width:12, height:3, borderRadius:2, background:'#10b981', display:'inline-block' }} />
          EMI Collection
        </div>
      </div>
    </div>
  )
}
