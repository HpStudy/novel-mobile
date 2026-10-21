<template>
  <div class="page orders-page">
    <NavBar title="我的订单" />
    <van-pull-refresh v-model="refreshing" @refresh="loadOrders">
      <van-list v-model:loading="loadingMore" :finished="finished" :immediate-check="false" finished-text="没有更多了" @load="loadMore">
        <div v-if="visibleOrders.length" class="order-list">
          <div v-for="order in visibleOrders" :key="order.id || order.orderId" class="order-item">
            <div class="order-heading">
              <strong>{{ order.bookName || order.title || '章节订单' }}</strong>
              <span>{{ statusText(order.status, order.statusText) }}</span>
            </div>
            <p>{{ order.chapterTitle || '小说章节' }}</p>
            <div class="order-footer">
              <span>订单号 {{ order.orderNo || order.orderId || order.id }}</span>
              <strong>¥ {{ order.amount ?? order.price ?? '0.00' }}</strong>
            </div>
          </div>
        </div>
        <div v-else-if="!initialLoading" class="empty-state">
          <p>{{ appStore.user.token ? '暂无订单' : '登录后查看你的订单' }}</p>
          <van-button v-if="!appStore.user.token" type="primary" round @click="$router.push('/login')">去登录</van-button>
        </div>
        <van-loading v-if="initialLoading" class="loading-state" size="24">加载中...</van-loading>
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { showFailToast } from 'vant'
import { getOrders } from '../../api/order'
import { getBookDetail } from '../../api/book'
import { getChapterList } from '../../api/chapter'
import NavBar from '../../components/NavBar.vue'
import { useAppStore } from '../../store'

const orders = ref([])
const appStore = useAppStore()
const refreshing = ref(false)
const loadingMore = ref(false)
const initialLoading = ref(true)
const visibleCount = ref(12)
const pageSize = 12
const finished = ref(false)
const visibleOrders = computed(() => orders.value.slice(0, visibleCount.value))

const statusText = (status, label) => {
  if (label) return label
  const labels = {
    0: '待支付',
    1: '已完成'
  }
  return labels[status] || '状态未知'
}

const enrichOrders = async (items) => {
  const bookIds = [...new Set(items.map((order) => String(order.bookId || '')).filter(Boolean))]
  const bookMetadata = new Map()
  await Promise.all(bookIds.map(async (bookId) => {
    try {
      const [{ data: bookResponse }, { data: chapterResponse }] = await Promise.all([
        getBookDetail(bookId),
        getChapterList(bookId)
      ])
      const book = bookResponse?.data || bookResponse
      const chaptersPayload = chapterResponse?.data || chapterResponse
      const chapters = Array.isArray(chaptersPayload) ? chaptersPayload : chaptersPayload?.items || chaptersPayload?.list || []
      bookMetadata.set(bookId, { book, chapters })
    } catch (error) {
      bookMetadata.set(bookId, { book: null, chapters: [] })
    }
  }))
  return items.map((order) => {
    const metadata = bookMetadata.get(String(order.bookId || ''))
    const chapter = metadata?.chapters.find((item) => String(item.id) === String(order.targetId))
    return {
      ...order,
      bookName: order.bookName || metadata?.book?.title || metadata?.book?.name,
      chapterTitle: order.chapterTitle || chapter?.title
    }
  })
}

const loadOrders = async () => {
  initialLoading.value = orders.value.length === 0
  if (!appStore.user.token) {
    orders.value = []
    finished.value = true
    initialLoading.value = false
    refreshing.value = false
    return
  }
  try {
    const { data } = await getOrders()
    const payload = data?.data || data
    const items = Array.isArray(payload) ? payload : payload?.items || payload?.list || []
    orders.value = await enrichOrders(items)
    visibleCount.value = pageSize
    finished.value = orders.value.length <= pageSize
  } catch (error) {
    showFailToast('订单加载失败')
  } finally {
    initialLoading.value = false
    refreshing.value = false
  }
}

const loadMore = async () => {
  visibleCount.value = Math.min(visibleCount.value + pageSize, orders.value.length)
  finished.value = visibleCount.value >= orders.value.length
  loadingMore.value = false
}

onMounted(loadOrders)
</script>

<style scoped lang="less">
.orders-page {
  background: #fff;
}
.order-list {
  padding: 12px 16px 24px;
}
.loading-state {
  padding: 28px;
  text-align: center;
}
.order-item {
  padding: 14px 0;
  border-bottom: 1px solid #f1f1f1;
  .order-heading, .order-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .order-heading strong { font-size: 14px; }
  .order-heading span { color: var(--primary-color); font-size: 12px; }
  p { margin: 10px 0; color: #666; font-size: 13px; }
  .order-footer span { color: #999; font-size: 11px; }
  .order-footer strong { color: var(--primary-color); font-size: 14px; }
}
</style>
