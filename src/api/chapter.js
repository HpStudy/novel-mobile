import request from './request'

export const getChapterList = (bookId) => request.get(`/chapter/list/${bookId}`, {
  // The catalog changes while a book is being updated. Avoid a cached 304
  // response keeping an old/empty catalog after new chapters are published.
  params: { _t: Date.now() },
  headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
})
export const getChapterDetail = (chapterId) => request.get(`/chapter/content/${chapterId}`)
export const saveReadingProgress = (payload) => request.post('/read/save', payload)
export const getReadingHistory = () => request.get('/read/history')
