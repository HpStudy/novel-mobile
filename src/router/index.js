import { createRouter, createWebHistory } from 'vue-router'

const HomeView = () => import('../views/home/HomeView.vue')
const CategoryView = () => import('../views/category/CategoryView.vue')
const BookDetailView = () => import('../views/book-detail/BookDetailView.vue')
const ReaderView = () => import('../views/reader/ReaderView.vue')
const ShelfView = () => import('../views/shelf/ShelfView.vue')
const ProfileView = () => import('../views/profile/ProfileView.vue')
const SearchView = () => import('../views/search/SearchView.vue')
const LoginView = () => import('../views/login/LoginView.vue')
const PayView = () => import('../views/pay/PayView.vue')
const HistoryView = () => import('../views/history/HistoryView.vue')
const OrdersView = () => import('../views/orders/OrdersView.vue')

const routes = [
  { path: '/', redirect: '/home' },
  { path: '/home', name: 'home', component: HomeView },
  { path: '/category', name: 'category', component: CategoryView },
  { path: '/book-detail/:id', name: 'book-detail', component: BookDetailView, props: true },
  { path: '/reader/:id', name: 'reader', component: ReaderView, props: true },
  { path: '/shelf', name: 'shelf', component: ShelfView },
  { path: '/profile', name: 'profile', component: ProfileView },
  { path: '/search', name: 'search', component: SearchView },
  { path: '/history', name: 'history', component: HistoryView },
  { path: '/orders', name: 'orders', component: OrdersView },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/pay/:id', name: 'pay', component: PayView, props: true }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
