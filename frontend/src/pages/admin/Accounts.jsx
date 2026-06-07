import React, { useState, useEffect } from 'react'
import AccountCard from '../../components/cards/AccountCard'
import EmptyState from '../../components/common/EmptyState'

export default function AdminAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/accounts/')
      .then(r => r.json())
      .then(d => { setAccounts(d.accounts || d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleAction = async (action, accountId) => {
    const urlMap = { freeze: 'freeze', unfreeze: 'unfreeze', close: 'close' }
    const url = `/api/accounts/${urlMap[action]}/${accountId}`
    const msg = action === 'freeze' ? 'Freeze this account?' : action === 'unfreeze' ? 'Unfreeze this account?' : 'Close this account?'
    if (!confirm(msg)) return
    try {
      const res = await fetch(url, { method: 'POST' })
      const d = await res.json()
      if (d.error) { alert(d.error); return }
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, ...d.account } : a))
    } catch (e) { console.error(e) }
  }

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>Account Management</h1>
          <p>Manage all customer bank accounts &middot; Freeze, unfreeze, or close accounts</p>
        </div>
      </div>

      {loading ? (
        <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>
      ) : (
        <div className="grid grid-2">
          {accounts.length > 0 ? accounts.map(acc => (
            <AccountCard key={acc.id} account={acc} onAction={handleAction} />
          )) : (
            <EmptyState icon="account_balance_wallet" message="No accounts found." />
          )}
        </div>
      )}
    </>
  )
}
