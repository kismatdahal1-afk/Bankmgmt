import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency, formatDate } from '../../utils/helpers'
import StatusBadge from '../../components/common/StatusBadge'

export default function StaffCustomers() {
  const [customers, setCustomers] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [phoneFilter, setPhoneFilter] = useState('')
  const [accountTypeFilter, setAccountTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [profileCustomer, setProfileCustomer] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const fetchCustomers = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (nameFilter) params.set('name', nameFilter)
    if (phoneFilter) params.set('phone', phoneFilter)
    if (accountTypeFilter) params.set('account_type', accountTypeFilter)
    if (statusFilter) params.set('status', statusFilter)
    fetch(`/api/customers/?${params}`)
      .then(r => r.json())
      .then(d => { setCustomers(d.customers || d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [search, nameFilter, phoneFilter, accountTypeFilter, statusFilter])

  useEffect(() => {
    fetch('/api/customers/summary')
      .then(r => r.json())
      .then(d => setSummary(d))
      .catch(() => {})
    fetchCustomers()
  }, [fetchCustomers])

  const handleProfile = async (id) => {
    setProfileLoading(true)
    try {
      const res = await fetch(`/api/customers/${id}`)
      const d = await res.json()
      setProfileCustomer(d.customer || d)
    } catch (e) { console.error(e) }
    setProfileLoading(false)
  }

  const activeAccount = (customer) => customer.accounts?.find(a => a.status === 'active')
  const profileLoans = profileCustomer?.loans || []
  const totalProfileDeposits = profileCustomer?.accounts?.reduce((s, a) => s + (a.total_deposits || 0), 0) || 0
  const totalProfileWithdrawals = profileCustomer?.accounts?.reduce((s, a) => s + (a.total_withdrawals || 0), 0) || 0

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>Customer Management</h1>
          <p>Manage village bank member profiles and accounts</p>
        </div>
      </div>

      {summary && (
        <div className="grid-stats" style={{ marginBottom: '20px', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="card-stat"><span className="stat-title">Total Customers</span><span className="stat-value">{summary.total_customers}</span></div>
          <div className="card-stat stat-success"><span className="stat-title">Active</span><span className="stat-value">{summary.active_customers}</span></div>
          <div className="card-stat"><span className="stat-title">Total Deposits</span><span className="stat-value" style={{ fontSize: '0.85rem' }}>{formatCurrency(summary.total_deposits)}</span></div>
          <div className="card-stat"><span className="stat-title">Total Loans</span><span className="stat-value" style={{ fontSize: '0.85rem' }}>{formatCurrency(summary.total_loans)}</span></div>
        </div>
      )}

      <div className="table-container" style={{ marginBottom: '16px', padding: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <input type="text" placeholder="Search name, phone, citizenship..." value={search} onChange={e => setSearch(e.target.value)}
            className="form-control" style={{ flex: 1, minWidth: '200px', padding: '6px 10px' }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="form-control" style={{ width: 'auto', minWidth: '120px', padding: '6px 10px' }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </select>
          <select value={accountTypeFilter} onChange={e => setAccountTypeFilter(e.target.value)}
            className="form-control" style={{ width: 'auto', minWidth: '120px', padding: '6px 10px' }}>
            <option value="">All Account Types</option>
            <option value="savings">Savings</option>
            <option value="current">Current</option>
            <option value="fixed_deposit">Fixed Deposit</option>
          </select>
          <Link to="/staff/customers/create" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
            <span className="material-symbols-rounded">person_add</span> Register New
          </Link>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header-bar">
          <span className="table-title">Registered Bank Members</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{customers.length} customers</span>
        </div>
        {loading ? (
          <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Citizenship/ID</th>
                <th>Phone</th>
                <th>Account Number</th>
                <th>Account Type</th>
                <th>Balance</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length > 0 ? customers.map(customer => {
                const acc = activeAccount(customer)
                return (
                  <tr key={customer.id}>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{customer.full_name}</td>
                    <td>{customer.citizenship_id}</td>
                    <td>{customer.phone_number}</td>
                    <td>{acc ? <code style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--accent-color)' }}>{acc.account_number}</code> : <span className="badge badge-danger">No Active Account</span>}</td>
                    <td>{acc ? <span className={`badge ${acc.account_type === 'savings' ? 'badge-success' : acc.account_type === 'fixed_deposit' ? 'badge-warning' : 'badge-info'}`}>{acc.account_type === 'fixed_deposit' ? 'Fixed Deposit' : acc.account_type}</span> : '—'}</td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>{acc ? formatCurrency(acc.balance) : 'NPR 0.00'}</td>
                    <td><StatusBadge status={customer.status} /></td>
                    <td style={{ textAlign: 'center' }}>
                      {acc ? (
                        <Link
                          to={`/staff/account-management/${acc.id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '6px' }}
                          title="Manage Account"
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>settings</span>
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>group_off</span>
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {profileCustomer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setProfileCustomer(null) }}>
          <div className="form-card" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setProfileCustomer(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <span className="material-symbols-rounded">close</span>
            </button>
            {profileLoading ? (
              <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div className="user-avatar" style={{ width: '56px', height: '56px', fontSize: '1.3rem', margin: '0 auto 8px' }}>
                    {profileCustomer.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'JD'}
                  </div>
                  <h2 style={{ color: '#fff', marginBottom: '4px', fontSize: '1.3rem' }}>{profileCustomer.full_name}</h2>
                  <StatusBadge status={profileCustomer.status} />
                </div>

                <div className="table-container" style={{ marginBottom: '12px' }}>
                  <div className="table-header-bar"><span className="table-title">Personal Details</span></div>
                  <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                    <div><span style={{ color: 'var(--text-secondary)' }}>Father:</span> <span style={{ color: '#fff' }}>{profileCustomer.father_name || '—'}</span></div>
                    <div><span style={{ color: 'var(--text-secondary)' }}>DOB:</span> <span style={{ color: '#fff' }}>{profileCustomer.dob ? formatDate(profileCustomer.dob) : '—'}</span></div>
                    <div><span style={{ color: 'var(--text-secondary)' }}>Citizenship:</span> <span style={{ color: '#fff' }}>{profileCustomer.citizenship_id}</span></div>
                    <div><span style={{ color: 'var(--text-secondary)' }}>Phone:</span> <span style={{ color: '#fff' }}>{profileCustomer.phone_number}</span></div>
                    <div><span style={{ color: 'var(--text-secondary)' }}>Email:</span> <span style={{ color: '#fff' }}>{profileCustomer.email || '—'}</span></div>
                    <div><span style={{ color: 'var(--text-secondary)' }}>Address:</span> <span style={{ color: '#fff' }}>{profileCustomer.address || '—'}</span></div>
                  </div>
                </div>

                {profileCustomer.accounts?.length > 0 && (
                  <div className="table-container" style={{ marginBottom: '12px' }}>
                    <div className="table-header-bar"><span className="table-title">Accounts</span></div>
                    <div style={{ padding: '12px' }}>
                      {profileCustomer.accounts.map(a => (
                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                          <div><code style={{ color: 'var(--accent-color)' }}>{a.account_number}</code> <span className={`badge ${a.account_type === 'savings' ? 'badge-success' : 'badge-info'}`}>{a.account_type}</span></div>
                          <div style={{ fontWeight: 700, color: '#fff' }}>{formatCurrency(a.balance)} <StatusBadge status={a.status} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {profileLoans.length > 0 && (
                  <div className="table-container">
                    <div className="table-header-bar"><span className="table-title">Loans</span></div>
                    <div style={{ padding: '12px' }}>
                      {profileLoans.map(l => (
                        <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                          <div><code>{l.application_number || l.loan_number}</code> {formatCurrency(l.amount)} @ {l.interest_rate}%</div>
                          <div><StatusBadge status={l.status} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
