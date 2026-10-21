import request from './request'

export const loginByPhone = (payload, endpoint = '/auth/phone-login') => request.post(endpoint, payload)
export const requestSmsCode = (endpoint, payload) => request.post(endpoint, payload)
export const loginWithWechatCode = (endpoint, payload) => request.post(endpoint, payload)
export const getProfile = () => request.get('/auth/profile')
export const getShelfBooks = () => request.get('/favorite/list')
export const addFavorite = (bookId) => request.post('/favorite/add', null, { params: { bookId } })
export const removeFavorite = (bookId) => request.delete('/favorite/cancel', { params: { bookId } })
export const checkFavorite = (bookId) => request.get(`/favorite/check/${bookId}`)
