import React, { useState, useEffect } from 'react'
import AccountCard from '../../components/cards/AccountCard'
import EmptyState from '../../components/common/EmptyState'

export default function UserMyAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/customer/accounts')
      .then(r => r.json())
      .then(d => { setAccounts(d.accounts || d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">My Accounts</div>
          <div className="page-subtitle">All accounts held under your customer profile.</div>
        </div>
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
