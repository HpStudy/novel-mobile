<template>
  <div class="page search-page">
    <div class="top-bar">
      <van-icon name="arrow-left" @click="$router.back()" />
      <div class="search-input">
        <van-icon name="search" />
        <input v-model="keyword" @keyup.enter="doSearch" placeholder="搜索书名/作者" />
        <button type="button" :disabled="loading" @click="doSearch">搜索</button>
      </div>
    </div>

    <van-pull-refresh v-model="refreshing" @refresh="refreshResults">
      <div v-if="!hasSearched" class="section-box">
        <div class="section-head">
          <span>搜索历史</span>
          <button v-if="history.length" class="clear-button" @click="clearHistory">清空</button>
        </div>
        <div class="tag-list">
          <span v-for="item in history" :key="item" @click="searchFor(item)">{{ item }}</span>
          <p v-if="!history.length" class="muted">暂无搜索记录</p>
        </div>
      </div>

      <div v-if="!hasSearched" class="section-box">
        <div class="section-head">热门搜索</div>
        <div class="tag-list">
          <span v-for="item in hotWords" :key="item" @click="searchFor(item)">{{ item }}</span>
        </div>
      </div>

      <van-loading v-if="loading" class="search-loading" size="24">搜索中...</van-loading>
      <van-list
        v-if="results.length"
        v-model:loading="loadingMore"
        :finished="finished"
        finished-text="没有更多了"
        @load="loadMoreResults"
      >
        <div class="result-list">
          <div class="result-item" v-for="book in results" :key="book.id" @click="$router.push(`/book-detail/${book.id}`)">
            <img v-if="book.cover || book.coverUrl" :src="book.cover || book.coverUrl" :alt="book.name || book.title" />
            <div v-else class="cover-placeholder">书</div>
            <div class="result-body">
              <h4>{{ book.name || book.title }}</h4>
              <p>{{ book.author || '作者未知' }}</p>
              <span>{{ book.summary || book.description || '' }}</span>
            </div>
          </div>
        </div>
      </van-list>
      <div v-else-if="hasSearched && !loading" class="empty-state">没有找到相关书籍</div>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { getHotSearchWords, getRecommendBooks, searchBooks } from '../../api/book'

const keyword = ref('')
const history = ref([])
const hotWords = ref([])
const results = ref([])
const resultPool = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const refreshing = ref(false)
const hasSearched = ref(false)
const finished = ref(false)
const pageSize = 10

const doSearch = () => searchFor(keyword.value)

const searchFor = async (value, { record = true } = {}) => {
  const query = value.trim()
  if (!query || loading.value) return
  keyword.value = query
  loading.value = true
  hasSearched.value = true
  results.value = []
  resultPool.value = []
  finished.value = false
  try {
    const { data } = await searchBooks(query)
    const payload = data?.data || data
    resultPool.value = Array.isArray(payload) ? payload : payload?.items || payload?.list || []
    results.value = resultPool.value.slice(0, pageSize)
    finished.value = results.value.length >= resultPool.value.length
    if (record && !history.value.includes(query)) {
      history.value = [query, ...history.value].slice(0, 10)
      localStorage.setItem('search-history', JSON.stringify(history.value))
    }
  } catch (error) {
    results.value = []
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const loadMoreResults = async () => {
  if (finished.value) {
    loadingMore.value = false
    return
  }
  const next = results.value.length + pageSize
  results.value = resultPool.value.slice(0, next)
  finished.value = results.value.length >= resultPool.value.length
  loadingMore.value = false
}

const refreshResults = () => {
  if (!hasSearched.value) {
    refreshing.value = false
    return
  }
  searchFor(keyword.value, { record: false })
}

const clearHistory = () => {
  history.value = []
  localStorage.removeItem('search-history')
}

onMounted(async () => {
  try {
    history.value = JSON.parse(localStorage.getItem('search-history') || '[]')
  } catch (error) {
    localStorage.removeItem('search-history')
  }
  const configuredWords = (import.meta.env.VITE_SEARCH_HOT_WORDS || '')
    .split(',')
    .map((word) => word.trim())
    .filter(Boolean)
  if (configuredWords.length) {
    hotWords.value = configuredWords.slice(0, 10)
    return
  }
  const hotEndpoint = import.meta.env.VITE_SEARCH_HOT_ENDPOINT || ''
  try {
    const { data } = hotEndpoint
      ? await getHotSearchWords(hotEndpoint)
      : await getRecommendBooks(1, 20)
    const payload = data?.data || data
    const items = Array.isArray(payload) ? payload : payload?.items || payload?.list || []
    hotWords.value = hotEndpoint
      ? items.map((item) => typeof item === 'string' ? item : item.keyword || item.name || item.word).filter(Boolean).slice(0, 10)
      : items.map((item) => item.name || item.title).filter(Boolean).slice(0, 10)
    if (!hotWords.value.length) hotWords.value = ['修仙', '重生', '都市', '科幻', '女主']
  } catch (error) {
    hotWords.value = ['修仙', '重生', '都市', '科幻', '女主']
  }
})
</script>

<style scoped lang="less">
.search-page {
  background: #fff;
  min-height: 100vh;
}
.top-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #f1f1f1;
}
.search-input {
  flex: 1;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f5f5f5;
  border-radius: 19px;
  padding: 0 12px;
  input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-size: 14px;
  }
  button {
    padding: 6px 10px;
    border: 0;
    border-radius: 14px;
    background: var(--primary-color);
    color: #fff;
    font-size: 12px;
  }
}
.section-box {
  padding: 16px;
  border-bottom: 1px solid #f6f6f6;
}
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}
.clear-button {
  border: 0;
  background: transparent;
  color: #999;
  font-size: 12px;
}
.muted,
.search-loading {
  color: #999;
  font-size: 12px;
}
.search-loading {
  padding: 24px;
  text-align: center;
}
.tag-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  span {
    padding: 7px 12px;
    border-radius: 999px;
    background: #fff4f1;
    color: var(--primary-color);
    font-size: 12px;
  }
}
.result-list {
  padding: 0 16px 20px;
}
.result-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f4f4f4;
  img {
    width: 68px;
    height: 92px;
    border-radius: 10px;
    object-fit: cover;
  }
  .cover-placeholder {
    width: 68px;
    height: 92px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: linear-gradient(145deg, #ffe1d2, #f3b49d);
    color: #fff;
  }
}
.result-body {
  flex: 1;
  h4 { margin: 0 0 6px; font-size: 15px; }
  p { margin: 0 0 6px; color: #888; font-size: 12px; }
  span { color: #666; font-size: 12px; line-height: 1.6; }
}
</style>
