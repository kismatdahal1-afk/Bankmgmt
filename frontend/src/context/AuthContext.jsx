import React, { createContext, useState, useContext, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = sessionStorage.getItem('user_id')
    const customerId = sessionStorage.getItem('customer_id')
    const username = sessionStorage.getItem('username')
    const role = sessionStorage.getItem('role')
    if (userId && role) {
      setUser({ id: parseInt(userId), username, role })
    }
    if (customerId) {
      setCustomer({ id: parseInt(customerId), name: sessionStorage.getItem('customer_name') })
    }
    setLoading(false)
  }, [])

  const login = async (username, password, portal) => {
    try {
      const res = await api.post(`/${portal}/login`, { username, password })
      const data = res.data
      if (portal === 'customer') {
        sessionStorage.setItem('customer_id', data.customer_id)
        sessionStorage.setItem('customer_name', data.customer_name)
        sessionStorage.setItem('must_change_password', data.must_change_password ? 'true' : 'false')
        sessionStorage.setItem('customer_phone', data.phone_number || '')
        sessionStorage.setItem('customer_email', data.email || '')
        setCustomer({ id: data.customer_id, name: data.customer_name, phone_number: data.phone_number, email: data.email })
        return { role: 'customer', must_change_password: data.must_change_password }
      }
      sessionStorage.setItem('user_id', data.user_id)
      sessionStorage.setItem('username', data.username)
      sessionStorage.setItem('role', data.role)
      setUser({ id: data.user_id, username: data.username, role: data.role })
      return { role: data.role }
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Login failed')
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (e) { /* ignore */ }
    sessionStorage.clear()
    setUser(null)
    setCustomer(null)
  }

  const customerLogout = async () => {
    try {
      await api.post('/customer/logout')
    } catch (e) { /* ignore */ }
    sessionStorage.clear()
    setUser(null)
    setCustomer(null)
  }

  const refreshCustomer = async () => {
    try {
      const res = await api.get('/customer/profile')
      const data = res.data
      if (data.customer) {
        const c = data.customer
        sessionStorage.setItem('customer_id', c.id)
        sessionStorage.setItem('customer_name', c.full_name)
        sessionStorage.setItem('must_change_password', c.must_change_password ? 'true' : 'false')
        sessionStorage.setItem('customer_phone', c.phone_number || '')
        sessionStorage.setItem('customer_email', c.email || '')
        setCustomer({ id: c.id, name: c.full_name, phone_number: c.phone_number, email: c.email })
      }
    } catch (e) { /* ignore */ }
  }

  return (
    <AuthContext.Provider value={{ user, customer, loading, login, logout, customerLogout, refreshCustomer }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
