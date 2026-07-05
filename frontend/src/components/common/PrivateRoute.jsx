import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function PrivateRoute({ children, role }) {
  const { user, customer, loading } = useAuth()
  const storedRole = sessionStorage.getItem('role')

  if (loading) return null

  if (role === 'customer') {
    const hasCustomer = customer || sessionStorage.getItem('customer_id')
    if (!hasCustomer) return <Navigate to="/user/login" replace />
    return children
  }

  const hasUser = user || sessionStorage.getItem('user_id')
  if (!hasUser) return <Navigate to={`/${role}/login`} replace />

  if (storedRole !== role) return <Navigate to="/" replace />
  return children
}
