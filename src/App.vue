<template>
  <div class="app-shell" :class="{ 'night-global': appStore.nightMode }">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <van-tabbar v-if="showTabbar" route>
      <van-tabbar-item to="/home" name="home" icon="wap-home-o">首页</van-tabbar-item>
      <van-tabbar-item to="/category" name="category" icon="apps-o">分类</van-tabbar-item>
      <van-tabbar-item to="/shelf" name="shelf" icon="orders-o">书架</van-tabbar-item>
      <van-tabbar-item to="/profile" name="profile" icon="contact-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from './store'

const route = useRoute()
const appStore = useAppStore()
const showTabbar = computed(() => !['reader', 'login', 'pay', 'search', 'book-list', 'book-detail', 'history', 'orders'].includes(route.name))
</script>

<style scoped lang="less">
.app-shell {
  min-height: 100vh;
  padding-bottom: 56px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
