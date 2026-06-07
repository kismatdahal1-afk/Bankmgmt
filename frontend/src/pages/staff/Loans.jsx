import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import LoansTable from '../../components/tables/LoansTable'
import { useAuth } from '../../context/AuthContext'

export default function StaffLoans() {
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    fetch('/api/loans/')
      .then(r => r.json())
      .then(d => { setLoans(d.loans || d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>Loan Management</h1>
          <p>Manage credit applications and installment repayments</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <Link to="/staff/loans/apply" className="btn btn-primary">
          <span className="material-symbols-rounded">add_circle</span>
          Apply for Loan
        </Link>
      </div>

      <LoansTable
        loans={loans}
        onRepay={(loanId) => window.location.href = `/staff/loans/repay/${loanId}`}
        userRole={user?.role}
      />
    </>
  )
}
