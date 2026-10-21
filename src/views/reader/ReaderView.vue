<template>
  <div class="page reader-page" :class="[`theme-${effectiveTheme}`, { night: isNightMode }]" :style="readerStyle">
    <div class="reader-header" v-if="showToolbar">
      <van-icon name="arrow-left" @click="$router.back()" />
      <div class="title">{{ chapterTitle }}</div>
      <div class="spacer"></div>
    </div>

    <div
      ref="readerContent"
      class="reader-content"
      @click="toggleToolbar"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <div class="content-wrap">
        <h1>{{ chapterTitle }}</h1>
        <van-loading v-if="chapterLoading" class="chapter-loading" size="24">章节加载中...</van-loading>
        <div v-else-if="articleText" class="article" :style="articleStyle">{{ articleText }}</div>
        <div v-else class="chapter-empty">章节内容暂不可用</div>
      </div>
    </div>

    <div class="reader-toolbar" v-if="showToolbar">
      <div class="toolbar-row">
        <button @click="fontSize = Math.max(14, fontSize - 1)">A-</button>
        <button @click="fontSize = Math.min(22, fontSize + 1)">A+</button>
        <button @click="changeTheme('white')">白</button>
        <button @click="changeTheme('sand')">黄</button>
        <button @click="changeTheme('green')">绿</button>
        <button @click="changeTheme('night')">夜</button>
      </div>
      <div class="toolbar-row secondary-row">
        <button @click.stop="goToChapter(-1)">上一章</button>
        <button @click.stop="toggleCatalog">目录</button>
        <button @click.stop="goToChapter(1)">下一章</button>
      </div>
      <div class="toolbar-row secondary-row">
        <button @click.stop="lineHeight = lineHeight >= 2 ? 1.8 : 2">行距</button>
        <button @click.stop="brightness = brightness > 70 ? 60 : 100">亮度</button>
      </div>
    </div>

    <van-popup v-model:show="catalogVisible" position="right" :style="{ width: '70%', height: '100%' }">
      <div class="catalog-panel">
        <div class="catalog-header">目录</div>
        <ul>
          <li v-for="item in chapters" :key="item.id" @click="jumpToChapter(item)">
            {{ item.title }} <span v-if="item.isVip || item.is_vip">VIP</span>
          </li>
        </ul>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { getChapterDetail, getChapterList, getReadingHistory, saveReadingProgress } from '../../api/chapter'
import { useAppStore } from '../../store'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const showToolbar = ref(true)
const catalogVisible = ref(false)
const readerContent = ref(null)
const chapterTitle = ref('')
const articleText = ref('')
const chapterLoading = ref(false)
const chapters = ref([])
const currentChapterId = ref(route.params.id)
const remoteProgress = ref(null)
const bookId = computed(() => route.query.bookId || '')
let saveTimer
let initializing = true
let skipRouteLoad = false
let touchStartX = 0
let touchStartY = 0

const theme = ref(appStore.readingSettings.theme || 'white')
const effectiveTheme = computed(() => appStore.nightMode ? 'night' : theme.value)
const isNightMode = computed(() => effectiveTheme.value === 'night')
const fontSize = ref(appStore.readingSettings.fontSize || 16)
const lineHeight = ref(appStore.readingSettings.lineHeight || 1.8)
const brightness = ref(appStore.readingSettings.brightness || 100)

const readerStyle = computed(() => ({
  background: effectiveTheme.value === 'white' ? '#ffffff' : effectiveTheme.value === 'sand' ? '#f5f0e1' : effectiveTheme.value === 'green' ? '#e8f5e9' : '#1a1a1a',
  filter: `brightness(${brightness.value / 100})`
}))

const articleStyle = computed(() => ({
  fontSize: `${fontSize.value}px`,
  lineHeight: lineHeight.value,
  color: effectiveTheme.value === 'night' ? '#d4d4d4' : '#2d2d2d'
}))

watch([fontSize, lineHeight, brightness], ([fs, lh, br]) => {
  appStore.updateReaderSettings({ fontSize: fs, lineHeight: lh, brightness: br })
})

watch(theme, (val) => {
  appStore.updateReaderSettings({ theme: val })
  appStore.toggleNightMode(val === 'night')
})

const toggleToolbar = () => {
  showToolbar.value = !showToolbar.value
}

const changeTheme = (value) => {
  theme.value = value
}

