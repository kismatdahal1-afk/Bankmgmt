import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatCurrency, formatDate } from '../../utils/helpers'
import StatusBadge from '../../components/common/StatusBadge'
import CustomerFormComponent from '../../components/forms/CustomerForm'
import CredentialCard from '../../components/common/CredentialCard'

export default function StaffAccounts() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRegister, setShowRegister] = useState(false)
  const [credentials, setCredentials] = useState(null)
  const [registerError, setRegisterError] = useState('')

  const [custName, setCustName] = useState('')
  const [citizenship, setCitizenship] = useState('')
  const [accNum, setAccNum] = useState('')
  const [mobile, setMobile] = useState('')
  const [accType, setAccType] = useState('')
  const [accStatus, setAccStatus] = useState('')

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams()
    if (accNum) p.set('account_number', accNum)
    if (custName) p.set('name', custName)
    if (citizenship) p.set('citizenship', citizenship)
    if (mobile) p.set('phone', mobile)
    if (accType) p.set('account_type', accType)
    if (accStatus) p.set('status', accStatus)
    return p.toString()
  }, [accNum, custName, citizenship, mobile, accType, accStatus])

  const fetchAccounts = useCallback(() => {
    setLoading(true)
    const qs = buildQuery()
    fetch(`/api/accounts/${qs ? '?' + qs : ''}`)
      .then(r => r.json())
      .then(d => {
        const list = d.accounts || d
        setAccounts(Array.isArray(list) ? list : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [buildQuery])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const totalAccounts = accounts.length
  const activeAccounts = accounts.filter(a => a.status === 'active').length
  const suspendedAccounts = accounts.filter(a => a.status === 'suspended').length
  const frozenAccounts = accounts.filter(a => a.status === 'frozen').length
  const archivedAccounts = accounts.filter(a => a.status === 'archived').length
  const closedAccounts = accounts.filter(a => a.status === 'closed').length
  const totalDeposits = accounts.reduce((s, a) => s + (a.total_deposits || 0), 0)
  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0)
  const totalLoans = accounts.reduce((s, a) => s + (a.customer?.total_loan_amount || 0), 0)

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setRegisterError('')
    const formData = new FormData(e.target)
    try {
      const res = await fetch('/api/customers/create', { method: 'POST', body: new URLSearchParams(formData) })
      const data = await res.json()
      if (data.error) { setRegisterError(data.error); return }
      if (data.credentials) setCredentials(data.credentials)
      setShowRegister(false)
      fetchAccounts()
    } catch (err) {
      setRegisterError('Failed to create customer')
      console.error(err)
    }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') fetchAccounts() }

  return (
    <>
      <div className="top-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div className="header-title" style={{ margin: 0 }}>
          <h1 style={{ margin: 0 }}>Account Management</h1>
          <p style={{ margin: '2px 0 0 0' }}>Manage Bank Members & Accounts</p>
        </div>
        <button onClick={() => setShowRegister(true)} className="btn btn-primary" style={{ whiteSpace: 'nowrap', height: '36px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>person_add</span> Register New Customer
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="card-stat" style={{ borderLeft: '4px solid var(--accent-color)', background: 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(99,102,241,0.05) 100%)' }}>
          <span className="stat-title" style={{ fontSize: '0.8rem' }}>Total Bank Balance</span>
          <span className="stat-value" style={{ fontSize: '2.2rem', color: 'var(--accent-color)' }}>{formatCurrency(totalBalance)}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-4px' }}>Across all accounts</span>
        </div>
        <div className="card-stat"><span className="stat-title">Total Accounts</span><span className="stat-value">{totalAccounts}</span></div>
        <div className="card-stat stat-success"><span className="stat-title">Active</span><span className="stat-value">{activeAccounts}</span></div>
        <div className="card-stat stat-warning"><span className="stat-title">Suspended</span><span className="stat-value">{suspendedAccounts}</span></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div className="card-stat" style={{ borderLeftColor: '#ff9800' }}><span className="stat-title">Frozen</span><span className="stat-value">{frozenAccounts}</span></div>
        <div className="card-stat"><span className="stat-title">Archived</span><span className="stat-value">{archivedAccounts}</span></div>
        <div className="card-stat"><span className="stat-title">Total Deposits</span><span className="stat-value" style={{ fontSize: '1.1rem' }}>{formatCurrency(totalDeposits)}</span></div>
        <div className="card-stat"><span className="stat-title">Total Loans</span><span className="stat-value" style={{ fontSize: '1.1rem' }}>{formatCurrency(totalLoans)}</span></div>
        <div className="card-stat"><span className="stat-title">Closed</span><span className="stat-value">{closedAccounts}</span></div>
      </div>

      {/* Search Filters */}
      <div className="table-container" style={{ marginBottom: '16px', padding: '16px 20px' }}>
        <div style={{ fontWeight: 600, fontSize: '1rem', color: '#fff', marginBottom: '12px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: '6px' }}>search</span>
          Search Filters
        </div>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
            <div className="form-group" style={{ margin: 0, minWidth: '160px', flex: '1 1 150px' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Customer Name</label>
              <input type="text" value={custName} onChange={e => setCustName(e.target.value)} onKeyDown={handleKeyDown} className="form-control" style={{ padding: '8px 12px', fontSize: '0.95rem' }} placeholder="Search by full name..." />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: '150px', flex: '1 1 140px' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Citizenship Number</label>
              <input type="text" value={citizenship} onChange={e => setCitizenship(e.target.value)} onKeyDown={handleKeyDown} className="form-control" style={{ padding: '8px 12px', fontSize: '0.95rem' }} placeholder="e.g. 121516-1012" />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: '150px', flex: '1 1 140px' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Account Number</label>
              <input type="text" value={accNum} onChange={e => setAccNum(e.target.value)} onKeyDown={handleKeyDown} className="form-control" style={{ padding: '8px 12px', fontSize: '0.95rem' }} placeholder="e.g. VB-2026-..." />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: '140px', flex: '1 1 130px' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Mobile Number</label>
              <input type="text" value={mobile} onChange={e => setMobile(e.target.value)} onKeyDown={handleKeyDown} className="form-control" style={{ padding: '8px 12px', fontSize: '0.95rem' }} placeholder="e.g. 9841..." />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: '130px', flex: '1 1 120px' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Account Type</label>
              <select value={accType} onChange={e => setAccType(e.target.value)} className="form-control" style={{ padding: '8px 12px', fontSize: '0.95rem' }}>
                <option value="">All Types</option>
                <option value="savings">Savings</option>
                <option value="current">Current</option>
                <option value="fixed_deposit">Fixed Deposit</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: '120px', flex: '1 1 110px' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Status</label>
              <select value={accStatus} onChange={e => setAccStatus(e.target.value)} className="form-control" style={{ padding: '8px 12px', fontSize: '0.95rem' }}>
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="frozen">Frozen</option>
                <option value="suspended">Suspended</option>
                <option value="archived">Archived</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
            <button onClick={fetchAccounts} className="btn btn-primary" style={{ padding: '8px 28px', height: '40px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>search</span> Search
            </button>
            <button onClick={() => { setCustName(''); setCitizenship(''); setAccNum(''); setMobile(''); setAccType(''); setAccStatus(''); fetchAccounts(); }} className="btn btn-secondary" style={{ padding: '8px 28px', height: '40px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>restart_alt</span> Reset
            </button>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header-bar">
          <span className="table-title">All Bank Accounts</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{accounts.length} accounts</span>
        </div>
        {loading ? (
          <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>
        ) : (
          <table className="custom-table" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: '18%' }}>Customer Name</th>
                <th style={{ width: '13%' }}>Citizenship ID</th>
                <th style={{ width: '13%' }}>Mobile Number</th>
                <th style={{ width: '16%' }}>Account Number</th>
                <th style={{ width: '10%' }}>Account Type</th>
                <th style={{ width: '13%' }}>Current Balance</th>
                <th style={{ width: '9%' }}>Status</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length > 0 ? accounts.map(acc => (
                <tr
                  key={acc.id}
                  onClick={() => navigate(`/staff/account-management/${acc.id}`)}
                  style={{ cursor: 'pointer' }}
                  title="Click to manage account"
                >
                  <td style={{ fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.customer?.full_name || '—'}</td>
                  <td style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.customer?.citizenship_id || '—'}</td>
                  <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.customer?.phone_number || '—'}</td>
                  <td><code style={{ fontFamily: 'monospace', color: 'var(--accent-color)', fontSize: '0.85rem' }}>{acc.account_number}</code></td>
                  <td><StatusBadge status={acc.account_type} /></td>
                  <td style={{ fontWeight: 700, color: acc.balance > 0 ? '#4caf50' : 'var(--text-muted)' }}>{formatCurrency(acc.balance)}</td>
                  <td><StatusBadge status={acc.status} /></td>
                  <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <Link
                      to={`/staff/account-management/${acc.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px' }}
                      title="Manage Account"
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>settings</span>
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>account_balance_wallet</span>
                    No accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showRegister && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowRegister(false) }}
        >
          <div className="form-card" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setShowRegister(false)}
              style={{ position: 'sticky', top: '0', float: 'right', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 1 }}>
              <span className="material-symbols-rounded">close</span>
            </button>
            <h2 style={{ marginBottom: '8px', color: '#fff' }}>Register New Customer</h2>
            <p style={{ marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Fill in the details below to create a new customer account.
            </p>
            {registerError && (
              <div className="badge badge-danger" style={{ marginBottom: '16px', padding: '10px 14px', display: 'flex', width: '100%' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', marginRight: '8px' }}>error</span>
                {registerError}
              </div>
            )}
            <CustomerFormComponent action="Create" customer={null} onSubmit={handleRegisterSubmit} />
          </div>
        </div>
      )}
      )}

      {credentials && <CredentialCard credentials={credentials} onClose={() => setCredentials(null)} />}
    </>
  )
}
