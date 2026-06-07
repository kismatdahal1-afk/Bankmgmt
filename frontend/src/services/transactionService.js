import api from './api'

export const getTransactions = () => api.get('/transactions/')
export const deposit = (data) => api.post('/transactions/deposit', data)
export const withdraw = (data) => api.post('/transactions/withdraw', data)
