<template>
  <van-pull-refresh v-model="refreshing" class="page home-page" @refresh="refreshHome">
    <div class="header safe-area">
      <div class="search-box" @click="$router.push('/search')">
        <van-icon name="search" />
        <span>搜索小说、作者</span>
      </div>
    </div>

    <div class="banner-box">
      <van-swipe v-if="banners.length" class="my-swipe" :autoplay="3000" indicator-color="#E6432D">
        <van-swipe-item v-for="banner in banners" :key="banner.id" @click="openBanner(banner)">
          <img :src="banner.image || banner.imageUrl" :alt="banner.title || '推荐内容'" />
        </van-swipe-item>
      </van-swipe>
      <div v-else class="banner-placeholder">发现下一本好书</div>
    </div>

    <div class="category-strip">
      <div class="category-item" v-for="(item, index) in categories" :key="item.id || index" @click="$router.push('/category')">
        <div class="icon-wrap">{{ item.icon || categoryIcons[index % categoryIcons.length] }}</div>
        <span>{{ item.name }}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <h3>热门推荐</h3>
      </div>
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadRecommend">
        <div class="book-list">
          <BookCard v-for="book in recommendBooks" :key="book.id" :book="book" @click="$router.push(`/book-detail/${book.id}`)" />
        </div>
        <div v-if="loading" class="loading-row"><van-loading size="20" /> <span>加载中...</span></div>
      </van-list>
    </div>

    <div class="section">
      <div class="section-head">
        <h3>新书上架</h3>
      </div>
      <van-list
        v-model:loading="newLoading"
        :finished="newFinished"
        finished-text="没有更多了"
        @load="loadNewBooks"
      >
        <div class="book-list">
          <BookCard v-for="book in newBooks" :key="book.id" :book="book" @click="$router.push(`/book-detail/${book.id}`)" />
        </div>
        <div v-if="newLoading" class="loading-row"><van-loading size="20" /> <span>加载中...</span></div>
        <div v-if="!newLoading && newFinished && !newBooks.length" class="empty-state">暂无新书</div>
      </van-list>
    </div>
  </van-pull-refresh>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getBannerList, getCategoryList, getRecommendBooks, getNewBooks } from '../../api/book'
import BookCard from '../../components/BookCard.vue'

const router = useRouter()
const banners = ref([])
const categories = ref([
  { name: '男生', icon: '♂' }, { name: '女生', icon: '♀' }, { name: '都市', icon: '城' }, { name: '奇幻', icon: '幻' },
  { name: '历史', icon: '史' }, { name: '科幻', icon: '科' }, { name: '悬疑', icon: '谜' }, { name: '更多', icon: '…' }
])
const categoryIcons = ['♂', '♀', '城', '幻', '史', '科', '谜', '…']
const recommendBooks = ref([])
const newBooks = ref([])
const newLoading = ref(false)
const newFinished = ref(false)
const loading = ref(false)
const refreshing = ref(false)
const finished = ref(false)
const page = ref(0)
const newPage = ref(0)
const pageSize = 8

