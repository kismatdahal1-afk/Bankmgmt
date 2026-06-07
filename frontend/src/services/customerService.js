import api from './api'

export const getCustomers = () => api.get('/customers/')
export const getCustomer = (id) => api.get(`/customers/${id}`)
export const createCustomer = (data) => api.post('/customers/create', data)
export const updateCustomer = (id, data) => api.post(`/customers/edit/${id}`, data)
export const deleteCustomer = (id) => api.post(`/customers/delete/${id}`)
