import React, { useState, useEffect } from 'react'
import BalanceCard from '../../components/cards/BalanceCard'
import AccountCard from '../../components/cards/AccountCard'
import { formatCurrency } from '../../utils/helpers'

export default function UserMyBalance() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/customer/accounts')
      .then(r => r.json())
      .then(d => {
        const list = d.accounts || d
        setAccounts(list)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0)

  if (loading) return <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">My Balance</div>
          <div className="page-subtitle">Complete overview of your account balances.</div>
        </div>
      </div>

      <BalanceCard balance={totalBalance} accountCount={accounts.filter(a => a.status === 'active').length} />

      <div className="grid grid-2">
        {accounts.length > 0 ? accounts.map(acc => (
          <AccountCard key={acc.id} account={acc} />
        )) : (
          <div className="empty" style={{ gridColumn: '1 / -1' }}>
            <span className="material-symbols-rounded">account_balance_wallet</span>
            <div>No accounts found.</div>
          </div>
        )}
      </div>
    </>
  )
}
