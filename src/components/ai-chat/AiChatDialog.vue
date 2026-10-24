<template>
  <van-popup v-model:show="visible" position="bottom" round class="ai-popup" :style="{ height: '85vh' }">
    <section class="chat-panel" aria-label="智能客服对话">
      <header class="chat-header">
        <div class="header-title">
          <strong>智能客服</strong>
          <span>{{ statusLabel }}</span>
        </div>
        <div class="header-actions">
          <button
            v-if="status === 0"
            type="button"
            :disabled="transferring"
            @click="confirmTransfer"
          >{{ transferring ? '转接中' : '转人工' }}</button>
          <button
            v-if="status === 0 || status === 2"
            type="button"
            class="end-button"
            @click="confirmEnd"
          >结束</button>
          <button type="button" class="close-button" aria-label="关闭客服" @click="visible = false">×</button>
        </div>
      </header>

      <div ref="messageList" class="message-list" @scroll="handleScroll">
        <div v-if="loadingHistory" class="history-loading"><van-loading size="16" /> 加载消息中...</div>
        <button
          v-else-if="hasEarlier"
          type="button"
          class="load-earlier"
          @click="loadEarlier"
        >加载更早消息</button>
        <div v-if="loadingSession && !messages.length" class="chat-state">
          <van-loading size="24">正在恢复客服会话...</van-loading>
        </div>
        <div v-else-if="errorMessage && !messages.length" class="chat-state error-state">
          <p>{{ errorMessage }}</p>
          <button type="button" @click="openSession">重试连接</button>
        </div>
        <div v-else-if="!messages.length && !loadingSession" class="chat-state">
          <p>您好，请问有什么可以帮您？</p>
        </div>
        <AiMessageItem
          v-for="(message, index) in messages"
          :key="message.id || message.localId || `${message.role}-${index}`"
          :message="message"
          :show-time="shouldShowTime(messages, index)"
          @retry="retry"
          @feedback="submitFeedback"
        />
        <div ref="messageBottom"></div>
      </div>

      <p v-if="status === 1" class="status-notice">客服接入中，请稍候…</p>
      <p v-else-if="status === 3" class="status-notice">会话已结束，可关闭窗口</p>
      <p v-else-if="errorMessage && messages.length" class="status-notice error-text">{{ errorMessage }}</p>

      <AiQuickQuestions
        v-if="showQuickQuestions"
        :questions="quickQuestions"
        :disabled="!canSend"
        @select="selectQuickQuestion"
      />

      <form class="composer" @submit.prevent="send()">
        <textarea
          ref="textarea"
          v-model="input"
          rows="1"
          maxlength="500"
          :disabled="!canSend"
          :placeholder="composerPlaceholder"
          @input="resizeTextarea"
          @keydown.enter.exact.prevent="send()"
        ></textarea>
        <button type="submit" :disabled="!canSend || !input.trim()">
          {{ sending ? '发送中' : status === 1 ? '等待接入' : status === 3 ? '已结束' : '发送' }}
        </button>
      </form>
      <div class="input-hint">{{ input.length }}/500 · Enter 发送，Shift+Enter 换行</div>
    </section>
  </van-popup>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { showConfirmDialog, showFailToast } from 'vant'
import AiMessageItem from './AiMessageItem.vue'
import AiQuickQuestions from './AiQuickQuestions.vue'
import { useAiChat } from './useAiChat'

const props = defineProps({ show: { type: Boolean, default: false } })
const emit = defineEmits(['update:show'])
const {
  status,
  messages,
  input,
  loadingSession,
  loadingHistory,
  quickQuestions,
  sending,
  transferring,
  errorMessage,
  hasEarlier,
  canSend,
  openSession,
  loadEarlierMessages,
  send,
  retry,
  transfer,
  endSession,
  submitFeedback
} = useAiChat()
const messageList = ref(null)
const messageBottom = ref(null)
const textarea = ref(null)
const visible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})
const statusLabel = computed(() => ({
  0: '在线为您服务',
  1: '等待人工接入',
  2: '人工客服已接入',
  3: '会话已结束'
}[status.value] || ''))
const composerPlaceholder = computed(() => {
  if (status.value === 1) return '客服接入中，暂不能发送消息'
  if (status.value === 3) return '会话已结束'
  return status.value === 2 ? '向人工客服发送消息…' : '请输入您的问题…'
})
const showQuickQuestions = computed(() => (
  quickQuestions.value.length > 0
  && !messages.value.some((message) => message.role === 'user')
  && (status.value === 0 || status.value === 2)
))

