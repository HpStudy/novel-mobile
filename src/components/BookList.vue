<template>
  <div class="book-list">
    <BookCard
      v-for="book in books"
      :key="book.id"
      :book="book"
      @click="$emit('select', book)"
    />
    <div v-if="loading && !books.length" class="list-state">
      <van-loading size="20" /> <span>加载中...</span>
    </div>
    <div v-else-if="!books.length" class="empty-state">{{ emptyText }}</div>
  </div>
</template>

<script setup>
import BookCard from './BookCard.vue'

defineProps({
  books: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  emptyText: { type: String, default: '暂无书籍' }
})

defineEmits(['select'])
</script>

<style scoped lang="less">
.book-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 10px;
  padding: 12px 12px 20px;
  min-height: 120px;
  :deep(.book-card),
  :deep(.cover-wrap) {
    width: 100%;
  }
  :deep(.cover-wrap) {
    height: auto;
    aspect-ratio: 100 / 138;
  }
  .list-state {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px 0;
    color: #999;
    font-size: 12px;
  }
  .empty-state {
    grid-column: 1 / -1;
  }
}
@media (min-width: 768px) {
  .book-list {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 22px 16px;
    padding: 20px 24px 32px;
  }
}
</style>