const openBanner = (banner) => {
  const target = String(banner.linkTarget || '').trim()
  if (!target) return
  if (Number(banner.linkType) === 1) {
    router.push(`/book-detail/${encodeURIComponent(target)}`)
  } else if (Number(banner.linkType) === 2) {
    router.push({ path: '/category', query: { categoryId: target } })
  } else if (Number(banner.linkType) === 3) {
    try {
      const url = new URL(target)
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        window.open(url.toString(), '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      // Ignore malformed external banner links.
    }
  }
}

const loadBanner = async () => {
  try {
    const { data } = await getBannerList()
    const payload = data?.data || data
    if (Array.isArray(payload)) banners.value = payload
  } catch (error) {
    banners.value = []
  }
}

const loadCategories = async () => {
  try {
    const { data } = await getCategoryList()
    const payload = data?.data || data
    if (Array.isArray(payload) && payload.length) categories.value = payload
  } catch (error) {
    categories.value = [
      { name: '男生', icon: '♂' }, { name: '女生', icon: '♀' }, { name: '都市', icon: '城' }, { name: '奇幻', icon: '幻' },
      { name: '历史', icon: '史' }, { name: '科幻', icon: '科' }, { name: '悬疑', icon: '谜' }, { name: '更多', icon: '…' }
    ]
  }
}

const loadRecommend = async () => {
  if (loading.value || finished.value) return
  loading.value = true
  const nextPage = page.value + 1
  try {
    const { data } = await getRecommendBooks(nextPage, pageSize)
    const payload = data?.data || data
    const books = Array.isArray(payload) ? payload : payload?.items || payload?.list || []
    recommendBooks.value = nextPage === 1 ? books : [...recommendBooks.value, ...books]
    page.value = nextPage
    finished.value = books.length < pageSize || payload?.hasMore === false
  } catch (error) {
    finished.value = false
  } finally {
    loading.value = false
  }
}

const refreshHome = async () => {
  page.value = 0
  finished.value = false
  recommendBooks.value = []
  newPage.value = 0
  newFinished.value = false
  newBooks.value = []
  await Promise.all([loadBanner(), loadRecommend(), loadNewBooks()])
  refreshing.value = false
}

const loadNewBooks = async () => {
  if (newLoading.value || newFinished.value) return
  newLoading.value = true
  const nextPage = newPage.value + 1
  try {
    const { data } = await getNewBooks(nextPage, pageSize)
    const payload = data?.data || data
    const books = Array.isArray(payload) ? payload : payload?.items || payload?.list || []
    newBooks.value = nextPage === 1 ? books : [...newBooks.value, ...books]
    newPage.value = nextPage
    newFinished.value = books.length < pageSize || payload?.hasMore === false
  } catch (error) {
    newFinished.value = false
  } finally {
    newLoading.value = false
  }
}

onMounted(() => {
  loadBanner()
  loadCategories()
  loadRecommend()
  loadNewBooks()
})
</script>

<style scoped lang="less">
.home-page {
  padding-bottom: 24px;
  min-height: 100vh;
}
.header {
  padding: 14px 16px 10px;
  background: #fff;
}
.search-box {
  height: 42px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f5f5f5;
  border-radius: 21px;
  padding: 0 14px;
  color: #8a8a8a;
  font-size: 14px;
}
.banner-box {
  padding: 0 12px 12px;
  .my-swipe {
    border-radius: 16px;
    overflow: hidden;
    height: 150px;
    position: relative;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  .banner-placeholder {
    height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    background: linear-gradient(125deg, #ffb58f, #e6432d);
    color: #fff;
    font-size: 20px;
    font-weight: 600;
  }
}
.category-strip {
  display: flex;
  overflow-x: auto;
  padding: 0 12px 10px;
  gap: 16px;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}
.category-item {
  width: 54px;
  min-width: 54px;
  text-align: center;
  color: #333;
  .icon-wrap {
    width: 42px;
    height: 42px;
    margin: 0 auto 6px;
    border-radius: 50%;
    background: linear-gradient(135deg, #ffb066, #f45c43);
    color: #fff;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  span {
    display: block;
    font-size: 12px;
  }
}
.section {
  margin-top: 8px;
  background: #fff;
  padding: 16px 12px;
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    h3 {
      margin: 0;
      font-size: 18px;
      color: #1e1e1e;
    }
  }
}
.book-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 10px;
  padding-bottom: 6px;
  :deep(.book-card),
  :deep(.cover-wrap) {
    width: 100%;
  }
  :deep(.cover-wrap) {
    height: auto;
    aspect-ratio: 100 / 138;
  }
}
.loading-row {
  margin-top: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  color: #999;
  font-size: 12px;
}
</style>
