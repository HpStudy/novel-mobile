<template>
  <div class="page history-page">
    <NavBar title="阅读历史" />
    <van-pull-refresh v-model="refreshing" @refresh="loadHistory">
      <van-list v-model:loading="loadingMore" :finished="finished" :immediate-check="false" finished-text="没有更多了" @load="loadMore">
        <div v-if="visibleRecords.length" class="history-list">
          <div v-for="record in visibleRecords" :key="record.bookId" class="history-item" @click="resume(record)">
            <img v-if="record.cover" :src="record.cover" :alt="record.bookName || record.title || '书籍封面'" />
            <div v-else class="cover-placeholder" aria-hidden="true">书</div>
            <div class="history-info">
              <strong>{{ record.bookName || record.title || `书籍 ${record.bookId}` }}</strong>
              <span>{{ record.chapterTitle || `章节 ${record.chapterId}` }}</span>
              <small>{{ formatTime(record.savedAt || record.updatedAt) }}</small>
            </div>
            <van-icon name="arrow" />
          </div>
        </div>
        <div v-else-if="!initialLoading" class="empty-state">
          <p>{{ appStore.user.token ? '暂无阅读记录' : '登录后同步阅读历史' }}</p>
          <van-button v-if="!appStore.user.token" type="primary" round @click="$router.push('/login')">去登录</van-button>
        </div>
        <van-loading v-if="initialLoading" class="loading-state" size="24">加载中...</van-loading>
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { getChapterList, getReadingHistory } from '../../api/chapter'
import { getBookDetail } from '../../api/book'
import NavBar from '../../components/NavBar.vue'
import { useAppStore } from '../../store'

const router = useRouter()
const records = ref([])
const appStore = useAppStore()
const refreshing = ref(false)
const loadingMore = ref(false)
const initialLoading = ref(true)
const finished = ref(false)
const pageSize = 12
const visibleRecords = computed(() => records.value.slice(0, visibleCount.value))
const visibleCount = ref(pageSize)

const localHistory = () => {
  const result = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key?.startsWith('reader-progress:')) continue
    try {
      const progress = JSON.parse(localStorage.getItem(key))
      if (progress?.chapterId) {
        result.push({ ...progress, bookId: progress.bookId || key.slice('reader-progress:'.length) })
      }
    } catch (error) {
      localStorage.removeItem(key)
    }
  }
  return result.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
}

const resume = (record) => {
  router.push({
    path: `/reader/${record.chapterId}`,
    query: { bookId: record.bookId, resume: '1' }
  })
}

const formatTime = (value) => {
  if (!value) return '最近阅读'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '最近阅读' : date.toLocaleString()
}

const enrichHistory = async (items) => Promise.all(items.map(async (record) => {
  try {
    const [{ data: bookResponse }, { data: chapterResponse }] = await Promise.all([
      getBookDetail(record.bookId),
      getChapterList(record.bookId)
    ])
    const book = bookResponse?.data || bookResponse
    const chaptersPayload = chapterResponse?.data || chapterResponse
    const chapterList = Array.isArray(chaptersPayload) ? chaptersPayload : chaptersPayload?.items || []
    const chapter = chapterList.find((item) => String(item.id) === String(record.chapterId))
    return {
      ...record,
      bookName: book?.title || book?.name || record.bookName,
      cover: book?.coverUrl || book?.cover || record.cover,
      chapterTitle: chapter?.title || record.chapterTitle,
      savedAt: record.savedAt || record.updatedAt
    }
  } catch (error) {
    return record
  }
}))

const loadHistory = async () => {
  initialLoading.value = records.value.length === 0
  if (!appStore.user.token) {
    records.value = localHistory()
    visibleCount.value = pageSize
    finished.value = records.value.length <= pageSize
    initialLoading.value = false
    refreshing.value = false
    return
  }
  try {
    const { data } = await getReadingHistory()
    const payload = data?.data || data
    const items = Array.isArray(payload) ? payload : payload?.items || payload?.list || []
    records.value = await enrichHistory(items)
    visibleCount.value = pageSize
    finished.value = records.value.length <= pageSize
  } catch (error) {
    records.value = localHistory()
    visibleCount.value = pageSize
    finished.value = records.value.length <= pageSize
    if (!records.value.length) showFailToast('阅读历史加载失败')
  } finally {
    initialLoading.value = false
    refreshing.value = false
  }
}

const loadMore = async () => {
  visibleCount.value = Math.min(visibleCount.value + pageSize, records.value.length)
  finished.value = visibleCount.value >= records.value.length
  loadingMore.value = false
}

onMounted(loadHistory)
</script>

<style scoped lang="less">
.history-page {
  background: #fff;
}
.history-list {
  padding: 8px 16px 20px;
}
.loading-state {
  padding: 28px;
  text-align: center;
}
.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f2f2f2;
  img {
    width: 58px;
    height: 78px;
    border-radius: 8px;
    object-fit: cover;
  }
  .cover-placeholder {
    width: 58px;
    height: 78px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: linear-gradient(145deg, #ffe1d2, #f3b49d);
    color: #fff;
  }
}
.history-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  strong, span, small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  strong { font-size: 14px; }
  span, small { font-size: 12px; color: #888; }
}
@media (min-width: 768px) {
  .history-list {
    max-width: 880px;
    margin: 0 auto;
    padding: 16px 24px 32px;
  }
}
</style>
