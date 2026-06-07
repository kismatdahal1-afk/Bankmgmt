import api from './api'

export const getLoans = () => api.get('/loans/')
export const applyLoan = (data) => api.post('/loans/apply', data)
export const approveLoan = (id) => api.post(`/loans/approve/${id}`)
export const rejectLoan = (id) => api.post(`/loans/reject/${id}`)
export const repayLoan = (id, data) => api.post(`/loans/repay/${id}`, data)
