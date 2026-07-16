# AI Chat（`@component-ai/ai-chat`）— 设计规格（Design Spec）

**日期**：2026-07-16  
**状态**：已定稿（brainstorming 口头确认后落盘）  
**关联实现**：`packages/ai-chat` → `@component-ai/ai-chat`（仅 React）

---

## 1. 背景与目标

在现有 monorepo（`react-ui` / `vue-ui` / `form-core` 等）之上，增加 **AI 向对话能力**。本期只做 **React**，独立包 `@component-ai/ai-chat`，不与 `vue-ui` 镜像。

**成功标准**

- 宿主可接 **OpenAI 兼容** Chat Completions（含 SSE stream）完成：提问 → 流式回复 → 停止 → 失败重试。
- 提供 `useChat` + 默认 `openaiTransport`；UI：`Chat` / `MessageList` / `Message` / `Composer`。
- 支持 **代理模式**（推荐生产）与可选 **客户端 `apiKey`**（本地 / Storybook 演示）。
- Storybook 可用 mock transport 或可配置端点演示完整一轮对话体验（含 loading / error / stop / retry）。

---

## 2. 非目标（本期不做）

- Vue 实现；独立 `@component-ai/chat-core` 包（逻辑放在 `ai-chat` 包内 `src/core/`，YAGNI）。
- Markdown / 代码高亮 / 多模态（图、文件）。
- Agent 工具调用轨迹、确认卡片、会话持久化 / 多会话管理。
- 完整鉴权产品（OAuth 等）；仅提供 `apiKey` / `headers` 扩展点。
- 依赖 Vercel AI SDK 等第三方 Chat SDK 作为核心（保持自研 transport + hook）。

---

## 3. 架构选型

采用 **单包内部分层**（brainstorming 选定方案 1）：

| 层 | 路径 | 职责 |
|----|------|------|
| Core | `packages/ai-chat/src/core/` | 纯 TS：消息模型、SSE 解析、`ChatTransport`、默认 `openaiTransport`；无 React |
| Hook | `packages/ai-chat/src/useChat.ts` | 发消息、流式追加、stop / retry、status / error |
| UI | `packages/ai-chat/src/components/` | `Chat`、`MessageList`、`Message`、`Composer` |
| 导出 | `packages/ai-chat/src/index.ts` | 公共 API |

**不采用**：立即拆独立 `chat-core` 包；或直接包装第三方 AI SDK。

**与现有包关系**：可选 peer/依赖 `@component-ai/react-ui`（如 `Button`）；不阻塞 Form / VirtualGrid。

---

## 4. 能力清单与分期

| 阶段 | 交付 |
|------|------|
| **P0** | 包骨架 + `core`（transport / parser）+ `useChat`（stream / stop / retry / error） |
| **P1** | `Chat` / `MessageList` / `Message` / `Composer` + Storybook（mock transport） |
| **P2** | 使用文档：代理 vs `apiKey`、与 `react-ui` 的依赖说明 |

实现计划可由 writing-plans 将 P0+P1 合并为一份分 Task 计划，或按上表拆开。

---

## 5. 消息模型与传输层

### 5.1 类型

```ts
type ChatRole = "system" | "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  status?: "streaming" | "done" | "error";
  error?: string;
};

type ChatTransportRequest = {
  apiUrl: string;
  apiKey?: string;
  model: string;
  messages: Array<{ role: ChatRole; content: string }>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

type ChatTransportHandlers = {
  onToken: (text: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
};

type ChatTransport = {
  stream: (
    request: ChatTransportRequest,
    handlers: ChatTransportHandlers,
  ) => Promise<void>;
};
```

### 5.2 默认 `openaiTransport`

- `POST {apiUrl}`，JSON body：`{ model, messages, stream: true }`（`messages` 仅含 `role` + `content`）。
- 若存在 `apiKey`：设置 `Authorization: Bearer {apiKey}`。
- 合并 `headers`（代理鉴权等）。
- 解析 SSE：处理 `data:` 行；忽略空行与 `[DONE]`；从 `choices[0].delta.content` 取增量文本。
- HTTP 非 2xx 或网络失败：调用 `onError`。
- 尊重 `signal`（abort）。

### 5.3 鉴权策略

- **代理模式（推荐生产）**：只配置 `apiUrl` 指向自有后端；Key 留在服务端；可用 `headers` 传会话 cookie / 网关 token。
- **客户端 `apiKey`（可选）**：便于本地与 Storybook；文档必须警告不可用于生产暴露。
- 两种模式均支持，由宿主按环境选择。

---

