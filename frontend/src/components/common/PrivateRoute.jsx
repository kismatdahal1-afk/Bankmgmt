import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function PrivateRoute({ children, role }) {
  const { user, customer, loading } = useAuth()

  const hasCustomer = customer || sessionStorage.getItem('customer_id')
  const hasUser = user || sessionStorage.getItem('user_id')
  const storedRole = sessionStorage.getItem('role')

  if (loading) return null

  if (role === 'customer') {
    if (!hasCustomer) return <Navigate to="/user/login" replace />
    return children
  }

  if (!hasUser) return <Navigate to={`/${role}/login`} replace />
  if (user?.role && user.role !== role) return <Navigate to="/" replace />
  if (!user && storedRole !== role) return <Navigate to="/" replace />
  return children
}