watch(() => props.show, async (isOpen) => {
  if (!isOpen) return
  // 流式回复进行中重新打开时不要重拉历史，避免覆盖正在拼接的 assistant 气泡。
  if (!sending.value) await openSession()
  await scrollToBottom()
}, { immediate: true })

watch(() => messages.value.map((message) => `${message.localId || message.id}:${message.content?.length || 0}`).join('|'), async () => {
  if (props.show) await scrollToBottom()
})

const scrollToBottom = async () => {
  await nextTick()
  if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight
}

const shouldShowTime = (items, index) => {
  if (index === 0) return true
  const current = new Date(items[index].createdAt).getTime()
  const previous = new Date(items[index - 1].createdAt).getTime()
  return Number.isFinite(current) && Number.isFinite(previous) && current - previous > 5 * 60 * 1000
}

const loadEarlier = async () => {
  const list = messageList.value
  const previousHeight = list?.scrollHeight || 0
  await loadEarlierMessages()
  await nextTick()
  if (list) list.scrollTop += list.scrollHeight - previousHeight
}

const handleScroll = async () => {
  if (messageList.value?.scrollTop <= 20 && hasEarlier.value && !loadingHistory.value) {
    await loadEarlier()
  }
}

const selectQuickQuestion = (question) => {
  if (!canSend.value) return
  input.value = question?.payload || question?.text || ''
  send()
}

const resizeTextarea = () => {
  if (!textarea.value) return
  textarea.value.style.height = 'auto'
  textarea.value.style.height = `${Math.min(textarea.value.scrollHeight, 96)}px`
}

const confirmTransfer = async () => {
  try {
    await showConfirmDialog({ title: '转接人工客服', message: '确定申请转接人工客服吗？' })
    await transfer()
  } catch (error) {
    if (error !== 'cancel') showFailToast(error?.message || '转人工失败')
  }
}

const confirmEnd = async () => {
  try {
    await showConfirmDialog({ title: '结束会话', message: '结束后将无法继续在此会话发送消息。' })
    await endSession()
  } catch (error) {
    if (error !== 'cancel') showFailToast(error?.message || '结束会话失败')
  }
}
</script>

<style scoped lang="less">
.ai-popup {
  display: flex;
  overflow: hidden;
  border-radius: 16px 16px 0 0;
}
.chat-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #f7f7f7;
}
.chat-header {
  flex: 0 0 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: #fff;
  border-bottom: 1px solid #eee;
}
.header-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  strong { font-size: 15px; }
  span { color: #999; font-size: 10px; }
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  button {
    border: 0;
    padding: 4px 0;
    color: var(--primary-color);
    background: transparent;
    font-size: 13px;
  }
  button:disabled { opacity: .5; }
  .end-button { color: #888; }
  .close-button { color: #666; font-size: 24px; line-height: 1; }
}
.message-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 10px 12px;
}
.history-loading, .load-earlier {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  margin: 4px 0 12px;
  color: #999;
  font-size: 12px;
}
.load-earlier {
  border: 0;
  padding: 8px;
  background: transparent;
}
.chat-state {
  padding: 24px 10px;
  color: #888;
  font-size: 13px;
  text-align: center;
  p { margin: 0 0 10px; }
  button {
    border: 0;
    padding: 7px 14px;
    border-radius: 16px;
    color: #fff;
    background: var(--primary-color);
  }
}
.status-notice {
  flex: 0 0 auto;
  margin: 0;
  padding: 6px 12px;
  color: #9a7135;
  background: #fff7e9;
  text-align: center;
  font-size: 12px;
}
.error-text { color: #c43b2b; background: #fff0ed; }
.composer {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 10px 12px 4px;
  background: #fff;
  border-top: 1px solid #eee;
  textarea {
    flex: 1;
    min-width: 0;
    min-height: 40px;
    max-height: 96px;
    resize: none;
    overflow-y: auto;
    padding: 10px 12px;
    border: 0;
    border-radius: 12px;
    outline: none;
    color: #222;
    background: #f4f4f4;
    font-size: 14px;
    line-height: 20px;
  }
  button {
    flex: 0 0 56px;
    height: 40px;
    border: 0;
    border-radius: 12px;
    color: #fff;
    background: linear-gradient(135deg, var(--primary-orange), var(--primary-color));
    font-size: 13px;
  }
  button:disabled { opacity: .45; }
}
.input-hint {
  flex: 0 0 auto;
  padding: 0 12px calc(8px + env(safe-area-inset-bottom));
  color: #aaa;
  background: #fff;
  font-size: 10px;
  text-align: right;
}
@media (min-width: 600px) {
  .ai-popup {
    max-width: 540px;
    left: 50%;
    margin-left: -270px;
  }
}
</style>
