import React, { useState, useEffect } from 'react'
import AccountCard from '../../components/cards/AccountCard'
import EmptyState from '../../components/common/EmptyState'

export default function StaffAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/accounts/')
      .then(r => r.json())
      .then(d => { setAccounts(d.accounts || d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>Account Management</h1>
          <p>Manage all customer bank accounts</p>
        </div>
      </div>

      {loading ? (
        <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>
      ) : (
        <div className="grid grid-2">
          {accounts.length > 0 ? accounts.map(acc => (
            <AccountCard key={acc.id} account={acc} />
          )) : (
            <EmptyState icon="account_balance_wallet" message="No accounts found." />
          )}
        </div>
      )}
    </>
  )
}