const toggleCatalog = () => {
  catalogVisible.value = !catalogVisible.value
}

const isVipChapter = (chapter) => Boolean(
  chapter?.isVip || chapter?.is_vip || chapter?.vip || chapter?.isFree === 0
)

const chapterRoute = (chapterId) => ({
  name: 'reader',
  params: { id: chapterId },
  query: {
    ...(bookId.value ? { bookId: bookId.value } : {}),
    ...(route.query.resume === '1' ? { resume: '1' } : {})
  }
})

const jumpToChapter = async (item) => {
  if (isVipChapter(item)) {
    const result = await showConfirmDialog({
      title: 'VIP章节',
      message: '本章节需要付费阅读，是否前往确认支付？'
    }).catch(() => false)
    if (result) {
      router.push({
        path: `/pay/${item.id}`,
        query: { bookId: bookId.value, title: item.title }
      })
    }
    return
  }
  catalogVisible.value = false
  skipRouteLoad = true
  await router.replace(chapterRoute(item.id))
  await loadChapter(item.id)
}

const goToChapter = async (direction) => {
  const index = chapters.value.findIndex((chapter) => String(chapter.id) === String(currentChapterId.value))
  const nextChapter = chapters.value[index + direction]
  if (!nextChapter) {
    showToast('没有更多章节了')
    return
  }
  await jumpToChapter(nextChapter)
}

const progressKey = (id = bookId.value) => `reader-progress:${id || 'unknown'}`

const persistProgress = () => {
  const chapterId = currentChapterId.value
  if (!chapterId) return
  const documentHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
  const position = window.scrollY || readerContent.value?.scrollTop || 0
  const payload = {
    bookId: bookId.value ? Number(bookId.value) : undefined,
    chapterId,
    position,
    progress: Math.min(100, Math.round((position / documentHeight) * 100)),
    savedAt: Date.now()
  }
  localStorage.setItem(progressKey(), JSON.stringify(payload))
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(async () => {
    if (!payload.bookId || !appStore.user.token) return
    try {
      await saveReadingProgress({
        bookId: payload.bookId,
        chapterId: Number(payload.chapterId),
        progress: payload.progress
      })
    } catch (error) {
      // The local copy remains available when the progress API is unreachable.
    }
  }, 800)
}

const restoreProgress = async (requestedChapterId) => {
  if (route.query.resume !== '1') return requestedChapterId
  try {
    const saved = JSON.parse(localStorage.getItem(progressKey()) || 'null')
    if (saved?.chapterId) return saved.chapterId
  } catch (error) {
    localStorage.removeItem(progressKey())
  }
  if (bookId.value && appStore.user.token) {
    try {
      const { data } = await getReadingHistory()
      const payload = data?.data || data
      const records = Array.isArray(payload) ? payload : payload?.items || payload?.list || []
      const saved = records.find((record) => String(record.bookId || record.book_id) === String(bookId.value))
      if (saved?.chapterId || saved?.chapter_id) {
        remoteProgress.value = Number(saved.progress) || 0
        return saved.chapterId || saved.chapter_id
      }
    } catch (error) {
      // Local progress is still used when the history endpoint is unavailable.
    }
  }
  return requestedChapterId
}

const restorePosition = async () => {
  await nextTick()
  try {
    const saved = JSON.parse(localStorage.getItem(progressKey()) || 'null')
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
    const position = saved?.position ?? (remoteProgress.value != null ? maxScroll * remoteProgress.value / 100 : 0)
    if (position > 0) window.scrollTo({ top: position, behavior: 'auto' })
  } catch (error) {
    localStorage.removeItem(progressKey())
  }
}

const loadChapter = async (chapterId, { save = true } = {}) => {
  currentChapterId.value = chapterId
  chapterTitle.value = chapters.value.find((chapter) => String(chapter.id) === String(chapterId))?.title || ''
  articleText.value = ''
  chapterLoading.value = true
  try {
    const { data } = await getChapterDetail(chapterId)
    const responseData = data?.data || data
    const chapter = responseData?.chapter || responseData
    chapterTitle.value = chapter?.title || chapter?.name || chapterTitle.value
    articleText.value = chapter?.content || chapter?.text || articleText.value
  } catch (error) {
    articleText.value = ''
    if (error?.response?.status === 403 && bookId.value) {
      const confirmed = await showConfirmDialog({
        title: '付费章节',
        message: '该章节需要购买后阅读，是否前往订单确认页？'
      }).then(() => true).catch(() => false)
      if (confirmed) {
        router.push({
          path: `/pay/${chapterId}`,
          query: { bookId: bookId.value, title: chapterTitle.value }
        })
      }
    }
  } finally {
    chapterLoading.value = false
  }
  window.scrollTo({ top: 0, behavior: 'auto' })
  if (save) persistProgress()
}

