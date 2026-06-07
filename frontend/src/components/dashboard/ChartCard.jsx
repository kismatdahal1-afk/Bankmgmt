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

export default function ChartCard({ labels, deposits, withdrawals }) {
  const data = {
    labels,
    datasets: [
      {
        label: 'Deposits ($)',
        data: deposits,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        tension: 0.3,
        fill: true
      },
      {
        label: 'Withdrawals ($)',
        data: withdrawals,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 3,
        tension: 0.3,
        fill: true
      }
    ]
  }

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
          callback: (val) => '$' + val.toLocaleString()
        }
      }
    }
  }

  return (
    <div className="table-container" style={{ flex: 2, minWidth: '450px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <span className="table-title" style={{ color: '#fff', fontWeight: 700 }}>
        Transaction Trends (Last 7 Days)
      </span>
      <div style={{ position: 'relative', width: '100%', height: '320px' }}>
        <Line data={data} options={options} />
      </div>
    </div>
  )
}
