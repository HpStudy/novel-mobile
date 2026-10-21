<template>
  <div class="page detail-page">
    <NavBar :title="book.name || '书籍详情'" />
    <div class="detail-header">
      <div class="cover-wrap">
        <img v-if="book.cover || book.coverUrl" :src="book.cover || book.coverUrl" :alt="book.name || book.title" />
        <div v-else class="cover-placeholder" aria-hidden="true">书</div>
      </div>
      <div class="meta">
        <h2>{{ book.name || book.title || (bookLoading ? '加载中...' : '书籍详情') }}</h2>
        <div class="row"><span>作者</span><strong>{{ book.author || '暂无' }}</strong></div>
        <div class="row"><span>评分</span><strong>{{ book.score ? `${book.score} 分` : '暂无' }}</strong></div>
        <div class="row"><span>字数</span><strong>{{ book.words || (book.wordCount ? (Number(book.wordCount) >= 10000 ? `${Math.round(Number(book.wordCount) / 10000)}万字` : `${Number(book.wordCount)}字`) : '暂无') }}</strong></div>
        <div class="row"><span>状态</span><strong>{{ book.status === 1 ? '连载中' : book.status === 2 ? '已完结' : book.status || '暂无' }}</strong></div>
      </div>
    </div>

    <div class="action-row">
      <button class="ghost" @click="toggleCollect">{{ collected ? '已收藏' : '收藏' }}</button>
      <button class="primary" @click="startRead">开始阅读</button>
    </div>

    <div class="section">
      <div class="section-head">简介</div>
      <p :class="['intro', { expanded }]">{{ book.description || book.summary || '暂无简介' }}</p>
      <div v-if="(book.description || book.summary || '').length > 80" class="toggle-text" @click="expanded = !expanded">{{ expanded ? '收起' : '展开' }}</div>
    </div>

    <div class="section chapter-section">
      <div class="section-head">章节列表</div>
      <van-loading v-if="chaptersLoading" size="20">加载中...</van-loading>
      <ul>
        <li v-for="chapter in chapters" :key="chapter.id" @click="openChapter(chapter)">
          <span>{{ chapter.title || chapter.name }}</span>
          <em>{{ chapter.isVip || chapter.is_vip || chapter.isFree === 0 ? 'VIP' : '免费' }}</em>
        </li>
      </ul>
      <div v-if="!chaptersLoading && !chapters.length" class="empty-state">暂无章节</div>
    </div>

    <div class="section comments">
      <div class="section-head">评论</div>
      <van-loading v-if="commentsLoading" size="20">加载中...</van-loading>
      <template v-else>
        <div v-if="!comments.length" class="empty-state">暂无评论</div>
        <div v-else class="comment-item" v-for="comment in comments" :key="comment.id">
          <div class="avatar">{{ (comment.user || '书').slice(0,1) }}</div>
          <div class="comment-body">
            <div class="name-row"><strong>{{ comment.user }}</strong><span>{{ comment.time }}</span></div>
            <p>{{ comment.content }}</p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import { getBookComments, getBookDetail } from '../../api/book'
import { getChapterList } from '../../api/chapter'
import { addFavorite, checkFavorite, removeFavorite } from '../../api/user'
import { useAppStore } from '../../store'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const book = ref({})
const chapters = ref([])
const comments = ref([])
const collected = ref(false)
const expanded = ref(false)
const bookLoading = ref(true)
const chaptersLoading = ref(true)
const commentsLoading = ref(true)

const toggleCollect = async () => {
  const nextState = !collected.value
  if (appStore.user.token) {
    try {
      if (nextState) await addFavorite(route.params.id)
      else await removeFavorite(route.params.id)
    } catch (error) {
      return
    }
  }
  collected.value = nextState
  let favorites = []
  try {
    favorites = JSON.parse(localStorage.getItem('favorite-books') || '[]')
  } catch (error) {
    localStorage.removeItem('favorite-books')
  }
  const bookId = String(route.params.id)
  favorites = favorites.filter((item) => String(item.id) !== bookId)
  if (collected.value) favorites.unshift({
    ...book.value,
    id: route.params.id,
    firstChapterId: chapters.value[0]?.id
  })
  localStorage.setItem('favorite-books', JSON.stringify(favorites))
}

const openChapter = (chapter) => {
  if (chapter.isVip || chapter.is_vip || chapter.vip || chapter.isFree === 0) {
    router.push({
      path: `/pay/${chapter.id}`,
      query: {
        bookId: route.params.id,
        title: chapter.title,
        price: book.value.pricePerChapter
      }
    })
    return
  }
  router.push({ path: `/reader/${chapter.id}`, query: { bookId: route.params.id } })
}