## 6. `useChat` API

```ts
type UseChatOptions = {
  apiUrl: string;
  apiKey?: string;
  model?: string; // 默认实现计划中锁定，如 gpt-4o-mini
  initialMessages?: ChatMessage[];
  transport?: ChatTransport;
  headers?: Record<string, string>;
};

type UseChatReturn = {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  status: "idle" | "streaming" | "error";
  error: Error | undefined;
  send: (text?: string) => Promise<void>; // 默认用 input，可传覆盖文本
  stop: () => void;
  retry: () => Promise<void>; // 失败后重试最后一轮
  reload: () => Promise<void>; // 对最后一轮 user 再生成 assistant（成功路径）
};
```

**数据流**

1. `send`：清空/保留 input 策略——发送后清空 `input`；追加 `user` 消息；追加 `assistant`（`content: ""`, `status: "streaming"`）；`status = "streaming"`。
2. transport 回调 `onToken`：追加到该 assistant 的 `content`。
3. `onDone`：assistant `status = "done"`；`status = "idle"`。
4. `onError`：assistant `status = "error"`，写入 `error` 文案；hook `status = "error"`。
5. **`stop`**：abort；assistant **保留已生成文本**，`status = "done"`（**不**视为 error）；hook `status = "idle"`。
6. **`retry`**：仅当最后一条 assistant 为 `error`（或 hook `status === "error"`）时，移除失败的 assistant，基于最后一条 `user` 再请求。
7. **`reload`**：基于最后一条 `user` 重新生成（可删除其后的 assistant 再请求）；用于非 error 的「再来一次」。

`id`：使用稳定唯一 id（`crypto.randomUUID` 或递增前缀，实现计划中定一种）。

---

## 7. UI 组件 API

### 7.1 组合方式

**一体式**：`Chat` 内部调用 `useChat`（或接收已创建的 chat 状态），子组件从 context 读取。

**头less**：宿主调用 `useChat`，把 `messages` / 回调传给展示组件。

### 7.2 组件职责

| 组件 | 职责 |
|------|------|
| `Chat` | 根布局；可选 `apiUrl` / `apiKey` / `model` 等透传给 `useChat`；提供 React context |
| `MessageList` | 渲染 `messages`；`role="log"` + `aria-live="polite"`；流式时滚到底（用户上滚则暂停跟随——P1 简单实现即可） |
| `Message` | 单条气泡；user / assistant 样式区分；streaming 指示；error 文案 |
| `Composer` | 受控输入；`streaming` 时主按钮为 **停止**，否则 **发送**；error 时提供 **重试**；`role="alert"` 展示错误 |

### 7.3 视觉与依赖

- Tailwind，对齐 `react-ui` 的 slate / sky 风格。
- 本期纯文本，不做 Markdown。
- 按钮优先复用 `@component-ai/react-ui` 的 `Button`（peerDependency）；若未安装，包内提供最小 fallback 按钮样式（实现计划写清，避免硬崩）。

### 7.4 无障碍

- 消息列表实时区：`aria-live="polite"`。
- 发送 / 停止 / 重试：明确 `aria-label`。
- 错误：`role="alert"`。

---

## 8. 测试策略

| 层 | 内容 |
|----|------|
| `core` | Vitest `environment: "node"`：SSE 解析、`[DONE]`、abort、HTTP 错误 |
| `useChat` | jsdom：send 追加、stream 更新、stop 保留文本、retry / reload、error |
| 组件 | Testing Library：Composer 发送↔停止切换、错误与重试可见 |

Storybook：mock `transport` 模拟慢流式；可选文档说明如何配置真实 `apiUrl`。

---

## 9. 包元数据约定

- `name`: `@component-ai/ai-chat`
- `peerDependencies`: `react`、`react-dom`（版本与 `react-ui` 对齐）
- 可选 `peerDependencies`: `@component-ai/react-ui`
- 构建：Vite lib + `vite-plugin-dts`，与现有 UI 包一致
- 根 `package.json` scripts：可加 `build:ai-chat` / `test:ai-chat`

---

## 10. 完成定义

- P0–P1 交付：包可构建、测试通过、Storybook 可演示完整一轮对话（mock 即可）。
- 文档（P2）说明代理与 `apiKey` 风险。
- 满足 §1 成功标准；§2 非目标未误做进主路径。

---

## 11. 文档与执行约定

- 本文件为设计规格；详细实现计划由 `writing-plans` 生成至 `docs/superpowers/plans/`。
- Agent 自动化步骤可勾选；Storybook 目视与 `git commit` / `push` 须用户明确要求。
