<template>
  <div class="page login-page">
    <NavBar title="登录" />
    <div class="login-box">
      <h2>欢迎来到小说阅读平台</h2>
      <button class="wechat-btn" :disabled="!wechatReady || wechatLoading" @click="startWechatLogin">
        {{ wechatLoading ? '正在登录...' : '微信一键登录' }}
      </button>
      <p v-if="!wechatReady" class="config-hint">微信登录需在 .env 配置 AppID、授权回调地址和服务端登录接口</p>
      <div class="divider"><span>或</span></div>
      <div class="phone-panel">
        <input v-model="phone" type="tel" maxlength="11" autocomplete="tel" placeholder="请输入手机号" />
      </div>
      <div class="phone-panel code-panel">
        <input v-model="code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="请输入验证码" />
        <button :disabled="!smsEndpoint || countdown > 0 || smsLoading" @click="sendSmsCode">
          {{ !smsEndpoint ? '暂未开通' : countdown ? `${countdown}s` : smsLoading ? '发送中...' : '获取验证码' }}
        </button>
      </div>
      <p v-if="!smsEndpoint" class="config-hint">
        当前服务端未提供短信发送接口。{{ isDev ? '本地开发可使用测试码 123456。' : '请联系管理员配置短信服务。' }}
      </p>
      <button v-if="isDev" class="test-code-button" @click="useTestCode">本地填入测试码 123456</button>
      <button class="submit-btn" :disabled="loginLoading" @click="handleLogin">{{ loginLoading ? '登录中...' : '登录' }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showToast } from 'vant'
import NavBar from '../../components/NavBar.vue'
import { loginByPhone, loginWithWechatCode, requestSmsCode } from '../../api/user'
import { useAppStore } from '../../store'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const isDev = import.meta.env.DEV
const phone = ref('')
const code = ref('')
const countdown = ref(0)
const smsLoading = ref(false)
const loginLoading = ref(false)
const wechatLoading = ref(false)
let countdownTimer

const smsEndpoint = import.meta.env.VITE_SMS_CODE_ENDPOINT || ''
const phoneLoginEndpoint = import.meta.env.VITE_PHONE_LOGIN_ENDPOINT || '/auth/phone-login'
const wechatEndpoint = import.meta.env.VITE_WECHAT_LOGIN_ENDPOINT || '/auth/wx-login'
const wechatAppId = import.meta.env.VITE_WECHAT_APP_ID || ''
const wechatRedirectUri = import.meta.env.VITE_WECHAT_REDIRECT_URI || ''
const wechatReady = computed(() => Boolean(wechatEndpoint && wechatAppId && wechatRedirectUri))

const finishLogin = (payload) => {
  const token = payload?.accessToken || payload?.token
  if (!token) {
    showFailToast('登录响应缺少有效令牌')
    return false
  }
  appStore.setToken(token)
  appStore.setUserInfo(payload.user || {})
  const redirect = sessionStorage.getItem('login-redirect')
    || (typeof route.query.redirect === 'string' ? route.query.redirect : '/home')
  sessionStorage.removeItem('login-redirect')
  sessionStorage.removeItem('wechat-oauth-state')
  router.replace(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/home')
  return true
}

const sendSmsCode = async () => {
  if (!/^1\d{10}$/.test(phone.value)) {
    showFailToast('请输入正确的手机号')
    return
  }
  if (!smsEndpoint) {
    showFailToast('短信服务尚未配置，请联系管理员')
    return
  }
  if (!smsEndpoint.startsWith('/') || smsEndpoint.startsWith('//')) {
    showFailToast('短信接口地址必须是站内 API 路径')
    return
  }
  if (countdown.value > 0 || smsLoading.value) return
  smsLoading.value = true
  try {
    await requestSmsCode(smsEndpoint, { phone: phone.value })
    showToast('验证码已发送')
    countdown.value = 60
    countdownTimer = window.setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0) {
        window.clearInterval(countdownTimer)
        countdownTimer = undefined
      }
    }, 1000)
  } catch (error) {
    showFailToast(error?.response?.data?.message || '验证码发送失败')
  } finally {
    smsLoading.value = false
  }
}

