<template>
  <div class="page shelf-page">
    <NavBar title="我的书架" />
    <van-pull-refresh v-model="refreshing" @refresh="loadShelf">
      <div class="shelf-wrap" v-if="books.length">
        <div class="shelf-item" v-for="book in books" :key="book.id" @click="openBook(book)">
          <BookCard :book="book" />
          <p class="progress-label">
            {{ book.lastChapterTitle || (book.progress != null ? `阅读进度 ${book.progress}%` : '尚无阅读记录') }}
          </p>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>{{ appStore.user.token ? '书架为空' : '登录后同步你的书架' }}</p>
        <van-button v-if="!appStore.user.token" type="primary" round @click="$router.push('/login')">去登录</van-button>
      </div>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import NavBar from '../../components/NavBar.vue'
import { getShelfBooks } from '../../api/user'
import { getBookDetail } from '../../api/book'
import { getChapterList, getReadingHistory } from '../../api/chapter'
import { useAppStore } from '../../store'
import BookCard from '../../components/BookCard.vue'

const books = ref([])
const refreshing = ref(false)
const router = useRouter()
const appStore = useAppStore()

const mergeFavorites = (source) => {
  let favorites = []
  try {
    favorites = JSON.parse(localStorage.getItem('favorite-books') || '[]')
  } catch (error) {
    localStorage.removeItem('favorite-books')
  }
  const ids = new Set(source.map((book) => String(book.id)))
  return [...source, ...favorites.filter((book) => !ids.has(String(book.id)))]
}

const openBook = (book) => {
  let savedProgress
  try {
    savedProgress = JSON.parse(localStorage.getItem(`reader-progress:${book.id}`) || 'null')
  } catch (error) {
    localStorage.removeItem(`reader-progress:${book.id}`)
  }
  const chapterId = savedProgress?.chapterId || book.lastChapterId || book.firstChapterId
  if (!chapterId) {
    showToast('该书暂无可阅读章节')
    return
  }
  router.push({
    path: `/reader/${chapterId}`,
    query: { bookId: book.id, resume: '1' }
  })
}

const loadShelf = async () => {
  if (!appStore.user.token) {
    books.value = mergeFavorites([]).map(withLocalProgress)
    refreshing.value = false
    return
  }
  try {
    const [shelfResponse, historyResponse] = await Promise.all([
      getShelfBooks(),
      getReadingHistory().catch(() => ({ data: { data: [] } }))
    ])
    const favoritesPayload = shelfResponse.data?.data || shelfResponse.data
    const historyPayload = historyResponse.data?.data || historyResponse.data
    const favorites = Array.isArray(favoritesPayload) ? favoritesPayload : favoritesPayload?.items || favoritesPayload?.list || []
    const history = Array.isArray(historyPayload) ? historyPayload : historyPayload?.items || historyPayload?.list || []
    const details = await Promise.all(favorites.map(async (favorite) => {
      const bookId = favorite.bookId || favorite.id
      const reading = history.find((record) => String(record.bookId || record.book_id) === String(bookId))
      try {
        const [{ data: detailResponse }, { data: chapterResponse }] = await Promise.all([
          getBookDetail(bookId),
          getChapterList(bookId)
        ])
        const book = detailResponse?.data || detailResponse
        const chapterPayload = chapterResponse?.data || chapterResponse
        const firstChapterId = favorite.firstChapterId
          || (Array.isArray(chapterPayload) ? chapterPayload[0]?.id : chapterPayload?.items?.[0]?.id)
        return {
          ...book,
          id: bookId,
          name: book.name || book.title,
          cover: book.cover || book.coverUrl,
          firstChapterId,
          lastChapterId: reading?.chapterId || reading?.chapter_id || favorite.lastChapterId,
          lastChapterTitle: reading?.chapterTitle || reading?.chapter_title,
          progress: reading?.progress
        }
      } catch (error) {
        return {
          id: bookId,
          firstChapterId: favorite.firstChapterId,
          lastChapterId: reading?.chapterId || reading?.chapter_id,
          lastChapterTitle: reading?.chapterTitle || reading?.chapter_title,
          progress: reading?.progress
        }
      }
    }))
    books.value = mergeFavorites(details).map(withLocalProgress)
  } catch (error) {
    books.value = mergeFavorites([]).map(withLocalProgress)
  } finally {
    refreshing.value = false
  }
}

onMounted(loadShelf)

const withLocalProgress = (book) => {
  try {
    const saved = JSON.parse(localStorage.getItem(`reader-progress:${book.id}`) || 'null')
    if (!saved) return book
    return {
      ...book,
      lastChapterId: book.lastChapterId || saved.chapterId,
      progress: book.progress ?? saved.progress
    }
  } catch (error) {
    localStorage.removeItem(`reader-progress:${book.id}`)
    return book
  }
}
</script>

<style scoped lang="less">
.shelf-page {
  background: #fff;
}
.shelf-wrap {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px 12px;
  padding: 16px 12px 30px;
}
.shelf-item {
  min-width: 0;
  :deep(.book-card),
  :deep(.cover-wrap) { width: 100%; }
  :deep(.cover-wrap) { height: auto; aspect-ratio: 100 / 138; }
  .progress-label {
    margin: 6px 0 0;
    color: #8a8a8a;
    font-size: 11px;
  }
}
</style>
