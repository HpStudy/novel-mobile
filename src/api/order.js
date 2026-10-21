import request from './request'

export const createOrder = (payload) => request.post('/order/create', payload)
export const getOrders = () => request.get('/order/list')
