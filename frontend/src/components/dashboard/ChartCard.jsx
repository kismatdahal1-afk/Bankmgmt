import React from 'react'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend)

function hasData(arr) {
  return arr && arr.some(v => v > 0)
}

function EmptyChart({ message }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: 'var(--text-muted)',
      gap: '8px'
    }}>
      <span className="material-symbols-rounded" style={{ fontSize: '40px' }}>bar_chart</span>
      <span style={{ fontSize: '0.9rem' }}>{message || 'No transaction data available for this period.'}</span>
    </div>
  )
}

export default function ChartCard({ labels, deposits, withdrawals, transfers }) {
  const showLine = hasData(deposits) || hasData(withdrawals) || hasData(transfers)
  const totalDeposits = deposits.reduce((s, v) => s + v, 0)
  const totalWithdrawals = withdrawals.reduce((s, v) => s + v, 0)
  const totalTransfers = transfers.reduce((s, v) => s + v, 0)
  const showBar = totalDeposits > 0 || totalWithdrawals > 0 || totalTransfers > 0

  const lineData = {
    labels,
    datasets: [
      {
        label: 'Deposits (NPR)',
        data: deposits,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        tension: 0.3,
        fill: true
      },
      {
        label: 'Withdrawals (NPR)',
        data: withdrawals,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 3,
        tension: 0.3,
        fill: true
      },
      {
        label: 'Transfers (NPR)',
        data: transfers,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        tension: 0.3,
        fill: true
      }
    ]
  }

  const lineOptions = {
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

  const barData = {
    labels: ['Deposits', 'Withdrawals', 'Transfers'],
    datasets: [
      {
        label: 'Total (NPR)',
        data: [totalDeposits, totalWithdrawals, totalTransfers],
        backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(59, 130, 246, 0.8)'],
        borderColor: ['#10b981', '#ef4444', '#3b82f6'],
        borderWidth: 2,
        borderRadius: 6
      }
    ]
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { color: '#374151' },
        ticks: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans', weight: '600' } }
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
    <>
      <div className="table-container" style={{ flex: 2, minWidth: '450px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <span className="table-title" style={{ color: '#fff', fontWeight: 700 }}>
          Transaction Trends (Last 7 Days)
        </span>
        <div style={{ position: 'relative', width: '100%', height: '320px' }}>
          {showLine ? <Line data={lineData} options={lineOptions} /> : <EmptyChart message="No transactions in the last 7 days." />}
        </div>
      </div>

      <div className="table-container" style={{ flex: 1, minWidth: '300px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <span className="table-title" style={{ color: '#fff', fontWeight: 700 }}>
          Deposit vs Withdrawal vs Transfer (7-Day Totals)
        </span>
        <div style={{ position: 'relative', width: '100%', height: '280px' }}>
          {showBar ? <Bar data={barData} options={barOptions} /> : <EmptyChart message="No transaction data for this period." />}
        </div>
      </div>
    </>
  )
}
