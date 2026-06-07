import api from './api'

export const staffLogin = (username, password) =>
  api.post('/auth/login', { username, password })

export const customerLogin = (username, password) =>
  api.post('/customer/login', { username, password })

export const staffLogout = () =>
  api.post('/auth/logout')

export const customerLogout = () =>
  api.post('/customer/logout')
