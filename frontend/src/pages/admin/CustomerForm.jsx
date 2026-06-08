import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../services/api'
import CustomerFormComponent from '../../components/forms/CustomerForm'
import CredentialCard from '../../components/common/CredentialCard'

export default function AdminCustomerForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [credentials, setCredentials] = useState(null)
  const isEdit = Boolean(id)
  const action = isEdit ? 'Edit' : 'Create'

  useEffect(() => {
    if (isEdit) {
      api.get(`/customers/${id}`)
        .then(r => setCustomer(r.data.customer || r.data))
        .catch(err => console.error('Fetch error:', err))
    }
  }, [id, isEdit])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = Object.fromEntries(new FormData(e.target))
    try {
      const url = isEdit ? `/customers/edit/${id}` : '/customers/create'
      const res = await api.post(url, formData)
      if (isEdit) {
        navigate('/admin/customers')
      } else {
        if (res.data.credentials) {
          setCredentials(res.data.credentials)
        } else {
          navigate('/admin/customers')
        }
      }
    } catch (err) {
      if (err.response?.data?.error) {
        alert(err.response.data.error)
      }
      console.error(err)
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
        <Link to="/admin/customers" className="btn btn-secondary">
          <span className="material-symbols-rounded">arrow_back</span>
          Back to Customers
        </Link>
      </div>

      <CustomerFormComponent action={action} customer={customer} onSubmit={handleSubmit} />

      {credentials && (
        <CredentialCard credentials={credentials} onClose={() => navigate('/admin/customers')} />
      )}
    </>
  )
}
