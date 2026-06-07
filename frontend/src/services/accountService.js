import api from './api'

export const getAccounts = () => api.get('/accounts/')
export const getAccount = (accountNumber) => api.get(`/accounts/${accountNumber}`)
export const createAccount = (data) => api.post('/accounts/create', data)
