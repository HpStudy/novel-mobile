# Skill 2：小说阅读平台 H5 移动端开发（含 AI 智能客服）

## 角色
你是一名资深前端工程师，使用 Vue 3 开发小说阅读平台的 H5 移动端页面。平台内置 AI 智能客服：首页右下角悬浮球，点击以弹框形式展示对话窗口，用户可与 AI 问答、申请转人工，并接收人工客服回复。

## 技术栈要求
- 框架：Vue 3 + Vite 5
- UI 库：Vant 4（有赞移动端组件库）
- 路由：Vue Router 4
- 状态管理：Pinia
- HTTP：Axios（封装请求拦截器，自动带 token）
- 样式：Less / CSS Variables
- AI 对话：fetch + ReadableStream 解析 SSE（不用第三方 SSE 库，避免体积膨胀）

## 项目背景
开发一个网络小说阅读平台的 H5 移动端，用户在手机浏览器里打开就能用。核心页面：首页、分类、书籍详情、阅读页、书架、个人中心。

新增：**AI 智能客服**。首页右下角固定悬浮球入口，点击弹出客服对话框。用户提问后，后端基于公司知识库（向量检索 RAG）流式返回 AI 回答；用户可以申请转人工，人工客服在管理后台接管后可在对话框内继续回复。每轮对话由后端完整记录，前端负责展示与交互。这是正式上线功能，需保证会话恢复、流式渲染、状态流转、断线重试的可靠性。

