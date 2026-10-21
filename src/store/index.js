import { defineStore } from 'pinia'

const readUserInfo = () => {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}')
  } catch (error) {
    localStorage.removeItem('userInfo')
    return {}
  }
}

export const useAppStore = defineStore('app', {
  state: () => ({
    user: {
      token: localStorage.getItem('token') || '',
      userInfo: readUserInfo()
    },
    readingSettings: {
      fontSize: Number(localStorage.getItem('reader-font-size')) || 16,
      lineHeight: Number(localStorage.getItem('reader-line-height')) || 1.8,
      brightness: Number(localStorage.getItem('reader-brightness')) || 100,
      theme: localStorage.getItem('reader-theme') || 'white'
    },
    nightMode: localStorage.getItem('night-mode') === '1'
  }),
  actions: {
    setToken(token) {
      this.user.token = token
      localStorage.setItem('token', token)
    },
    clearSession() {
      this.user.token = ''
      this.user.userInfo = {}
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
    },
    setUserInfo(info) {
      this.user.userInfo = info
      localStorage.setItem('userInfo', JSON.stringify(info))
    },
    updateReaderSettings(patch) {
      this.readingSettings = { ...this.readingSettings, ...patch }
      Object.entries(patch).forEach(([key, value]) => {
        if (key === 'fontSize') localStorage.setItem('reader-font-size', String(value))
        if (key === 'lineHeight') localStorage.setItem('reader-line-height', String(value))
        if (key === 'brightness') localStorage.setItem('reader-brightness', String(value))
        if (key === 'theme') localStorage.setItem('reader-theme', value)
      })
    },
    toggleNightMode(value) {
      this.nightMode = value
      localStorage.setItem('night-mode', value ? '1' : '0')
    }
  }
})

export default useAppStore
