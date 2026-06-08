import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import TransactionFormComponent from '../../components/forms/TransactionForm'

export default function StaffTransactionForm() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState([])
  const isDeposit = window.location.pathname.includes('deposit')
  const action = isDeposit ? 'Deposit' : 'Withdraw'
  const selectedAccountNum = searchParams.get('account_number')

  useEffect(() => {
    fetch('/api/accounts/')
      .then(r => r.json())
      .then(d => setAccounts(d.accounts || d))
      .catch(err => console.error('Fetch error:', err))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const url = isDeposit ? '/api/transactions/deposit' : '/api/transactions/withdraw'
    try {
      await fetch(url, { method: 'POST', body: new URLSearchParams(formData) })
      navigate('/staff/transactions')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>{action} Funds</h1>
          <p>{isDeposit ? "Credit funds into a member's active bank account" : "Debit funds from a member's active bank account"}</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
        <Link to="/staff/transactions" className="btn btn-secondary">
          <span className="material-symbols-rounded">arrow_back</span>
          Back to Ledger
        </Link>
      </div>

      <TransactionFormComponent action={action} accounts={accounts} selectedAccountNum={selectedAccountNum} onSubmit={handleSubmit} />
    </>
  )
}
