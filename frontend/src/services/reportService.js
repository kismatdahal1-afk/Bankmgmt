import api from './api'

export const getDashboard = () => api.get('/dashboard')
export const getReports = (type, customerId) => {
  const params = { type }
  if (customerId) params.customer_id = customerId
  return api.get('/reports', { params })
}
