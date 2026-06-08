import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../../services/api'
import AccountCard from '../../components/cards/AccountCard'
import EmptyState from '../../components/common/EmptyState'

export default function UserMyAccounts() {
  const navigate = useNavigate()
  const location = useLocation()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/customer/accounts')
      .then(r => { setAccounts(r.data.accounts || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [location.pathname])

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">My Accounts</div>
          <div className="page-subtitle">All accounts held under your customer profile.</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/user/accounts/apply')}>
          <span className="material-symbols-rounded">add</span>
          New Account
        </button>
      </div>

      {loading ? (
        <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>
      ) : (
        <div className="grid grid-2">
          {accounts.length > 0 ? accounts.map(acc => (
            <AccountCard key={acc.id} account={acc} />
          )) : (
            <EmptyState icon="account_balance_wallet" message="You don't have any accounts yet." />
          )}
        </div>
      )}
    </>
  )
}
