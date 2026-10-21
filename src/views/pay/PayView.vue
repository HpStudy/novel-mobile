<template>
  <div class="page pay-page">
    <NavBar title="支付确认" />
    <div class="pay-box">
      <div class="title">购买章节</div>
      <div class="summary">
        <span>章节</span>
        <strong>{{ chapterTitle }}</strong>
      </div>
      <div class="summary">
        <span>价格</span>
        <strong>{{ price == null ? '暂不可用' : `¥ ${price}` }}</strong>
      </div>
      <van-button v-if="!appStore.user.token" type="primary" block round @click="loginToBuy">登录后购买</van-button>
      <button v-else :disabled="paying || price == null" @click="payNow">{{ paying ? '处理中...' : '创建订单' }}</button>
      <p v-if="price == null" class="order-notice">暂时无法获取章节价格，请稍后重试。</p>
      <p v-if="orderNo" class="order-notice">订单 {{ orderNo }} 已创建。此后端暂未接入实际支付通道。</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import { createOrder } from '../../api/order'
import { getBookDetail } from '../../api/book'
import { useAppStore } from '../../store'

const props = defineProps({ id: { type: String, required: true } })
const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const chapterTitle = computed(() => route.query.title || `章节 ${props.id}`)
const queryPrice = Number(route.query.price)
const price = ref(route.query.price != null && Number.isFinite(queryPrice) ? queryPrice : null)
const paying = ref(false)
const orderNo = ref('')

const loginToBuy = () => {
  router.push({ path: '/login', query: { redirect: route.fullPath } })
}

onMounted(async () => {
  if (!route.query.bookId || price.value != null) return
  try {
    const { data } = await getBookDetail(route.query.bookId)
    const book = data?.data || data
    if (book?.pricePerChapter != null && Number.isFinite(Number(book.pricePerChapter))) {
      price.value = Number(book.pricePerChapter)
    }
  } catch (error) {
    // Keep the default chapter price if book metadata is unavailable.
  }
})

const payNow = async () => {
  if (!route.query.bookId) return
  if (price.value == null) return
  if (paying.value) return
  paying.value = true
  try {
    const { data } = await createOrder({
      type: 1,
      targetId: Number(props.id),
      bookId: Number(route.query.bookId),
      amount: price.value
    })
    const payload = data?.data || data
    orderNo.value = payload?.orderNo || String(payload?.id || '')
  } catch (error) {
    // The shared request layer displays the server/network error.
  } finally {
    paying.value = false
  }
}
</script>

<style scoped lang="less">
.pay-page {
  background: #fff;
}
.pay-box {
  margin: 24px 16px;
  padding: 18px 16px;
  border-radius: 16px;
  background: #fff8f4;
  border: 1px solid #ffe3da;
  .title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
  }
  .summary {
    display: flex;
    justify-content: space-between;
    margin-top: 12px;
    color: #6f6f6f;
    strong { color: #1d1d1d; }
  }
  .order-notice {
    color: #8a6c5d;
    font-size: 12px;
    line-height: 1.6;
  }
  button {
    width: 100%;
    margin-top: 20px;
    height: 44px;
    border: none;
    background: linear-gradient(135deg, var(--primary-color), var(--primary-orange));
    color: #fff;
    border-radius: 12px;
  }
}
</style>
