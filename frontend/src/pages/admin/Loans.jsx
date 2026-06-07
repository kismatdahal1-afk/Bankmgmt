import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import LoansTable from '../../components/tables/LoansTable'
import { useAuth } from '../../context/AuthContext'

export default function AdminLoans() {
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    fetch('/api/loans/')
      .then(r => r.json())
      .then(d => { setLoans(d.loans || d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleApprove = async (loanId) => {
    try {
      await fetch(`/api/loans/approve/${loanId}`, { method: 'POST' })
      setLoans(prev => prev.map(l => l.id === loanId ? { ...l, status: 'approved' } : l))
    } catch (e) { console.error(e) }
  }

  const handleReject = async (loanId) => {
    if (!confirm('Are you sure you want to reject this loan application?')) return
    try {
      await fetch(`/api/loans/reject/${loanId}`, { method: 'POST' })
      setLoans(prev => prev.map(l => l.id === loanId ? { ...l, status: 'rejected' } : l))
    } catch (e) { console.error(e) }
  }

  if (loading) return <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>Loan Management</h1>
          <p>Manage credit applications, approvals, and installment repayments</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <Link to="/admin/loans/apply" className="btn btn-primary">
          <span className="material-symbols-rounded">add_circle</span>
          Apply for Loan
        </Link>
      </div>

      <LoansTable
        loans={loans}
        onApprove={handleApprove}
        onReject={handleReject}
        onRepay={(loanId) => window.location.href = `/admin/loans/repay/${loanId}`}
        userRole={user?.role}
      />
    </>
  )
}
