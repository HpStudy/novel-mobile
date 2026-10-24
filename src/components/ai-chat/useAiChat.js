import { computed, onBeforeUnmount, ref } from 'vue'
import { showFailToast, showToast } from 'vant'
import {
  closeSession as closeAiSession,
  createSession,
  feedback,
  getMessages,
  getSession,
  sendMessage,
  transferSession
} from '../../api/ai'

const SESSION_KEY = 'ai_last_session_id'
const PAGE_SIZE = 20

const responsePayload = (response) => response?.data?.data ?? response?.data ?? {}
const sessionIdOf = (session) => session?.conversationId ?? session?.id
const getStatus = (session) => Number(session?.status ?? 0)
const getItems = (payload) => Array.isArray(payload)
  ? payload
  : payload?.items || payload?.list || payload?.messages || []

const normalizeMessage = (message) => ({
  ...message,
  role: message.role || 'system',
  content: message.content || '',
  meta: message.meta || {},
  citations: message.citations || message.meta?.citations || [],
  createdAt: message.createdAt || message.created_at || message.time || new Date().toISOString()
})

const sameMessage = (left, right) => (
  (left.id != null && right.id != null && String(left.id) === String(right.id))
  || (left.clientMsgId && right.clientMsgId && left.clientMsgId === right.clientMsgId)
)

const normalizeQuickQuestions = (session) => {
  const source = session?.quickQuestions
    || session?.welcomeMessage?.quickQuestions
    || session?.welcomeMessage?.quick_questions
    || []
  if (!Array.isArray(source)) return []
  return source
    .map((item) => {
      if (typeof item === 'string') return { text: item.trim() }
      const text = item?.text || item?.question || item?.content || ''
      return { text: String(text).trim(), payload: item?.payload ?? item?.value }
    })
    .filter((item) => item.text)
    .slice(0, 6)
}

