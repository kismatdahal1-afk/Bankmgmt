import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../../services/api'
import LoanCard from '../../components/cards/LoanCard'
import EmptyState from '../../components/common/EmptyState'

export default function UserMyLoans() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/customer/loans')
      .then(r => { setLoans(r.data.loans || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [location.pathname])

  const overdueCount = (loans || []).filter(l => l.is_overdue).length

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">My Loans</div>
          <div className="page-subtitle">Track active loans, repayments and history.</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/user/loans/apply')}>
          <span className="material-symbols-rounded">add</span>
          New Loan
        </button>
      </div>

      {overdueCount > 0 && (
        <div className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '0.9rem', textTransform: 'none', letterSpacing: '0', fontWeight: 500, width: 'fit-content' }}>
          <span className="material-symbols-rounded">warning</span>
          {overdueCount} loan{overdueCount > 1 ? 's' : ''} overdue
        </div>
      )}

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
