<template>
  <div class="nav-bar">
    <div class="left">
      <van-icon name="arrow-left" @click="handleBack" />
    </div>
    <div class="title">{{ title }}</div>
    <div class="right">
      <slot name="right" />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const props = defineProps({
  title: { type: String, default: '标题' }
})
const router = useRouter()
const handleBack = () => {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push('/home')
}
</script>

<style scoped lang="less">
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #f0f0f0;
  padding: 0 14px;
  .left, .right {
    width: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .title {
    flex: 1;
    text-align: center;
    font-size: 17px;
    font-weight: 600;
    color: #1d1d1d;
  }
}
</style>
