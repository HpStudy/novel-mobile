<template>
  <button class="ai-fab" type="button" aria-label="打开智能客服" @click="openChat">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a8 8 0 0 0-6.8 12.22L4 20l4.78-1.2A8 8 0 1 0 12 3Zm-3 8.1a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Zm6 0a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2ZM8.7 13h6.6a3.3 3.3 0 0 1-6.6 0Z" />
    </svg>
    <span v-if="badge > 0" class="badge">{{ badge > 99 ? '99+' : badge }}</span>
  </button>
  <AiChatDialog v-model:show="showDialog" />
</template>

<script setup>
import { ref } from 'vue'
import { showToast } from 'vant'
import { useRouter } from 'vue-router'
import AiChatDialog from './AiChatDialog.vue'

defineProps({ badge: { type: Number, default: 0 } })

const router = useRouter()
const showDialog = ref(false)

const openChat = () => {
  if (!localStorage.getItem('token')) {
    showToast('登录后即可使用智能客服')
    router.push({ path: '/login', query: { redirect: '/home' } })
    return
  }
  showDialog.value = true
}
</script>

<style scoped lang="less">
.ai-fab {
  position: fixed;
  z-index: 999;
  right: 16px;
  bottom: calc(76px + env(safe-area-inset-bottom));
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-orange), var(--primary-color));
  box-shadow: 0 5px 16px rgba(230, 67, 45, .32);
  transition: transform .15s ease;
  &:active { transform: scale(.95); }
  svg { width: 27px; height: 27px; fill: #fff; }
}
.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border: 1px solid #fff;
  border-radius: 10px;
  color: #fff;
  background: #f04438;
  font-size: 10px;
  line-height: 15px;
  text-align: center;
}
@media (min-width: 768px) {
  .ai-fab {
    right: 24px;
  }
}
@media (min-width: 1280px) {
  .ai-fab {
    right: calc((100vw - var(--app-max-width)) / 2 + 24px);
  }
}
</style>