## 后端 API 约定
- BaseURL: /api（通过 Vite 代理转发到后端）
- 统一返回格式: { code: 0, message: 'success', data: {} }
- 需登录接口在 Header 带 Authorization: Bearer {token}
- token 存在 localStorage，过期跳登录页
- AI 相关接口（/api/ai/*）均需登录；未登录时点击悬浮球引导去登录页

## 页面结构

```
src/
├── api/                 # API 请求封装
│   ├── request.ts       # axios 实例
│   ├── book.ts          # 书籍相关
│   ├── chapter.ts       # 章节相关
│   ├── user.ts          # 用户相关
│   ├── order.ts         # 订单相关
│   └── ai.ts            # AI 客服（会话/消息/SSE 流式/转人工）
├── assets/
├── components/          # 公共组件
│   ├── BookCard.vue     # 书籍卡片（封面+书名+作者）
│   ├── BookList.vue     # 书籍列表
│   ├── NavBar.vue       # 自定义导航栏
│   └── ai-chat/         # AI 客服组件
│       ├── AiChatFab.vue        # 首页右下角悬浮球
│       ├── AiChatDialog.vue     # 客服弹框（对话主界面）
│       ├── AiMessageItem.vue    # 消息气泡（user/assistant/agent/system）
│       ├── AiQuickQuestions.vue # 快捷问题（可选，读欢迎语配置）
│       ├── useAiChat.ts         # 会话状态机 + SSE 流式逻辑（组合式函数）
│       └── index.ts             # 统一导出
├── views/
│   ├── home/            # 首页（挂载 AiChatFab）
│   ├── category/        # 分类页
│   ├── book-list/       # 分类下的书籍列表
│   ├── book-detail/     # 书籍详情
│   ├── reader/          # 阅读页（最核心）
│   ├── shelf/           # 书架
│   ├── profile/         # 个人中心
│   ├── search/          # 搜索
│   ├── login/           # 登录
│   └── pay/             # 支付确认
├── router/
├── store/
├── App.vue
└── main.ts
```

## 各页面详细要求（原有，保持不变）

### 1. 首页 views/home/
从上到下：
- 顶部搜索框（点击跳搜索页）
- 轮播 Banner（调 /api/banner/list）
- 分类入口（8个图标，横滑）
- 热门推荐列表（调 /api/book/recommend，分页加载）
- 新书上架列表
- **右下角固定 AI 客服悬浮球（新增）**

### 2. 分类页 views/category/
- 左侧分类导航（竖排）
- 右侧对应分类的书籍网格
- 点击分类切换右侧内容

### 3. 书籍详情 views/book-detail/
- 顶部：封面 + 书名 + 作者 + 评分 + 字数 + 状态
- 简介区域（可展开/收起）
- 收藏按钮 + 开始阅读按钮
- 章节列表（前N章免费，后面标 VIP/价格）
- 底部：评论区域（显示最新几条评论）

### 4. 阅读页 views/reader/（最核心）
- 全屏沉浸式阅读
- 顶部：章节标题 + 返回按钮（点击显示/隐藏工具栏）
- 中间：章节正文内容，支持上下滑动翻页
- 底部工具栏（点击屏幕中间呼出）：
  - 字体大小调节（A- / A+）
  - 背景色切换（白底/黄底/绿底/夜间模式）
  - 目录按钮（呼出章节列表侧边栏）
  - 设置行间距/亮度

功能要求：
- 阅读进度自动保存（调 /api/read/save）
- 下次打开自动跳到上次阅读位置
- 付费章节弹出支付确认框
- 夜间模式全局生效

### 5. 书架 views/shelf/
- 用户收藏的书籍列表（封面网格）
- 显示最近阅读进度
- 点击直接进入阅读页

### 6. 个人中心 views/profile/
- 用户头像 + 昵称 + VIP状态
- 阅币余额显示
- 我的书架入口
- 阅读历史入口
- 我的订单入口
- 设置（字体大小默认值、夜间模式开关）

### 7. 搜索页 views/search/
- 顶部搜索框
- 搜索历史记录
- 热门搜索词
- 搜索结果列表

### 8. 登录页 views/login/
- 微信一键登录按钮
- 手机号登录（输入手机号 → 获取验证码 → 登录）

## 组件要求（原有）
### BookCard.vue 书籍卡片
- 封面图（圆角）
- 书名（两行截断）
- 作者 + 评分
- 尺寸：宽约 100px，高自适应

### NavBar.vue 自定义导航栏
- 左侧返回按钮
- 中间标题
- 右侧可选操作区

## AI 智能客服设计（新增）

### 1. 悬浮球 AiChatFab.vue（首页右下角）
- 定位：`position: fixed; right: 16px; bottom: 24px`，注意叠加 `env(safe-area-inset-bottom)` 适配全面屏；z-index 需高于首页内容（默认 999）
- 样式：48px 圆形，主色渐变背景 + 白色机器人图标（SVG），带轻微阴影与按压缩放
- 交互：点击打开/关闭弹框；可带未读红点（本期如无推送能力可预留 prop `badge`，默认 0）

### 2. 客服弹框 AiChatDialog.vue
- 容器：`van-popup`，`position="bottom"`，`round`，高度建议 `height: 85vh`（内容区自适应），从底部滑入
- 结构（从上到下）：
  - 顶部标题栏：左侧「智能客服」标题；右侧「转人工」按钮 + 关闭按钮
  - 消息列表区：滚动容器，最新消息自动滚到底部；上拉加载更早历史（分页）
  - 底部输入区：textarea（自适应高度，上限 4 行）+ 发送按钮；输入中禁用换行触发
- 打开逻辑：
  - 读取 localStorage `ai_last_session_id` → 有则 `GET /api/ai/session/:id` 校验状态：进行中续接；已结束/不存在则新建
  - 无则 `POST /api/ai/session` 创建，返回 welcomeMessage 并以 system 气泡展示欢迎语
  - 首次打开拉取最近一页历史消息
- 关闭逻辑：不销毁会话，仅关闭弹框；再次打开自动恢复
- 未登录处理：点击悬浮球若未登录，Toast 提示并跳登录页，登录后回到首页可再次打开

### 3. 会话状态机 useAiChat.ts（核心逻辑）
状态枚举（与后端契约一致）：
```
idle（未打开）→ chatting（进行中 status=0）
→ transferring（待转人工 status=1）
→ agent（人工已接管 status=2）
→ ended（已结束 status=3）
```
- 打开弹框即进入 chatting（或恢复原状态）
- 发送消息：本地先上屏 user 气泡（乐观更新）→ 调 SSE → 收到 message 事件逐字追加到 assistant 气泡（打字机效果）→ done 事件收尾（写引用）→ 解锁输入框
- 转人工：点顶部「转人工」→ 二次确认 → `POST /api/ai/session/:id/transfer` → 状态切 transferring，插入 system 气泡「已为您转接人工客服，请稍候」；转人工后发送按钮变为「客服接入中」提示
- 人工接管：轮询 `GET /api/ai/session/:id`（每 15s，仅 transferring 状态时开启）→ 变为 agent 后：插入 system 气泡「客服 已接管会话」，此后 agent 消息正常展示，输入框重新可用（消息发送到后端，由客服接收）
- 会话结束（ended）：输入框与转人工按钮禁用，展示「会话已结束」

### 4. API 封装 src/api/ai.ts
- `createSession()` → POST /api/ai/session
- `getSession(id)` → GET /api/ai/session/:id
- `getMessages(id, page, pageSize)` → GET /api/ai/session/:id/messages
- `sendMessage({ conversationId, content, clientMsgId, onMessage, onDone, onTransfer, onError, signal })` → POST /api/ai/chat，内部用 `fetch + ReadableStream.getReader()` 解析 `text/event-stream`：
  - 按行解析 `event:` / `data:`，data 为 JSON
  - `message` → onMessage({ messageId, content })
  - `done` → onDone({ fullContent, citations })
  - `transfer` → onTransfer({ status })
  - `error` → onError({ message })
  - 支持传入 AbortController signal，中断时中止请求并提示
- `transferSession(id)` / `closeSession(id)` → POST 对应接口
- `feedback(messageId, rating)` → POST /api/ai/message/:id/feedback（在 assistant 气泡长按或尾部「有用/无用」按钮触发）

### 5. 消息气泡 AiMessageItem.vue
- role=user：右对齐，主题色气泡，白色文字
- role=assistant：左对齐，白色气泡；渲染时内容为流式增量拼接；loading 状态显示三点动画；消息尾部「有用/无用」反馈按钮；有 meta.citations 时气泡底部显示「参考来源」小字（最多 3 条，点击弹出 ActionSheet 展示标题与原文片段）
- role=agent：左对齐，浅色气泡，顶部带「客服」小标签，与其他消息区分
- role=system：居中灰色小字（欢迎语/状态提示），不渲染为气泡
- 时间：消息间隔超过 5 分钟显示分组时间戳；当日显示 HH:mm，跨日显示 MM-DD HH:mm

### 6. 流式与重试要求
- 打字机渲染：onMessage 追加内容，节流（约 30ms）更新 DOM，避免高频 setState
- 断线：fetch 异常 / 收到 error 事件 → 气泡尾部显示「发送失败，点击重试」，重试时复用同一 clientMsgId（幂等）
- 刷新/路由切换：组件卸载时仅中止进行中的 SSE，不关闭会话；重新进入自动恢复
- 输入限制：内容 trim 后为空不可发送；长度上限 500 字，超出 Toast 提示

### 7. 样式要求（AI 客服部分）
- 悬浮球与弹框主色沿用全局主题色（暖色系，如 #E6432D / #FF6B35）
- 弹框圆角 16px、顶部标题栏 44px；消息区 padding 12px；气泡最大宽度 75%
- 聊天区背景 #F7F7F7，气泡白底/主题色底；字体大小与全局正文一致（默认 15px）
- 安全区：弹框底部输入区增加 `padding-bottom: env(safe-area-inset-bottom)`
- 动效：弹框 van-popup 自带滑入；消息新增时轻微上浮动画；悬浮球按压 scale(0.95)

## 交互要求（原有）
1. 所有列表页支持下拉刷新 + 上拉加载更多
2. 页面切换用过渡动画
3. 加载中用 Vant 的 Loading 组件
4. 网络错误用 Toast 提示
5. 401 自动跳登录页（AI 弹框内出现的 401 同样跳登录并关闭弹框）

## 样式要求（原有）
- 适配移动端：viewport 自适应，rem 或 vw 单位
- 主色调用暖色系（适合阅读场景），比如 #E6432D 或 #FF6B35
- 阅读页背景色：白 #FFFFFF / 米黄 #F5F0E1 / 浅绿 #E8F5E9 / 夜间 #1A1A1A
- 字体大小：正文默认 16px，可调范围 14-22px
- 行间距：默认 1.8 倍

## 跨端契约（与后端、管理后台对齐）
- 会话状态：0进行中 / 1待转人工 / 2人工已接管 / 3已结束
- 消息角色：user / assistant（AI）/ agent（客服）/ system
- SSE 事件：message / done / transfer / error（字段见后端 Skill 的「SSE 流式协议约定」，前端以此为准解析）

## 验收标准
1. 所有页面能正常渲染，布局适配手机屏幕；列表页能正常加载数据和分页
2. 阅读页功能完整（翻页、字体、背景色、进度保存）；API 请求封装正确，token 自动携带
3. 首页右下角悬浮球显示正常，点击以弹框形式打开客服对话框
4. AI 问答全链路：发送消息→流式打字机→done 收尾（含引用展示）；转人工→状态提示→人工回复以 agent 气泡展示
5. 刷新/重进后可恢复历史会话与消息；断线重试可用；未登录被正确引导登录
6. npm run dev 启动正常，页面无报错
