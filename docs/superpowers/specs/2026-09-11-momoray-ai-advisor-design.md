# MomoRay AI Advisor 独立演示页设计

## 目标

创建一个可从 Notion 作品集跳转访问的独立 Next.js 网页。页面以完整聊天体验呈现 MomoRay 售前顾问，并通过服务端 API Route 调用已发布的 Coze Workflow，展示真实的非流式回复。

本项目不重建 Notion 作品集，也不修改 Coze Workflow。第一版只交付单页聊天演示、服务端代理和必要状态处理。

## 页面方向

页面参考 Gemini 的桌面布局，但使用 MomoRay 自己的内容和现有作品集的紫色视觉语言。

- 桌面端左侧为窄侧栏，包含 MomoRay 标识、“新对话”和简短的 Demo 说明。
- 主区域顶部显示 `MomoRay AI Advisor`、`Agent Workflow Demo` 和紫色 `● LIVE` 状态。
- 初始态中央显示标题“今天想了解怎样的睡眠支撑？”、欢迎文案 `Ask the workflow anything.`、输入框和四个建议问题。
- 用户发送第一条消息后，主区域切换为对话视图；消息区滚动，输入框固定在内容区底部。
- 移动端隐藏或折叠侧栏，聊天区占满页面宽度。

视觉使用白色或浅灰底、紫色强调色、细边框和克制阴影。不使用渐变玻璃拟态、电商客服样式或卡通客服头像。

## 建议问题

初始态展示以下四个可点击建议问题，点击后立即触发发送：

1. 这个枕头可以调高度吗？
2. 我主要侧睡，肩比较宽，喜欢高一点
3. 给我推荐一个配置
4. 我最近脖子一直痛，是不是颈椎病？

## 交互状态

聊天页面管理以下客户端状态：

- 初始态：展示欢迎文案、输入框和建议问题。
- 提交态：立即加入用户消息，禁用重复提交，并展示 assistant loading message：`Running workflow...`。
- 成功态：用 Workflow 返回的 `output` 替换 loading message。
- 失败态：展示 `Workflow request failed. Please try again.`，同时恢复输入能力。
- 新对话：清空当前页面内的消息，返回初始态。
- 响应式状态：桌面显示侧栏；移动端保留主聊天界面。

页面刷新后不保留历史记录。第一版不包含登录、数据库、语音、附件、流式输出或多会话持久化。

## 前端组件

组件按职责拆分：

- `AdvisorShell`：页面布局、侧栏和整体响应式结构。
- `AdvisorHeader`：产品名、副标题和 LIVE 状态。
- `ChatExperience`：消息状态、发送流程、新对话和错误恢复。
- `MessageList`：用户、assistant、loading 和 error 消息展示。
- `PromptSuggestions`：四个建议问题及点击发送。
- `MessageComposer`：输入、Enter 提交、提交禁用和空输入保护。

组件使用项目内 CSS 或 CSS Modules 实现，不引入大型 UI 框架。图标使用轻量 SVG 或项目已有图标方案。

## 服务端 API

Next.js App Router 提供 `POST /api/advisor`。

客户端请求：

```json
{
  "input": "用户输入"
}
```

API Route 的职责：

1. 校验 `input` 为非空字符串，去除首尾空白，并限制为最多 2,000 个字符。
2. 从服务端环境变量读取 `COZE_API_TOKEN` 和 `COZE_WORKFLOW_ID`。
3. 调用 Coze 官方非流式 Workflow API：`POST https://api.coze.cn/v1/workflow/run`。
4. 请求 Header 使用 `Authorization: Bearer <token>` 和 `Content-Type: application/json`。
5. 请求 Body 仅包含官方文档所需的数据：`workflow_id` 与 `parameters: { input }`。
6. 检查 HTTP 状态和 Coze 业务状态。Coze 成功响应中的 `data` 为 JSON 字符串，解析后读取 `output`。
7. 向客户端只返回规范化结果 `{ "output": "..." }`；失败时返回通用错误，不泄露 Token、上游响应细节或调试 URL。

第一版不发送 `bot_id`、`app_id` 或其他可选字段，除非实际调用结果证明该 Workflow 明确需要它们，并由用户提供对应配置。

## 安全与配置

仅在服务端读取：

```env
COZE_API_TOKEN=
COZE_WORKFLOW_ID=7679774858637492267
```

- 不使用 `NEXT_PUBLIC_` 前缀。
- 不把 Token 写入源码、客户端 bundle、日志或错误响应。
- 提供 `.env.example`，真实 `.env.local` 保持在版本控制之外。
- 用户需要在 Coze 创建具备 `run` 权限的访问令牌，并确保 Workflow 已发布。

## 错误处理

- 缺少或无效输入：返回 `400`。
- 缺少服务端环境变量：返回 `500`，客户端显示统一失败文案。
- Coze HTTP、业务码、60 秒超时、无效 JSON 或缺少 `output`：服务端记录不含敏感信息的诊断内容，对客户端返回统一失败结果。
- 客户端网络错误或非成功响应：移除 loading 状态并展示指定错误消息。

## 测试策略

实现采用测试先行：

- API Route 测试：空输入、环境变量缺失、正确 Coze 请求结构、成功解析 `data.output`、上游失败和畸形响应。
- 组件测试：初始欢迎态、建议问题自动发送、普通输入发送、loading、成功回复、失败文案和新对话重置。
- 验证命令：项目单元测试、类型检查、lint 和生产构建。
- 最后在本地浏览器进行桌面与移动端视觉检查，确认布局、滚动和输入行为。

## 交付范围

第一版交付：

- 可运行的 Next.js 独立页面。
- Coze Workflow 服务端代理。
- 完整基础聊天状态与响应式 UI。
- 环境变量示例和本地运行说明。
- 可部署构建产物对应的源码。

部署平台和公开 URL 不在第一版默认动作中；完成本地验证后，根据用户选择的托管平台再部署。
