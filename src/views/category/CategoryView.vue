<template>
  <div class="page category-page">
    <NavBar title="分类" />
    <div class="category-wrap">
      <div class="left-nav">
        <div
          v-for="item in categories"
          :key="item.id"
          :class="['nav-item', { active: activeId === item.id }]"
          @click="selectCategory(item.id)"
        >
          {{ item.name }}
        </div>
      </div>
      <van-pull-refresh v-model="refreshing" class="right-panel" @refresh="refreshBooks">
        <van-list v-model:loading="loading" :finished="finished" :immediate-check="false" finished-text="没有更多了" @load="loadBooks">
          <div v-if="books.length" class="book-grid">
            <BookCard v-for="book in books" :key="book.id" :book="book" @click="$router.push(`/book-detail/${book.id}`)" />
          </div>
          <div v-else-if="finished" class="empty-state">暂无书籍</div>
        </van-list>
      </van-pull-refresh>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import BookCard from '../../components/BookCard.vue'
import { getCategoryList, getBooksByCategory } from '../../api/book'

const route = useRoute()
const categories = ref([])
const activeId = ref(null)
const books = ref([])
const page = ref(0)
const pageSize = 12
const loading = ref(false)
const refreshing = ref(false)
const finished = ref(false)

const loadCategories = async () => {
  try {
    const { data } = await getCategoryList()
    const payload = data?.data || data
    categories.value = Array.isArray(payload) && payload.length ? payload : [
      { id: 1, name: '男生' },
      { id: 2, name: '女生' },
      { id: 3, name: '都市' },
      { id: 4, name: '奇幻' }
    ]
  } catch (error) {
    categories.value = [
      { id: 1, name: '男生' },
      { id: 2, name: '女生' },
      { id: 3, name: '都市' },
      { id: 4, name: '奇幻' }
    ]
  }
  const requestedId = categories.value.find((item) => String(item.id) === String(route.query.categoryId))?.id
  activeId.value = requestedId ?? categories.value[0]?.id
}

const loadBooks = async () => {
  if (loading.value || finished.value || !activeId.value) return
  loading.value = true
  const nextPage = page.value + 1
  try {
    const { data } = await getBooksByCategory(activeId.value, nextPage, pageSize)
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

const selectCategory = (id) => {
  if (activeId.value === id) return
  activeId.value = id
  page.value = 0
  books.value = []
  finished.value = false
  loadBooks()
}

const refreshBooks = async () => {
  page.value = 0
  books.value = []
  finished.value = false
  await loadBooks()
  refreshing.value = false
}

onMounted(async () => {
  await loadCategories()
  loadBooks()
})
</script>

<style scoped lang="less">
.category-page {
  background: #fff;
}
.category-wrap {
  display: flex;
  min-height: calc(100vh - 52px);
}
.left-nav {
  width: 90px;
  background: #f8f8f8;
  border-right: 1px solid #eeeeee;
  .nav-item {
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #555;
    &.active {
      background: #fff;
      color: var(--primary-color);
      font-weight: 600;
      position: relative;
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 10px;
        bottom: 10px;
        width: 3px;
        background: var(--primary-color);
        border-radius: 3px;
      }
    }
  }
}
.right-panel {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}
.book-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 10px;
}
</style>
