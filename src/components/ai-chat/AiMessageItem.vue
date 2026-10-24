<template>
  <div class="message-row" :class="[`role-${message.role}`]">
    <time v-if="showTime" class="message-time">{{ formatTime(message.createdAt) }}</time>
    <div v-if="message.role === 'system'" class="system-message">{{ message.content }}</div>
    <template v-else>
      <div v-if="message.role === 'agent'" class="agent-label">人工客服</div>
      <div class="message-bubble">
        <div v-if="message.isLoading && !message.content" class="typing-dots" aria-label="正在回复">
          <i></i><i></i><i></i>
        </div>
        <p v-else class="message-content">{{ message.content }}</p>
        <div v-if="message.failed" class="message-failed">
          <span>{{ message.error || '发送失败' }}</span>
          <button type="button" @click="$emit('retry', message)">点击重试</button>
        </div>
        <div v-if="message.citations?.length" class="citations">
          <button type="button" @click="showCitations">参考来源（{{ message.citations.length }}）</button>
        </div>
        <div v-if="message.role === 'assistant' && message.id && !message.isLoading && !message.failed" class="feedback-row">
          <span v-if="message.feedbackRating != null">已反馈，感谢</span>
          <template v-else>
            <button type="button" aria-label="有用" @click="$emit('feedback', message, 1)">有用</button>
            <button type="button" aria-label="无用" @click="$emit('feedback', message, 0)">无用</button>
          </template>
        </div>
      </div>
    </template>
  </div>
  <van-action-sheet
    v-model:show="showCitationSheet"
    title="参考来源"
    :actions="citationActions"
    cancel-text="关闭"
  />
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  message: { type: Object, required: true },
  showTime: { type: Boolean, default: false }
})

defineEmits(['feedback', 'retry'])

const showCitationSheet = ref(false)
const citationActions = ref([])

const formatTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${month}-${day} ${time}`
}

const showCitations = () => {
  const citations = props.message.citations.slice(0, 3)
  citationActions.value = citations.map((citation) => {
    const snippet = citation.snippet || citation.content || citation.text
    const chunk = citation.chunkIndex == null ? '' : ` · 片段 ${citation.chunkIndex}`
    return {
      name: citation.title || '知识库来源',
      subname: `${chunk}${snippet ? `${chunk ? ' · ' : ''}${snippet}` : ''}`.trim()
    }
  })
  showCitationSheet.value = true
}
</script>

<style scoped lang="less">
.message-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin: 10px 0;
  animation: message-enter 0.18s ease-out;
  &.role-user { align-items: flex-end; }
  &.role-system { align-items: center; }
}
.message-time {
  align-self: center;
  margin: 4px 0 8px;
  color: #999;
  font-size: 11px;
}
.system-message {
  max-width: 90%;
  padding: 4px 10px;
  border-radius: 10px;
  color: #8a8a8a;
  font-size: 12px;
  text-align: center;
  line-height: 1.5;
}
.agent-label {
  margin: 0 0 4px 4px;
  color: #7c8794;
  font-size: 11px;
}
.message-bubble {
  max-width: 75%;
  padding: 10px 12px;
  border-radius: 14px;
  background: #fff;
  color: #252525;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .045);
  .role-user & {
    background: linear-gradient(135deg, var(--primary-orange), var(--primary-color));
    color: #fff;
    border-bottom-right-radius: 5px;
  }
  .role-agent & {
    background: #eef4fb;
    border-bottom-left-radius: 5px;
  }
}
.message-content {
  margin: 0;
  font-size: 15px;
  line-height: 1.65;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.message-failed, .feedback-row, .citations {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: #999;
  font-size: 11px;
}
.message-failed button, .feedback-row button, .citations button {
  border: 0;
  padding: 0;
  color: var(--primary-color);
  background: transparent;
  font-size: 11px;
}
.feedback-row button {
  color: #8a8a8a;
}
.typing-dots {
  display: flex;
  gap: 4px;
  padding: 5px 0;
  i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #aaa;
    animation: dot-bounce .9s infinite ease-in-out;
    &:nth-child(2) { animation-delay: .12s; }
    &:nth-child(3) { animation-delay: .24s; }
  }
}
@keyframes dot-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: .5; }
  30% { transform: translateY(-4px); opacity: 1; }
}
@keyframes message-enter {
  from { transform: translateY(4px); opacity: .65; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
