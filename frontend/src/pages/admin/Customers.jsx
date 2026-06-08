import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency, formatDate, formatDateTime, validateCitizenship } from '../../utils/helpers'
import StatusBadge from '../../components/common/StatusBadge'

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [phoneFilter, setPhoneFilter] = useState('')
  const [citizenshipFilter, setCitizenshipFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [accountTypeFilter, setAccountTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Profile modal
  const [profileCustomer, setProfileCustomer] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const fetchCustomers = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (nameFilter) params.set('name', nameFilter)
    if (phoneFilter) params.set('phone', phoneFilter)
    if (citizenshipFilter) params.set('citizenship', citizenshipFilter)
    if (accountFilter) params.set('account_number', accountFilter)
    if (accountTypeFilter) params.set('account_type', accountTypeFilter)
    if (statusFilter) params.set('status', statusFilter)
    fetch(`/api/customers/?${params}`)
      .then(r => r.json())
      .then(d => { setCustomers(d.customers || d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [search, nameFilter, phoneFilter, citizenshipFilter, accountFilter, accountTypeFilter, statusFilter])

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

  const handleStatusChange = async (id, status) => {
    try {
      const res = await fetch(`/api/customers/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      const d = await res.json()
      if (d.error) { alert(d.error); return }
      fetchCustomers()
      if (profileCustomer?.id === id) handleProfile(id)
    } catch (e) { console.error(e) }
  }

  const handleResetPassword = async (id) => {
    if (!confirm('Reset password for this customer?')) return
    try {
      const res = await fetch(`/api/customers/${id}/reset-password`, { method: 'POST' })
      const d = await res.json()
      if (d.error) { alert(d.error); return }
      alert(`Password reset successfully!\nNew temporary password: ${d.temporary_password}`)
    } catch (e) { console.error(e) }
  }

  const hasActiveAccount = (customer) => customer.accounts?.some(a => a.status === 'active')
  const activeAccount = (customer) => customer.accounts?.find(a => a.status === 'active')

  const profileActiveAccount = profileCustomer?.accounts?.find(a => a.status === 'active')
  const profileLoans = profileCustomer?.loans || []
  const activeProfileLoans = profileLoans.filter(l => ['pending', 'approved', 'active'].includes(l.status))
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

      {/* Summary Cards */}
      {summary && (
        <div className="grid-stats" style={{ marginBottom: '20px', gridTemplateColumns: 'repeat(6, 1fr)' }}>
          <div className="card-stat"><span className="stat-title">Total Customers</span><span className="stat-value">{summary.total_customers}</span></div>
          <div className="card-stat stat-success"><span className="stat-title">Active</span><span className="stat-value">{summary.active_customers}</span></div>
          <div className="card-stat stat-danger"><span className="stat-title">Suspended</span><span className="stat-value">{summary.suspended_customers}</span></div>
          <div className="card-stat"><span className="stat-title">Closed</span><span className="stat-value">{summary.closed_customers}</span></div>
          <div className="card-stat stat-warning"><span className="stat-title">Archived</span><span className="stat-value">{summary.archived_customers}</span></div>
          <div className="card-stat"><span className="stat-title">Total Deposits</span><span className="stat-value" style={{ fontSize: '0.85rem' }}>{formatCurrency(summary.total_deposits)}</span></div>
        </div>
      )}

      {/* Filters */}
      <div className="table-container" style={{ marginBottom: '16px', padding: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <input type="text" placeholder="Search any field..." value={search} onChange={e => setSearch(e.target.value)}
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
          <Link to="/admin/customers/create" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
            <span className="material-symbols-rounded">person_add</span> Register New
          </Link>
        </div>
        {(search || nameFilter || phoneFilter || citizenshipFilter || accountFilter) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <input type="text" placeholder="Name" value={nameFilter} onChange={e => setNameFilter(e.target.value)}
              className="form-control" style={{ width: 'auto', minWidth: '140px', padding: '4px 8px', fontSize: '0.85rem' }} />
            <input type="text" placeholder="Phone" value={phoneFilter} onChange={e => setPhoneFilter(e.target.value)}
              className="form-control" style={{ width: 'auto', minWidth: '130px', padding: '4px 8px', fontSize: '0.85rem' }} />
            <input type="text" placeholder="Citizenship" value={citizenshipFilter} onChange={e => setCitizenshipFilter(e.target.value)}
              className="form-control" style={{ width: 'auto', minWidth: '130px', padding: '4px 8px', fontSize: '0.85rem' }} />
            <input type="text" placeholder="Account #" value={accountFilter} onChange={e => setAccountFilter(e.target.value)}
              className="form-control" style={{ width: 'auto', minWidth: '130px', padding: '4px 8px', fontSize: '0.85rem' }} />
          </div>
        )}
      </div>

      {/* Customer Table */}
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
                    <td>
                      {acc ? (
                        <code style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--accent-color)' }}>{acc.account_number}</code>
                      ) : (
                        <span className="badge badge-danger">No Active Account</span>
                      </td>
                    <td>
                      {acc ? (
                        <span className={`badge ${acc.account_type === 'savings' ? 'badge-success' : acc.account_type === 'fixed_deposit' ? 'badge-warning' : 'badge-info'}`}>
                          {acc.account_type === 'fixed_deposit' ? 'Fixed Deposit' : acc.account_type}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>
                      {acc ? formatCurrency(acc.balance) : 'NPR 0.00'}
                    </td>
                    <td><StatusBadge status={customer.status} /></td>
                    <td style={{ textAlign: 'center' }}>
                      {acc ? (
                        <Link
                          to={`/admin/account-management/${acc.id}`}
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
                    No customers found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Profile Modal */}
      {profileCustomer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setProfileCustomer(null) }}>
          <div className="form-card" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setProfileCustomer(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>
              <span className="material-symbols-rounded">close</span>
            </button>

            {profileLoading ? (
              <div className="empty"><span className="material-symbols-rounded">sync</span><div>Loading...</div></div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div className="user-avatar" style={{ width: '64px', height: '64px', fontSize: '1.5rem', margin: '0 auto 12px' }}>
                    {profileCustomer.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'JD'}
                  </div>
                  <h2 style={{ color: '#fff', marginBottom: '4px' }}>{profileCustomer.full_name}</h2>
                  <StatusBadge status={profileCustomer.status} />
                </div>

                {/* A: Personal Demographics */}
                <div className="table-container" style={{ marginBottom: '16px' }}>
                  <div className="table-header-bar"><span className="table-title">Personal Demographics</span></div>
                  <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Full Name</span><div style={{ color: '#fff', fontWeight: 600 }}>{profileCustomer.full_name}</div></div>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Father Name</span><div style={{ color: '#fff' }}>{profileCustomer.father_name || '—'}</div></div>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Grandfather Name</span><div style={{ color: '#fff' }}>{profileCustomer.grandfather_name || '—'}</div></div>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Date of Birth</span><div style={{ color: '#fff' }}>{profileCustomer.dob ? formatDate(profileCustomer.dob) : '—'}</div></div>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Gender</span><div style={{ color: '#fff' }}>{profileCustomer.gender || '—'}</div></div>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Citizenship Number</span><div style={{ color: '#fff', fontFamily: 'monospace' }}>{profileCustomer.citizenship_id}</div></div>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Issue District</span><div style={{ color: '#fff' }}>{profileCustomer.citizenship_issue_district || '—'}</div></div>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Marital Status</span><div style={{ color: '#fff' }}>{profileCustomer.marital_status || '—'}</div></div>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Occupation</span><div style={{ color: '#fff' }}>{profileCustomer.occupation || '—'}</div></div>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Customer ID</span><div style={{ color: 'var(--accent-color)', fontFamily: 'monospace' }}>{profileCustomer.customer_id || '—'}</div></div>
                  </div>
                </div>

                {/* B: Contact Information */}
                <div className="table-container" style={{ marginBottom: '16px' }}>
                  <div className="table-header-bar"><span className="table-title">Contact Information</span></div>
                  <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Mobile Number</span><div style={{ color: '#fff', fontFamily: 'monospace' }}>{profileCustomer.phone_number}</div></div>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Alternate Mobile</span><div style={{ color: '#fff' }}>{profileCustomer.alternate_mobile || '—'}</div></div>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Email</span><div style={{ color: '#fff' }}>{profileCustomer.email || '—'}</div></div>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Permanent Address</span><div style={{ color: '#fff' }}>{profileCustomer.address || '—'}</div></div>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Temporary Address</span><div style={{ color: '#fff' }}>{profileCustomer.temporary_address || '—'}</div></div>
                  </div>
                </div>

                {/* C: Banking Information */}
                <div className="table-container" style={{ marginBottom: '16px' }}>
                  <div className="table-header-bar"><span className="table-title">Banking Information</span></div>
                  <div style={{ padding: '16px' }}>
                    {profileCustomer.accounts?.length > 0 ? profileCustomer.accounts.map(a => (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                        <div>
                          <code style={{ color: 'var(--accent-color)', fontFamily: 'monospace' }}>{a.account_number}</code>
                          <span className={`badge ${a.account_type === 'savings' ? 'badge-success' : 'badge-info'}`} style={{ marginLeft: '8px' }}>{a.account_type}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: '#fff' }}>{formatCurrency(a.balance)}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Opened: {formatDate(a.created_at)} | <StatusBadge status={a.status} /></div>
                        </div>
                      </div>
                    )) : <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No accounts found.</p>}
                  </div>
                </div>

                {/* D: Loan Information */}
                <div className="table-container" style={{ marginBottom: '16px' }}>
                  <div className="table-header-bar"><span className="table-title">Loan Information</span></div>
                  <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Active Loans</span><div style={{ color: '#fff', fontWeight: 600 }}>{activeProfileLoans.length}</div></div>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Total Loan Amount</span><div style={{ color: 'var(--warning)', fontWeight: 600 }}>{formatCurrency(activeProfileLoans.reduce((s, l) => s + (l.amount || 0), 0))}</div></div>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Total Loans Taken</span><div style={{ color: '#fff' }}>{profileLoans.length}</div></div>
                  </div>
                  {profileLoans.length > 0 && (
                    <table className="custom-table" style={{ margin: '0' }}>
                      <thead><tr><th>Loan #</th><th>Amount</th><th>Rate</th><th>EMI</th><th>Paid</th><th>Status</th></tr></thead>
                      <tbody>{profileLoans.map(l => (
                        <tr key={l.id}><td><code style={{ fontSize: '0.8rem' }}>{l.loan_number}</code></td><td>{formatCurrency(l.amount)}</td><td>{l.interest_rate}%</td><td>{formatCurrency(l.emi)}</td><td>{formatCurrency(l.total_paid)}</td><td><StatusBadge status={l.status} /></td></tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>

                {/* E: Transaction Summary */}
                <div className="table-container" style={{ marginBottom: '16px' }}>
                  <div className="table-header-bar"><span className="table-title">Transaction Summary</span></div>
                  <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="card-stat stat-success" style={{ padding: '16px' }}>
                      <span className="stat-title">Total Deposits</span>
                      <span className="stat-value">{formatCurrency(totalProfileDeposits)}</span>
                    </div>
                    <div className="card-stat stat-danger" style={{ padding: '16px' }}>
                      <span className="stat-title">Total Withdrawals</span>
                      <span className="stat-value">{formatCurrency(totalProfileWithdrawals)}</span>
                    </div>
                  </div>
                </div>

                {/* Nominee Details */}
                <div className="table-container" style={{ marginBottom: '16px' }}>
                  <div className="table-header-bar"><span className="table-title">Nominee Details</span></div>
                  <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Name</span><div style={{ color: '#fff' }}>{profileCustomer.nominee_name || '—'}</div></div>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Contact</span><div style={{ color: '#fff' }}>{profileCustomer.nominee_contact || '—'}</div></div>
                    <div><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Relationship</span><div style={{ color: '#fff' }}>{profileCustomer.nominee_relationship || '—'}</div></div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}