const startRead = () => {
  const firstChapter = chapters.value[0]
  if (firstChapter) {
    if (firstChapter.isVip || firstChapter.is_vip || firstChapter.vip || firstChapter.isFree === 0) {
      router.push({
        path: `/pay/${firstChapter.id}`,
        query: {
          bookId: route.params.id,
          title: firstChapter.title,
          price: book.value.pricePerChapter
        }
      })
      return
    }
    router.push({ path: `/reader/${firstChapter.id}`, query: { bookId: route.params.id, resume: '1' } })
  }
}

onMounted(async () => {
  const id = route.params.id
  if (appStore.user.token) {
    try {
      const { data } = await checkFavorite(id)
      collected.value = Boolean((data?.data || data)?.isFavorite)
    } catch (error) {
      // Keep the locally stored favorite state if the user API is unavailable.
    }
  } else {
    try {
    const favorites = JSON.parse(localStorage.getItem('favorite-books') || '[]')
    collected.value = favorites.some((item) => String(item.id) === String(id))
    } catch (error) {
      localStorage.removeItem('favorite-books')
    }
  }
  try {
    const { data } = await getBookDetail(id)
    const payload = data?.data || data || {}
    book.value = {
      ...payload,
      name: payload.name || payload.title,
      cover: payload.cover || payload.coverUrl
    }
  } catch (error) {
    book.value = {}
  } finally {
    bookLoading.value = false
  }
  try {
    const chapterRes = await getChapterList(id)
    const payload = chapterRes.data?.data || chapterRes.data
    chapters.value = Array.isArray(payload) ? payload : payload?.items || payload?.list || []
  } catch (error) {
    chapters.value = []
  } finally {
    chaptersLoading.value = false
  }
  try {
    const { data } = await getBookComments(id)
    const payload = data?.data || data
    const items = Array.isArray(payload) ? payload : payload?.items || []
    if (items.length) {
      comments.value = items.map((comment) => ({
        ...comment,
        user: comment.user?.nickname || comment.nickname || '书友',
        time: comment.createdAt ? new Date(comment.createdAt).toLocaleString() : '最近',
        content: comment.content || ''
      }))
    } else comments.value = []
  } catch (error) {
    comments.value = []
  } finally {
    commentsLoading.value = false
  }
})
</script>

<style scoped lang="less">
.detail-page {
  background: #fff;
}
.detail-header {
  display: flex;
  gap: 16px;
  padding: 18px 16px;
  background: #fff;
  border-bottom: 1px solid #f2f2f2;
}
.cover-wrap {
  width: 110px;
  height: 150px;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(145deg, #ffe1d2, #f3b49d);
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .cover-placeholder {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    color: #fff;
    font-size: 28px;
  }
}
.meta {
  flex: 1;
  h2 { margin: 0 0 10px; font-size: 20px; }
  .row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    margin-top: 6px;
    color: #666;
    strong { color: #222; font-weight: 500; }
  }
}
.action-row {
  display: flex;
  gap: 12px;
  padding: 16px;
  button {
    flex: 1;
    height: 44px;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    cursor: pointer;
  }
  .ghost {
    background: #fff0ee;
    color: var(--primary-color);
  }
  .primary {
    background: linear-gradient(135deg, var(--primary-color), var(--primary-orange));
    color: #fff;
  }
}
.section {
  padding: 16px;
  border-top: 1px solid #f3f3f3;
}
.section-head {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 10px;
}
.intro {
  margin: 0;
  color: #666;
  line-height: 1.8;
  &.expanded { display: block; }
  &:not(.expanded) {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
.toggle-text {
  margin-top: 8px;
  color: var(--primary-color);
  font-size: 13px;
}
.chapter-section {
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #f1f1f1;
    color: #333;
    font-size: 14px;
    em {
      font-style: normal;
      color: #ff9d47;
      font-size: 12px;
    }
  }
}
.comments {
  .comment-item {
    display: flex;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid #f4f4f4;
  }
  .avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #ffefe5;
    color: var(--primary-color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
  }
  .comment-body {
    flex: 1;
    .name-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 12px;
      color: #888;
      strong { color: #333; }
    }
    p {
      margin: 0;
      color: #666;
      line-height: 1.7;
      font-size: 13px;
    }
  }
}
</style>
