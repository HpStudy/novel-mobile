# 小说阅读平台 H5

基于 Vue 3 + Vite 5 + Vant 4 + Pinia + Vue Router + Axios 的移动端小说阅读平台前端 demo。

## 功能概览

- 首页：搜索入口、轮播、分类入口、热门推荐、新书上架
- 分类：分类导航与书籍列表，支持进入分类书籍列表页（下拉刷新 + 上拉分页）
- 详情：书籍简介、收藏、章节列表、评论
- 阅读：章节正文、字体大小、行距、亮度、主题切换、目录切换、进度保存
- 书架：收藏列表与本地阅读进度
- 个人中心：会员信息、设置、阅读历史、订单
- 登录：手机号登录、短信验证码入口、微信登录入口（占位配置）
- 支付：章节购买确认页，支持创建订单；真实支付需后端接入
- 智能客服：会话恢复、SSE 流式问答、历史消息、快捷问题、转人工、人工接管轮询、结束会话和回答反馈

## 技术栈

- Vue 3
- Vite 5
- Vue Router 4
- Pinia
- Axios
- Vant 4
- Less

## 本地启动

```bash
npm install
npm run dev -- --host 0.0.0.0
```

访问：

- http://localhost:5173/

## 环境变量

项目已提供 `.env.example`，复制为 `.env` 后按需配置：

```bash
cp .env.example .env
```

关键变量说明：

- `VITE_API_PROXY_TARGET`：后端 API 代理目标，默认 `http://localhost:3000`，与 `novel-admin` 的代理目标保持一致；`/api` 路径会原样转发
- `VITE_SMS_CODE_ENDPOINT`：可选短信验证码发送接口；当前后端没有发送验证码路由，留空时登录页提供开发测试码入口
- `VITE_PHONE_LOGIN_ENDPOINT`：手机号登录接口
- `VITE_WECHAT_APP_ID`：微信应用 AppID
- `VITE_WECHAT_REDIRECT_URI`：微信授权回调地址
- `VITE_WECHAT_LOGIN_ENDPOINT`：微信登录回调接口
- `VITE_SEARCH_HOT_WORDS`：热门搜索词（可选）
- `VITE_SEARCH_HOT_ENDPOINT`：热门搜索接口（可选）

## 说明

- H5 请求通过 Axios 使用 `/api` 前缀，Vite 代理与管理端同指向本地后端；需要登录的请求从 `localStorage` 读取 `token` 并发送 `Authorization: Bearer <token>`。
- 书籍、分类、Banner、章节、评论、手机号登录、用户资料、收藏、阅读历史和订单接口已对照本地 Nest 后端进行请求验证。
- 智能客服前端按 `Skill2-H5移动端开发.md` 中的 `/api/ai/*` 契约接入；当前本地 Nest 服务未实现 AI 路由，接入需依赖后端客服、RAG/LLM 和知识库配置。外部能力未就绪时，界面会显示接口错误，不会模拟成功答复。
- 当前后端不提供短信发送路由；开发环境可使用后端约定的测试码 `123456`。
- 微信 OAuth 需要后端完成授权码兑换；真实支付还需要支付通道和回调，当前只会创建订单，不会假报支付成功。

## 构建验证

```bash
npm run build
```
