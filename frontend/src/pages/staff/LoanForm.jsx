import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import LoanFormComponent from '../../components/forms/LoanForm'

export default function StaffLoanForm() {
  const [customers, setCustomers] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/customers/')
      .then(r => r.json())
      .then(d => setCustomers(d.customers || d))
      .catch(err => console.error('Fetch error:', err))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    try {
      await fetch('/api/loans/apply', { method: 'POST', body: new URLSearchParams(formData) })
      navigate('/staff/loans')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>Apply for Loan</h1>
          <p>Initiate a new credit contract request for validation</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
        <Link to="/staff/loans" className="btn btn-secondary">
          <span className="material-symbols-rounded">arrow_back</span>
          Back to Loans
        </Link>
      </div>

      <LoanFormComponent customers={customers} onSubmit={handleSubmit} />
    </>
  )
}
