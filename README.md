# LobeChat Svelte

基于 **SvelteKit 3** + **Agnes AI API** 构建的 AI 聊天应用，参考 LobeHub 风格设计，可部署到 **Cloudflare Pages**。

## 功能特性

- 深色主题 UI，参考 LobeHub 风格
- 多会话管理（新建、切换、删除对话）
- 支持 Agnes AI API 流式回复
- 本地存储 API Key 和对话历史
- 模型选择配置
- 响应式设计，支持移动端

## 技术栈

- SvelteKit 3 (Svelte 5 Runes)
- Tailwind CSS 4
- Agnes AI API (OpenAI-compatible)
- Cloudflare Pages Adapter

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

构建输出位于 `.svelte-kit/cloudflare`，可直接部署到 Cloudflare Pages。

## 部署到 Cloudflare Pages

### 方式一：Wrangler CLI

```bash
npx wrangler pages deploy .svelte-kit/cloudflare
```

### 方式二：Git 集成

1. 将代码推送到 GitHub/GitLab
2. 在 Cloudflare Dashboard 中创建 Pages 项目
3. 连接 Git 仓库
4. 构建命令：`npm run build`
5. 构建输出目录：`.svelte-kit/cloudflare`

## 配置说明

首次使用时，点击右上角设置图标，输入你的 Agnes AI API Key 即可开始使用。

API Key 和模型配置仅保存在浏览器本地存储中，不会上传到任何服务器。

## 项目结构

```
src/
  lib/
    stores/chat.ts      # 聊天状态管理
    api/agnes-ai.ts     # Agnes AI API 封装
  routes/
    +page.svelte        # 主页面
    ChatInterface.svelte    # 聊天主界面
    ChatMessage.svelte        # 消息气泡组件
    ChatInput.svelte          # 输入框组件
    Sidebar.svelte            # 侧边栏
    SettingsModal.svelte      # 设置弹窗
```

## License

MIT
