import React from 'react'
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

export default function LineChart({ labels, datasets, height = 320 }) {
  const data = { labels, datasets }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#f3f4f6', font: { family: 'Plus Jakarta Sans', weight: '500' } }
      }
    },
    scales: {
      x: {
        grid: { color: '#374151' },
        ticks: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans' } }
      },
      y: {
        grid: { color: '#374151' },
        ticks: {
          color: '#9ca3af',
          font: { family: 'Plus Jakarta Sans' },
          callback: (val) => 'NPR ' + val.toLocaleString()
        }
      }
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
      <Line data={data} options={options} />
    </div>
  )
}
