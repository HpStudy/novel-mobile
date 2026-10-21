<template>
  <div class="page profile-page">
    <NavBar title="我的" />
    <div class="profile-header">
      <div class="avatar">
        <img v-if="userInfo.avatarUrl" :src="userInfo.avatarUrl" :alt="`${userInfo.name || '用户'}头像`" />
        <span v-else>{{ userInfo.name?.slice(0, 1) || 'U' }}</span>
      </div>
      <div class="info">
        <h3>{{ userInfo.name || '用户' }}</h3>
        <p>{{ appStore.user.token ? `VIP ${userInfo.vip || 0}` : '登录后查看会员信息' }}</p>
      </div>
    </div>

    <div class="wallet-card">
      <div>
        <span>阅币余额</span>
        <strong>{{ userInfo.balance ?? 0 }}</strong>
      </div>
    </div>

    <div class="menu-list">
      <div v-if="!appStore.user.token" class="menu-item login-entry" @click="$router.push('/login')">登录 / 注册</div>
      <div class="menu-item" @click="$router.push('/shelf')">我的书架</div>
      <div class="menu-item" @click="$router.push('/history')">阅读历史</div>
      <div class="menu-item" @click="$router.push('/orders')">我的订单</div>
      <div class="menu-item" @click="settingsVisible = true">设置</div>
    </div>
    <van-popup v-model:show="settingsVisible" position="bottom" round>
      <div class="settings-panel">
        <h3>阅读设置</h3>
        <div class="setting-row">
          <span>夜间模式</span>
          <van-switch :model-value="appStore.nightMode" @update:model-value="appStore.toggleNightMode" />
        </div>
        <div class="setting-row font-setting">
          <span>默认字号</span>
          <van-stepper v-model="defaultFontSize" min="14" max="22" @change="saveFontSize" />
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import NavBar from '../../components/NavBar.vue'
import { useAppStore } from '../../store'
import { getProfile } from '../../api/user'

const appStore = useAppStore()
const userInfo = ref({})
const settingsVisible = ref(false)
const defaultFontSize = ref(appStore.readingSettings.fontSize)

const saveFontSize = (value) => {
  appStore.updateReaderSettings({ fontSize: value })
}

onMounted(async () => {
  if (!appStore.user.token) return
  try {
    const { data } = await getProfile()
    const payload = data?.data || data
    if (payload) {
      userInfo.value = {
        ...userInfo.value,
        ...payload,
        name: payload.name || payload.nickname,
        vip: payload.vip ?? payload.vipLevel
      }
      appStore.setUserInfo(userInfo.value)
    }
  } catch (error) {
    userInfo.value = { ...userInfo.value, ...appStore.user.userInfo }
  }
})
</script>

<style scoped lang="less">
.profile-page {
  background: #fff;
}
.profile-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 16px 12px;
  background: linear-gradient(135deg, #fff0ef, #fff8f5);
}
.avatar {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9b73, #e6432d);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  overflow: hidden;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.info {
  h3 { margin: 0; font-size: 18px; }
  p { margin: 6px 0 0; font-size: 12px; color: #7d7d7d; }
}
.wallet-card {
  margin: 16px;
  background: linear-gradient(135deg, #ffec84, #ffb14a);
  padding: 18px 16px;
  border-radius: 16px;
  color: #4f2e00;
  span { display: block; font-size: 12px; opacity: 0.8; }
  strong { display: block; margin-top: 8px; font-size: 26px; }
}
.menu-list {
  padding: 0 16px 30px;
}
.menu-item {
  padding: 16px 0;
  border-bottom: 1px solid #f2f2f2;
  font-size: 15px;
  color: #2d2d2d;
}
.settings-panel {
  padding: 22px 20px calc(24px + env(safe-area-inset-bottom));
  h3 { margin: 0 0 20px; font-size: 17px; }
  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0;
    border-top: 1px solid #f2f2f2;
    font-size: 14px;
  }
}
</style>
