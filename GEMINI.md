# Antigravity Manager (架构知识快照)

## 1. 核心技术栈与架构
- **前端框架**: React 19.1 + TypeScript 5.8 + Vite 7.3 + Tailwind CSS 3.4 + DaisyUI 5.5
- **图表与动画**: Recharts 3.5 + Framer Motion 11.13 + Lucide React
- **桌面框架**: Tauri v2.2 (Rust 后端 + 本机进程管理)
- **状态管理**: Zustand 5.0 (useConfigStore, useAccountStore, useViewStore, usePedalModeStore)
- **多语言与主题**: i18next 25.7 + 深色/浅色自适应/深空赛博朋克 Observatory
- **开源仓库**: [ruofeng086/Antigravity-Manager](https://github.com/ruofeng086/Antigravity-Manager.git)
- **当前版本**: v1.0.0

## 2. 核心功能模块 (六大核心功能)
1. **仪表盘 (`src/pages/Dashboard.tsx`)**:
   - 展示 Google Gemini Pro / Flash、Claude 模型配额健康度与最佳账号自动推荐。
2. **账号管理 (`src/pages/Accounts.tsx`)**:
   - Google OAuth 2.0 矩阵授权导入、QoS 小黑屋解封、账号配额刷新与优先级拖拽排序。
3. **监控 (`src/pages/Monitor.tsx`) [新增/重构]**:
   - 实时监控 Antigravity 当前使用的实际模型名称、生成速度 (TPS tokens/sec)、单次响应耗时、TTFB 首字延迟与模型调用分布。
4. **日志 (`src/pages/Logs.tsx`) [新增]**:
   - **会话级追踪 (Session ID)**：深度解析请求头与请求体，标记每个请求归属哪个会话，支持一键复制与快速单会话隔离过滤。
   - **实际路由模型识别**：智能捕获 Antigravity 实际模型与配置不一致的情况（如配置 `gemini-3.8-flash` 实际路由为 `gemini-3.8-flash-control` / `gemini-3.8-flash-n`）。
   - **首字节延迟耗时 (TTFB / TTFT)**：毫秒级首包耗时检测，配备直观色标反馈。
   - **生成速率 (TPS)**：实时输出每秒产生 Token 数量（`⚡ xx.x t/s`）。
   - **全量审计抽屉**：网络基本信息、Token 分布、Headers JSON、格式化 Payload 报文体查看与复制。
5. **统计 (`src/pages/Statistics.tsx`) [新增]**:
   - 提取并分析本机 `token_usage_archive_v2.json` 真实会话数据 (529+ 会话，25.3B+ Tokens)。
   - 提供按日、按周、按月、全周期的多时间维度图表与统计明细报表。
   - 呈现输入 (Input)、缓存读取 (Cache Read)、模型输出 (Output) 的构成比例与渠道分布 (IDE 客户端 vs CLI 命令行)。
6. **设置 (`src/pages/Settings.tsx`) [精简]**:
   - 移除了所有与已删除功能相关的配置（代理端口、中转站、IP 黑白名单、User Tokens 等）。
   - 仅保留通用设置 (语言、主题、开机自启、缩放)、账号设置 (配额刷新、蹬额度模式)、高级系统设置 (数据目录迁移、Antigravity 缓存清理) 与关于信息。

## 3. 已移除的无关模块与路由
- 移除了 API 反代 (`/api-proxy`)、中转站 (`/apikey-fun`)、用户 Token (`/user-token`)、IP 安全管理 (`/security`)、旧版代理日志。
- 导航栏精简至 6 个胶囊入口 (`/`, `/accounts`, `/monitor`, `/logs`, `/statistics`, `/settings`)。
- 移除了双 11 临时促销徽章及相关过期逻辑。

## 4. 性能优化与资源减负
- `vite.config.ts` 配置针对性的 Rollup manualChunks 策略 (`react-vendor`, `router`, `charts`, `animation`, `icons`, `i18n`, `state`, `utils`)，按需加载，前端编译仅需 33 秒。
- 监控与日志页面集成 Document Visibility API，当应用最小化或处于后台标签时自动暂停轮询，将 CPU/内存占用降至最低。
- 统计数据采用 useMemo 缓存计算结果，配合只读高性能流式解析，无重算卡顿。

## 5. 持续集成与打包
- GitHub Actions 工作流 `.github/workflows/build-windows.yml` 配置在 `windows-2025` 自动化编译 Tauri NSIS 安装包并发布到 GitHub Releases。
