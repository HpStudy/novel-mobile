<template>
  <div v-if="questions.length" class="quick-questions" aria-label="快捷问题">
    <button
      v-for="(question, index) in questions"
      :key="question.text || index"
      type="button"
      :disabled="disabled"
      @click="$emit('select', question)"
    >
      {{ question.text }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  questions: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false }
})

defineEmits(['select'])
</script>

<style scoped lang="less">
.quick-questions {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 10px 12px 2px;
  background: #fff;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
  button {
    flex: 0 0 auto;
    max-width: 220px;
    padding: 7px 12px;
    border: 1px solid #ffd9cd;
    border-radius: 16px;
    color: var(--primary-color);
    background: #fff6f2;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  button:disabled { opacity: .5; }
}
</style>
