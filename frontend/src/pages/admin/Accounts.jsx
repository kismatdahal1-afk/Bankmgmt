import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import AccountCard from '../../components/cards/AccountCard'
import EmptyState from '../../components/common/EmptyState'

export default function AdminAccounts() {
  const location = useLocation()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/accounts/')
      .then(r => r.json())
      .then(d => { setAccounts(d.accounts || d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [location.pathname])

  const pendingCount = accounts.filter(a => a.status === 'pending').length

  const handleAction = async (action, accountId) => {
    const urlMap = { freeze: 'freeze', unfreeze: 'unfreeze', close: 'close' }
    let url, msg
    if (action === 'activate') {
      url = `/api/accounts/activate/${accountId}`
      msg = 'Activate this account?'
    } else {
      url = `/api/accounts/${urlMap[action]}/${accountId}`
      msg = action === 'freeze' ? 'Freeze this account?' : action === 'unfreeze' ? 'Unfreeze this account?' : 'Close this account?'
    }
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
        <>
          {pendingCount > 0 && (
            <div className="badge badge-warning" style={{ marginBottom: '16px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'none', fontWeight: 500, fontSize: '0.9rem', letterSpacing: '0', width: 'fit-content' }}>
              <span className="material-symbols-rounded">how_to_reg</span>
              {pendingCount} account{pendingCount > 1 ? 's' : ''} pending activation
            </div>
          )}
          <div className="grid grid-2">
            {accounts.length > 0 ? accounts.map(acc => (
              <AccountCard key={acc.id} account={acc} onAction={handleAction} />
            )) : (
              <EmptyState icon="account_balance_wallet" message="No accounts found." />
            )}
          </div>
        </>
      )}
    </>
  )
}
