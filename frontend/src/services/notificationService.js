import api from './api'

export const getNotifications = () => api.get('/notifications/')
export const markAsRead = (id) => api.post(`/notifications/${id}/read`)
