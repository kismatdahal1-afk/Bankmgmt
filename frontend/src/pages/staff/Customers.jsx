import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../../utils/helpers'

export default function StaffCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/customers/')
      .then(r => r.json())
      .then(d => { setCustomers(d.customers || d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>Customer Management</h1>
          <p>Manage village bank member profiles and accounts</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <Link to="/staff/customers/create" className="btn btn-primary">
          <span className="material-symbols-rounded">person_add</span>
          Register New Customer
        </Link>
      </div>

      <div className="table-container">
        <div className="table-header-bar">
          <span className="table-title">Registered Bank Members</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Active Members: {customers.length}</span>
        </div>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Citizenship/ID</th>
              <th>Phone Number</th>
              <th>Account Number</th>
              <th>Account Type</th>
              <th>Current Balance</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length > 0 ? customers.map(customer => {
              const activeAccount = customer.accounts?.find(a => a.status === 'active')
              return (
                <tr key={customer.id}>
                  <td style={{ fontWeight: 600, color: '#fff' }}>{customer.full_name}</td>
                  <td>{customer.citizenship_id}</td>
                  <td>{customer.phone_number}</td>
                  <td>{activeAccount ? <code style={{ fontFamily: 'monospace', fontSize: '1rem', color: 'var(--accent-color)' }}>{activeAccount.account_number}</code> : <span className="badge badge-danger">No Active Account</span>}</td>
                  <td>{activeAccount ? <span className={`badge ${activeAccount.account_type === 'savings' ? 'badge-success' : activeAccount.account_type === 'fixed_deposit' ? 'badge-warning' : 'badge-info'}`}>{activeAccount.account_type === 'fixed_deposit' ? 'Fixed Deposit' : activeAccount.account_type}</span> : '—'}</td>
                  <td style={{ fontWeight: 700, color: '#fff' }}>{activeAccount ? formatCurrency(activeAccount.balance) : 'NPR 0.00'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      {activeAccount && (
                        <>
                          <Link to={`/staff/transactions/deposit?account_number=${activeAccount.account_number}`} className="btn btn-success btn-sm" style={{ padding: '6px' }} title="Deposit Funds">
                            <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>add_circle</span>
                          </Link>
                          <Link to={`/staff/transactions/withdraw?account_number=${activeAccount.account_number}`} className="btn btn-danger btn-sm" style={{ padding: '6px' }} title="Withdraw Funds">
                            <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>remove_circle</span>
                          </Link>
                        </>
                      )}
                      <Link to={`/staff/customers/edit/${customer.id}`} className="btn btn-secondary btn-sm" style={{ padding: '6px' }} title="Edit Profile">
                        <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>edit</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            }) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>group_off</span>
                  No active customers registered in the system yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
