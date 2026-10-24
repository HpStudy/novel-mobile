import request, { handleUnauthorized } from './request'

const basePath = '/ai'

export const createSession = () => request.post(`${basePath}/session`)
export const getSession = (id) => request.get(`${basePath}/session/${encodeURIComponent(id)}`)
export const getMessages = (id, page = 1, pageSize = 20) => request.get(
  `${basePath}/session/${encodeURIComponent(id)}/messages`,
  { params: { page, pageSize } }
)
export const transferSession = (id) => request.post(`${basePath}/session/${encodeURIComponent(id)}/transfer`)
export const closeSession = (id) => request.post(`${basePath}/session/${encodeURIComponent(id)}/close`)
export const feedback = (messageId, rating) => request.post(
  `${basePath}/message/${encodeURIComponent(messageId)}/feedback`,
  { rating }
)

const dispatchEvent = (eventName, data, handlers) => {
  let payload
  try {
    payload = data ? JSON.parse(data) : {}
  } catch (error) {
    throw new Error(`客服流数据格式错误：${error.message}`)
  }

  if (eventName === 'message') handlers.onMessage?.(payload)
  else if (eventName === 'done') handlers.onDone?.(payload)
  else if (eventName === 'transfer') handlers.onTransfer?.(payload)
  else if (eventName === 'error') {
    const error = new Error(payload.message || '客服暂时无法回复，请稍后重试')
    error.code = payload.code
    throw error
  }
}

const parseEventBlock = (block, handlers) => {
  let eventName = 'message'
  const dataLines = []
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) continue
    const separator = line.indexOf(':')
    const field = separator < 0 ? line : line.slice(0, separator)
    const value = separator < 0 ? '' : line.slice(separator + 1).replace(/^ /, '')
    if (field === 'event') eventName = value
    if (field === 'data') dataLines.push(value)
  }
  if (dataLines.length) dispatchEvent(eventName, dataLines.join('\n'), handlers)
}

export const sendMessage = async ({
  conversationId,
  content,
  clientMsgId,
  onMessage,
  onDone,
  onTransfer,
  onError,
  signal
}) => {
  const token = localStorage.getItem('token') || ''
  const response = await fetch(`/api${basePath}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: 'same-origin',
    body: JSON.stringify({ conversationId, content, clientMsgId }),
    signal
  })

  if (response.status === 401) {
    handleUnauthorized()
    throw new Error('登录已过期，请重新登录')
  }
  if (!response.ok) {
    let message = `客服请求失败（${response.status}）`
    try {
      const body = await response.json()
      message = body.message || body.data?.message || message
    } catch (error) {
      // Keep the explicit HTTP status message if the server did not return JSON.
    }
    throw new Error(message)
  }
  if (!response.body?.getReader) throw new Error('当前浏览器不支持客服流式回复')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let terminalEventReceived = false
  const handlers = {
    onMessage,
    onDone: (payload) => {
      terminalEventReceived = true
      onDone?.(payload)
    },
    onTransfer: (payload) => {
      terminalEventReceived = true
      onTransfer?.(payload)
    },
    onError
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
      const blocks = buffer.split(/\r?\n\r?\n/)
      buffer = blocks.pop() || ''
      blocks.forEach((block) => parseEventBlock(block, handlers))
      if (done) break
    }
    if (buffer.trim()) parseEventBlock(buffer, handlers)
    if (!terminalEventReceived) throw new Error('客服连接意外结束，请点击重试')
  } catch (error) {
    if (error.name !== 'AbortError') onError?.({ message: error.message, code: error.code })
    throw error
  } finally {
    reader.releaseLock()
  }
}