export const useAiChat = () => {
  const sessionId = ref('')
  const status = ref(0)
  const messages = ref([])
  const input = ref('')
  const loadingSession = ref(false)
  const loadingHistory = ref(false)
  const quickQuestions = ref([])
  const sending = ref(false)
  const transferring = ref(false)
  const errorMessage = ref('')
  const currentPage = ref(1)
  const hasEarlier = ref(false)
  const canSend = computed(() => (
    Boolean(sessionId.value)
    && !sending.value
    && !transferring.value
    && (status.value === 0 || status.value === 2)
  ))
  let pollTimer
  let streamController
  let polling = false
  let disposed = false

  const addSystemMessage = (content, key) => {
    if (!content) return
    if (key && messages.value.some((message) => message.systemKey === key)) return
    messages.value.push({
      localId: `system-${Date.now()}-${Math.random()}`,
      systemKey: key,
      role: 'system',
      content,
      createdAt: new Date().toISOString()
    })
  }

  const mergeMessages = (incoming, { prepend = false } = {}) => {
    const normalized = incoming.map(normalizeMessage)
    if (prepend) {
      const earlier = normalized.filter((message) => !messages.value.some((item) => sameMessage(item, message)))
      messages.value = [...earlier, ...messages.value]
      return
    }
    for (const message of normalized) {
      const index = messages.value.findIndex((item) => sameMessage(item, message))
      if (index >= 0) messages.value[index] = { ...messages.value[index], ...message }
      else messages.value.push(message)
    }
    messages.value.sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
  }

  const fetchMessagePage = async (page) => {
    const payload = responsePayload(await getMessages(sessionId.value, page, PAGE_SIZE))
    const items = getItems(payload)
    const total = Number(payload?.total)
    return {
      items,
      total: Number.isFinite(total) ? total : null,
      page: Number(payload?.page) || page,
      pageSize: Number(payload?.pageSize || payload?.limit) || PAGE_SIZE
    }
  }

  const loadLatestMessages = async () => {
    if (!sessionId.value) return
    loadingHistory.value = true
    try {
      const firstPage = await fetchMessagePage(1)
      const lastPage = firstPage.total == null
        ? firstPage.page
        : Math.max(1, Math.ceil(firstPage.total / firstPage.pageSize))
      const latestPage = lastPage === 1 ? firstPage : await fetchMessagePage(lastPage)
      messages.value = messages.value.filter((message) => message.role === 'system' && message.localId)
      mergeMessages(latestPage.items)
      currentPage.value = lastPage
      hasEarlier.value = lastPage > 1
    } finally {
      loadingHistory.value = false
    }
  }

  const loadEarlierMessages = async () => {
    if (!sessionId.value || loadingHistory.value || !hasEarlier.value) return
    loadingHistory.value = true
    try {
      const page = currentPage.value - 1
      const result = await fetchMessagePage(page)
      mergeMessages(result.items, { prepend: true })
      currentPage.value = page
      hasEarlier.value = page > 1
    } catch (error) {
      showFailToast(error?.message || '历史消息加载失败')
    } finally {
      loadingHistory.value = false
    }
  }

  const applyStatus = (nextStatus) => {
    const next = Number(nextStatus)
    if (!Number.isInteger(next) || next < 0 || next > 3) return
    const previous = status.value
    status.value = next
    if (previous !== next && next === 1) addSystemMessage('已为您转接人工客服，请稍候', 'transferring')
    if (previous !== next && next === 2) addSystemMessage('客服已接管会话', 'agent-joined')
    if (previous !== next && next === 3) addSystemMessage('会话已结束', 'ended')
    updatePolling()
  }

  const pollSession = async () => {
    if (!sessionId.value || polling || disposed || (status.value !== 1 && status.value !== 2)) return
    polling = true
    try {
      const payload = responsePayload(await getSession(sessionId.value))
      const session = payload.session || payload
      applyStatus(session.status)
      if (status.value === 2) await loadLatestMessages()
    } catch (error) {
      if (error?.response?.status !== 401) {
        errorMessage.value = error?.message || '客服状态同步失败'
      }
    } finally {
      polling = false
    }
  }

  const updatePolling = () => {
    window.clearInterval(pollTimer)
    if (status.value === 1 || status.value === 2) {
      pollTimer = window.setInterval(pollSession, 15000)
    }
  }

  const createNewSession = async () => {
    const payload = responsePayload(await createSession())
    const session = payload.session || payload
    const id = sessionIdOf(session)
    if (id == null) throw new Error('客服会话创建响应缺少 conversationId')
    sessionId.value = String(id)
    localStorage.setItem(SESSION_KEY, sessionId.value)
    messages.value = []
    currentPage.value = 1
    hasEarlier.value = false
    quickQuestions.value = normalizeQuickQuestions(session)
    applyStatus(session.status ?? 0)
    if (session.welcomeMessage) {
      const welcome = typeof session.welcomeMessage === 'string'
        ? session.welcomeMessage
        : session.welcomeMessage.content
      addSystemMessage(welcome, 'welcome')
    }
    await loadLatestMessages()
  }

  const openSession = async () => {
    if (loadingSession.value || disposed) return
    if (!localStorage.getItem('token')) return
    loadingSession.value = true
    errorMessage.value = ''
    try {
      const savedId = localStorage.getItem(SESSION_KEY)
      if (savedId) {
        try {
          const payload = responsePayload(await getSession(savedId))
          const session = payload.session || payload
          if (getStatus(session) !== 3) {
            sessionId.value = String(sessionIdOf(session) ?? savedId)
            localStorage.setItem(SESSION_KEY, sessionId.value)
            quickQuestions.value = normalizeQuickQuestions(session)
            applyStatus(session.status)
            await loadLatestMessages()
            return
          }
        } catch (error) {
          if (error?.response?.status !== 404) throw error
        }
        localStorage.removeItem(SESSION_KEY)
      }
      await createNewSession()
    } catch (error) {
      errorMessage.value = error?.message || '客服暂时不可用，请稍后重试'
    } finally {
      loadingSession.value = false
    }
  }

  const executeMessage = async ({ content, clientMsgId, assistantLocalId }) => {
    if (!canSend.value) return
    sending.value = true
    errorMessage.value = ''
    streamController = new AbortController()
    let accumulated = ''
    let lastPaint = 0
    let paintTimer
    const updateAssistant = (patch) => {
      const index = messages.value.findIndex((message) => message.localId === assistantLocalId)
      if (index >= 0) messages.value[index] = { ...messages.value[index], ...patch }
    }
    const flush = () => {
      window.clearTimeout(paintTimer)
      updateAssistant({ content: accumulated })
      lastPaint = Date.now()
      paintTimer = undefined
    }

    try {
      await sendMessage({
        conversationId: /^\d+$/.test(sessionId.value) ? Number(sessionId.value) : sessionId.value,
        content,
        clientMsgId,
        signal: streamController.signal,
        onMessage: (chunk) => {
          accumulated += chunk.content || ''
          const wait = Math.max(0, 30 - (Date.now() - lastPaint))
          if (!paintTimer) paintTimer = window.setTimeout(flush, wait)
        },
        onDone: (result) => {
          flush()
          updateAssistant({
            id: result.messageId,
            content: result.fullContent || accumulated,
            citations: result.citations || [],
            isLoading: false,
            failed: false
          })
        },
        onTransfer: (result) => {
          flush()
          applyStatus(result.status ?? 1)
          if (result.message) addSystemMessage(result.message)
          updateAssistant({ isLoading: false, content: accumulated, failed: false })
        },
        onError: ({ message }) => {
          updateAssistant({ isLoading: false, failed: true, error: message })
        }
      })
      flush()
      updateAssistant({ isLoading: false })
    } catch (error) {
      window.clearTimeout(paintTimer)
      if (error.name !== 'AbortError') {
        updateAssistant({ content: accumulated, isLoading: false, failed: true, error: error.message })
        errorMessage.value = error.message || '消息发送失败'
      }
    } finally {
      sending.value = false
      streamController = undefined
    }
  }

  const send = async (retry) => {
    const content = (retry?.content ?? input.value).trim()
    if (!content) return
    if (content.length > 500) {
      showToast('问题最多输入 500 字')
      return
    }
    if (!canSend.value) return
    let userLocalId = retry?.userLocalId
    let assistantLocalId = retry?.assistantLocalId
    const clientMsgId = retry?.clientMsgId || (globalThis.crypto?.randomUUID?.() ?? `msg-${Date.now()}-${Math.random()}`)
    if (!retry) {
      userLocalId = `user-${clientMsgId}`
      assistantLocalId = `assistant-${clientMsgId}`
      messages.value.push(
        { localId: userLocalId, clientMsgId, role: 'user', content, createdAt: new Date().toISOString() },
        { localId: assistantLocalId, role: 'assistant', content: '', createdAt: new Date().toISOString(), isLoading: true }
      )
      input.value = ''
    } else {
      const assistant = messages.value.find((item) => item.localId === assistantLocalId)
      if (assistant) Object.assign(assistant, { isLoading: true, failed: false, error: '', content: '' })
    }
    await executeMessage({ content, clientMsgId, assistantLocalId })
  }

  const transfer = async () => {
    if (!sessionId.value || status.value !== 0 || transferring.value) return
    transferring.value = true
    errorMessage.value = ''
    try {
      const payload = responsePayload(await transferSession(sessionId.value))
      applyStatus(payload.status ?? 1)
      if (status.value === 0) applyStatus(1)
      await loadLatestMessages()
    } catch (error) {
      errorMessage.value = error?.message || '转人工失败，请稍后重试'
    } finally {
      transferring.value = false
    }
  }

  const endSession = async () => {
    if (!sessionId.value || status.value === 3) return
    await closeAiSession(sessionId.value)
    applyStatus(3)
  }

  const submitFeedback = async (message, rating) => {
    if (!message.id) {
      showToast('该回复暂不支持反馈')
      return
    }
    try {
      await feedback(message.id, rating)
      const index = messages.value.findIndex((item) => item.localId === message.localId)
      if (index >= 0) messages.value[index] = { ...messages.value[index], feedbackRating: rating }
      showToast('感谢反馈')
    } catch (error) {
      showFailToast(error?.message || '反馈提交失败')
    }
  }

  const retry = (message) => {
    const assistantIndex = messages.value.findIndex((item) => item.localId === message.localId)
    const userMessage = messages.value[assistantIndex - 1]
    if (!userMessage || userMessage.role !== 'user') {
      showFailToast('找不到需要重试的问题')
      return
    }
    send({
      content: userMessage.content,
      clientMsgId: userMessage.clientMsgId,
      userLocalId: userMessage.localId,
      assistantLocalId: message.localId
    })
  }

  const dispose = () => {
    disposed = true
    window.clearInterval(pollTimer)
    streamController?.abort()
  }

  onBeforeUnmount(dispose)

  return {
    sessionId,
    status,
    messages,
    input,
    loadingSession,
    loadingHistory,
    quickQuestions,
    sending,
    transferring,
    errorMessage,
    currentPage,
    hasEarlier,
    canSend,
    openSession,
    loadEarlierMessages,
    send,
    retry,
    transfer,
    endSession,
    submitFeedback
  }
}
