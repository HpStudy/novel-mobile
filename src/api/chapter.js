import request from './request'

export const getChapterList = (bookId) => request.get(`/chapter/list/${bookId}`)
export const getChapterDetail = (chapterId) => request.get(`/chapter/content/${chapterId}`)
export const saveReadingProgress = (payload) => request.post('/read/save', payload)
export const getReadingHistory = () => request.get('/read/history')
