import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function PrivateRoute({ children, role }) {
  const { user, customer, loading } = useAuth()

  if (loading) return null

  if (role === 'customer') {
    if (!customer) return <Navigate to="/user/login" replace />
    return children
  }

  if (!user) return <Navigate to={`/${role}/login`} replace />
  if (user.role !== role) return <Navigate to="/" replace />
  return children
}
