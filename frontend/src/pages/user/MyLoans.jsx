import React, { useState, useEffect } from 'react'
import LoanCard from '../../components/cards/LoanCard'
import EmptyState from '../../components/common/EmptyState'

export default function UserMyLoans() {
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/customer/loans')
      .then(r => r.json())
      .then(d => { setLoans(d.loans || d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">My Loans</div>
          <div className="page-subtitle">Track active loans, repayments and history.</div>
        </div>
      </div>

      {loading ? (
        <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>
      ) : (
        <div className="grid grid-2">
          {loans.length > 0 ? loans.map(loan => (
            <LoanCard key={loan.id} loan={loan} />
          )) : (
            <EmptyState icon="request_quote" message="You don't have any loans on record." />
          )}
        </div>
      )}
    </>
  )
}
