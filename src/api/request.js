import axios from 'axios'
import { showFailToast } from 'vant'
import router from '../router'
import { useAppStore } from '../store'

const request = axios.create({
  baseURL: '/api',
  timeout: 12000
})

let loginRedirectPending = false

const redirectToLogin = () => {
  if (loginRedirectPending) return
  loginRedirectPending = true
  const redirect = router.currentRoute.value.fullPath
  useAppStore().clearSession()
  showFailToast('登录已过期，请重新登录。')
  router.replace({ path: '/login', query: { redirect } }).finally(() => {
    loginRedirectPending = false
  })
}

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || ''
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    const res = response.data || {}
    if (res.code === 401 || res.status === 401) {
      redirectToLogin()
      return Promise.reject(new Error('Unauthorized'))
    }
    if (res.code !== undefined && res.code !== 0 && res.code !== '0') {
      const message = res.message || '请求失败'
      showFailToast(message)
      return Promise.reject(new Error(message))
    }
    return response
  },
  (error) => {
    if (error?.response?.status === 401) {
      redirectToLogin()
      return Promise.reject(error)
    }
    const message = error?.response?.data?.message || '请求失败'
    showFailToast(message)
    return Promise.reject(error)
  }
)

export default request
