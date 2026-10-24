<template>
  <div class="page book-list-page">
    <NavBar :title="title" />
    <van-pull-refresh v-model="refreshing" @refresh="refreshBooks">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        :immediate-check="false"
        :finished-text="books.length ? '没有更多了' : ''"
        @load="loadBooks"
      >
        <BookList
          :books="books"
          :loading="loading && !books.length"
          empty-text="该分类暂无书籍"
          @select="openBook"
        />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import BookList from '../../components/BookList.vue'
import { getBooksByCategory, getCategoryList } from '../../api/book'

const route = useRoute()
const router = useRouter()
const books = ref([])
const categories = ref([])
const page = ref(0)
const pageSize = 12
const loading = ref(false)
const refreshing = ref(false)
const finished = ref(false)

const categoryId = computed(() => route.params.categoryId || route.query.categoryId || '')
const title = computed(() => {
  const fallback = typeof route.query.name === 'string' ? route.query.name : ''
  if (fallback) return fallback
  const matched = categories.value.find((item) => String(item.id) === String(categoryId.value))
  return matched?.name || '全部书籍'
})

const loadCategories = async () => {
  if (!categoryId.value || route.query.name) return
  try {
    const { data } = await getCategoryList()
    const payload = data?.data || data
    if (Array.isArray(payload)) categories.value = payload
  } catch (error) {
    categories.value = []
  }
}

const loadBooks = async () => {
  if (loading.value || finished.value) return
  loading.value = true
  const nextPage = page.value + 1
  try {
    const { data } = await getBooksByCategory(categoryId.value || undefined, nextPage, pageSize)
    const payload = data?.data || data
    const items = Array.isArray(payload) ? payload : payload?.items || payload?.list || []
    books.value = nextPage === 1 ? items : [...books.value, ...items]
    page.value = nextPage
    finished.value = items.length < pageSize || payload?.hasMore === false
  } catch (error) {
    finished.value = false
  } finally {
    loading.value = false
  }
}

const refreshBooks = async () => {
  page.value = 0
  books.value = []
  finished.value = false
  await loadBooks()
  refreshing.value = false
}

const openBook = (book) => {
  router.push(`/book-detail/${book.id}`)
}

onMounted(async () => {
  await loadCategories()
  loadBooks()
})
</script>

<style scoped lang="less">
.book-list-page {
  background: #fff;
}
@media (min-width: 768px) {
  .book-list-page :deep(.book-list) {
    max-width: 880px;
    margin: 0 auto;
  }
}
</style>
