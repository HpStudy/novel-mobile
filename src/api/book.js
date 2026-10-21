import request from './request'

export const getBannerList = () => request.get('/banner/list')
export const getRecommendBooks = (page = 1, pageSize = 10) => request.get('/book/list', { params: { page, limit: pageSize, sort: 'hot' } })
export const getNewBooks = (page = 1, pageSize = 8) => request.get('/book/list', { params: { page, limit: pageSize, sort: 'new' } })
export const getCategoryList = () => request.get('/category/list')
export const getHotSearchWords = (endpoint) => request.get(endpoint)
export const getBooksByCategory = (categoryId, page = 1, pageSize = 12) => request.get('/book/list', { params: { categoryId, page, limit: pageSize } })
export const getBookDetail = (id) => request.get(`/book/detail/${id}`)
export const searchBooks = (keyword) => request.get('/book/search', { params: { keyword } })
export const getBookComments = (bookId) => request.get(`/comment/list/${bookId}`)