const onTouchStart = (event) => {
  touchStartX = event.changedTouches[0].clientX
  touchStartY = event.changedTouches[0].clientY
}

const onTouchEnd = (event) => {
  const deltaX = event.changedTouches[0].clientX - touchStartX
  const deltaY = event.changedTouches[0].clientY - touchStartY
  if (Math.abs(deltaX) > 70 && Math.abs(deltaX) > Math.abs(deltaY)) {
    goToChapter(deltaX < 0 ? 1 : -1)
  } else if (Math.abs(deltaY) > 100 && deltaY < 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 60) {
    goToChapter(1)
  } else if (Math.abs(deltaY) > 100 && deltaY > 0 && window.scrollY <= 0) {
    goToChapter(-1)
  }
}

onMounted(async () => {
  if (bookId.value) {
    try {
      const { data } = await getChapterList(bookId.value)
      const payload = data?.data || data
      chapters.value = Array.isArray(payload) ? payload : payload?.list || []
    } catch (error) {
      // The request interceptor reports the backend error.
    }
  }
  const resumeChapterId = await restoreProgress(route.params.id)
  if (String(resumeChapterId) !== String(route.params.id)) {
    await router.replace(chapterRoute(resumeChapterId))
  }
  const shouldResume = route.query.resume === '1'
  await loadChapter(resumeChapterId, { save: !shouldResume })
  if (shouldResume) {
    await restorePosition()
    persistProgress()
  }
  initializing = false
  window.addEventListener('scroll', persistProgress, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', persistProgress)
  window.clearTimeout(saveTimer)
  let payload
  try {
    payload = JSON.parse(localStorage.getItem(progressKey()) || 'null')
  } catch (error) {
    localStorage.removeItem(progressKey())
  }
  if (payload?.bookId && appStore.user.token) {
    const documentHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
    saveReadingProgress({
      bookId: Number(payload.bookId),
      chapterId: Number(payload.chapterId),
      progress: payload.progress ?? Math.min(100, Math.round((payload.position / documentHeight) * 100))
    }).catch(() => {})
  }
})

watch(() => route.params.id, (id) => {
  if (initializing) return
  if (skipRouteLoad) {
    skipRouteLoad = false
    return
  }
  if (id && String(id) !== String(currentChapterId.value)) loadChapter(id)
}, { flush: 'sync' })
</script>

<style scoped lang="less">
.reader-page {
  min-height: 100vh;
  transition: background .25s ease;
  color: #222;
}
.reader-header {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 52px;
  padding: 0 16px;
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(8px);
  .title {
    flex: 1;
    font-size: 15px;
    font-weight: 600;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.reader-content {
  min-height: calc(100vh - 120px);
  padding: 18px 18px 80px;
}
.content-wrap {
  max-width: 480px;
  margin: 0 auto;
}
.article {
  margin-top: 16px;
  white-space: pre-line;
  word-break: break-word;
}
.chapter-loading,
.chapter-empty {
  margin-top: 28px;
  text-align: center;
  color: #999;
}
.reader-toolbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 14px 16px calc(14px + env(safe-area-inset-bottom));
  background: rgba(255,255,255,0.95);
  border-top: 1px solid #eee;
  box-shadow: 0 -5px 15px rgba(0,0,0,0.04);
}
.reader-page.night .reader-header,
.reader-page.night .reader-toolbar {
  background: rgba(26, 26, 26, 0.96);
  border-color: #333;
  color: #ddd;
}
.reader-page.night .toolbar-row button {
  background: #2a2a2a;
  border-color: #414141;
  color: #ddd;
}
.toolbar-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  button {
    flex: 1;
    height: 34px;
    border: 1px solid #f0f0f0;
    background: #fff;
    border-radius: 10px;
    font-size: 13px;
    color: #333;
  }
}
.catalog-panel {
  padding: 18px 14px;
  .catalog-header {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 10px;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    li {
      padding: 12px 0;
      border-bottom: 1px solid #f3f3f3;
      font-size: 14px;
    }
  }
}
</style>