const startWechatLogin = () => {
  if (!wechatReady.value || !wechatEndpoint.startsWith('/') || wechatEndpoint.startsWith('//')) {
    showFailToast('请配置有效的微信授权及服务端登录接口')
    return
  }
  if (!window.crypto?.getRandomValues) {
    showFailToast('当前浏览器不支持安全的微信授权校验')
    return
  }
  const bytes = window.crypto.getRandomValues(new Uint8Array(16))
  const state = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  sessionStorage.setItem('wechat-oauth-state', state)
  sessionStorage.setItem('login-redirect', typeof route.query.redirect === 'string' ? route.query.redirect : '/home')
  const authorizeUrl = new URL('https://open.weixin.qq.com/connect/oauth2/authorize')
  authorizeUrl.searchParams.set('appid', wechatAppId)
  authorizeUrl.searchParams.set('redirect_uri', wechatRedirectUri)
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('scope', 'snsapi_userinfo')
  authorizeUrl.searchParams.set('state', state)
  window.location.assign(`${authorizeUrl.toString()}#wechat_redirect`)
}

const completeWechatLogin = async () => {
  if (typeof route.query.error === 'string') {
    showFailToast('微信授权未完成')
    return
  }
  const oauthCode = typeof route.query.code === 'string' ? route.query.code : ''
  if (!oauthCode) return
  const expectedState = sessionStorage.getItem('wechat-oauth-state')
  if (!expectedState || route.query.state !== expectedState) {
    showFailToast('微信授权校验失败，请重新登录')
    return
  }
  if (!wechatEndpoint || !wechatEndpoint.startsWith('/') || wechatEndpoint.startsWith('//')) {
    showFailToast('请配置接收微信授权码的服务端登录接口')
    return
  }
  wechatLoading.value = true
  try {
    const { data } = await loginWithWechatCode(wechatEndpoint, { code: oauthCode })
    finishLogin(data?.data || data)
  } catch (error) {
    showFailToast(error?.response?.data?.message || '微信登录失败')
  } finally {
    wechatLoading.value = false
  }
}

const useTestCode = () => {
  if (!/^1\d{10}$/.test(phone.value)) {
    showFailToast('请输入正确的手机号')
    return
  }
  code.value = '123456'
  showToast('已填入本地测试验证码')
}

const handleLogin = async () => {
  if (!/^1\d{10}$/.test(phone.value) || !code.value.trim()) {
    showFailToast('请填写正确手机号和验证码')
    return
  }
  loginLoading.value = true
  try {
    const { data } = await loginByPhone({ phone: phone.value, code: code.value }, phoneLoginEndpoint)
    const payload = data?.data || data
    finishLogin(payload)
  } catch (error) {
    showFailToast(error?.response?.data?.message || '登录失败')
  } finally {
    loginLoading.value = false
  }
}

onMounted(completeWechatLogin)
onBeforeUnmount(() => window.clearInterval(countdownTimer))
</script>

<style scoped lang="less">
.login-page {
  background: #fff;
}
.login-box {
  padding: 28px 20px 40px;
  h2 {
    margin: 0 0 20px;
    font-size: 26px;
    text-align: center;
  }
}
.wechat-btn, .submit-btn {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  color: #fff;
  background: linear-gradient(135deg, #ff8257, var(--primary-color));
}
.divider {
  position: relative;
  margin: 24px 0 18px;
  text-align: center;
  color: #999;
  span {
    position: relative;
    z-index: 1;
    background: #fff;
    padding: 0 10px;
  }
  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 1px;
    background: #f0f0f0;
  }
}
.phone-panel {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  input {
    flex: 1;
    height: 46px;
    border: 1px solid #f0f0f0;
    border-radius: 10px;
    padding: 0 12px;
    outline: none;
  }
  button {
    width: 110px;
    height: 46px;
    border: none;
    background: #fff3ef;
    color: var(--primary-color);
    border-radius: 10px;
  }
}
.code-panel {
  input { width: 100%; }
}
.submit-btn {
  margin-top: 18px;
}
.config-hint {
  margin: 8px 0 0;
  color: #999;
  font-size: 12px;
  line-height: 1.5;
}
.test-code-button {
  margin-top: 12px;
  border: 0;
  background: transparent;
  color: #888;
  font-size: 12px;
}
.wechat-btn:disabled,
.submit-btn:disabled,
.code-panel button:disabled {
  opacity: 0.55;
}
</style>
