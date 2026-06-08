import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import CustomerFormComponent from '../../components/forms/CustomerForm'
import CredentialCard from '../../components/common/CredentialCard'

export default function StaffCustomerForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [credentials, setCredentials] = useState(null)
  const isEdit = Boolean(id)
  const action = isEdit ? 'Edit' : 'Create'

  useEffect(() => {
    if (isEdit) {
      fetch(`/api/customers/${id}`)
        .then(r => r.json())
        .then(d => setCustomer(d.customer || d))
        .catch(err => console.error('Fetch error:', err))
    }
  }, [id, isEdit])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    if (isEdit) {
      try {
        const res = await fetch(`/api/customers/edit/${id}`, { method: 'POST', body: new URLSearchParams(formData) })
        const data = await res.json()
        if (data.error) { alert(data.error); return }
        navigate('/staff/accounts')
      } catch (err) {
        console.error(err)
      }
    } else {
      try {
        const res = await fetch('/api/customers/create', { method: 'POST', body: new URLSearchParams(formData) })
        const data = await res.json()
        if (data.error) { alert(data.error); return }
        if (data.credentials) {
          setCredentials(data.credentials)
        } else {
          navigate('/staff/accounts')
        }
      } catch (err) {
        console.error(err)
      }
    }
  }

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>{action} Customer Profile</h1>
          <p>{action === 'Create' ? 'Register a new member with full personal, contact and banking details' : `Update details for ${customer?.full_name || ''}`}</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
        <Link to="/staff/accounts" className="btn btn-secondary">
          <span className="material-symbols-rounded">arrow_back</span>
          Back to Accounts
        </Link>
      </div>

      <CustomerFormComponent action={action} customer={customer} onSubmit={handleSubmit} />

      {credentials && (
        <CredentialCard credentials={credentials} onClose={() => navigate('/staff/accounts')} />
      )}
    </>
  )
}
