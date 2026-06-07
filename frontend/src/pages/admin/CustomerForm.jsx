import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import CustomerFormComponent from '../../components/forms/CustomerForm'

export default function AdminCustomerForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const isEdit = Boolean(id)
  const action = isEdit ? 'Edit' : 'Create'

  useEffect(() => {
    if (isEdit) {
      fetch(`/api/customers/${id}`)
        .then(r => r.json())
        .then(d => setCustomer(d.customer || d))
        .catch(() => {})
    }
  }, [id, isEdit])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const form = e.target
    const formData = new FormData(form)
    const url = isEdit ? `/api/customers/edit/${id}` : '/api/customers/create'
    try {
      const res = await fetch(url, { method: 'POST', body: new URLSearchParams(formData) })
      const data = await res.json()
      if (data.redirect || res.redirected) navigate('/admin/customers')
      else navigate('/admin/customers')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <>
      <div className="top-header">
        <div className="header-title">
          <h1>{action} Customer Profile</h1>
          <p>{action === 'Create' ? 'Register a new member and open their primary account' : `Update details for ${customer?.full_name || ''}`}</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
        <Link to="/admin/customers" className="btn btn-secondary">
          <span className="material-symbols-rounded">arrow_back</span>
          Back to Customers
        </Link>
      </div>

      <CustomerFormComponent action={action} customer={customer} onSubmit={handleSubmit} />
    </>
  )
}
