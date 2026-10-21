<template>
  <div class="book-card" @click="$emit('click')">
    <div class="cover-wrap">
      <img v-if="book.cover && !coverFailed" :src="book.cover" :alt="book.name" @error="coverFailed = true" />
      <div v-else class="cover-placeholder" aria-hidden="true">书</div>
    </div>
    <div class="book-info">
      <h4>{{ book.name }}</h4>
      <p>{{ book.author }}</p>
      <div class="meta">
        <span v-if="book.score">⭐ {{ book.score }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  book: {
    type: Object,
    default: () => ({})
  }
})

const coverFailed = ref(false)
watch(() => props.book?.cover || props.book?.coverUrl || props.book?.cover_url, () => {
  coverFailed.value = false
})

const book = computed(() => {
  const item = props.book || {}
  return {
    ...item,
    name: item.name || item.title || '未命名书籍',
    cover: item.cover || item.coverUrl || item.cover_url || ''
  }
})
</script>

<style scoped lang="less">
.book-card {
  width: 100px;
  cursor: pointer;
  .cover-wrap {
    width: 100px;
    height: 138px;
    overflow: hidden;
    border-radius: 12px;
    box-shadow: 0 6px 12px rgba(0,0,0,0.08);
    background: #f0f0f0;
    .cover-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(145deg, #ffe1d2, #f3b49d);
      color: #fff;
      font-size: 24px;
      font-weight: 600;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  .book-info {
    margin-top: 8px;
    h4 {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: #222;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      min-height: 39px;
    }
    p {
      margin: 4px 0 0;
      font-size: 11px;
      color: #7c7c7c;
    }
    .meta {
      margin-top: 4px;
      font-size: 10px;
      color: #ff953e;
    }
  }
}
</style>
