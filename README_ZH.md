# Antigravity Manager 🚀

> 专为 Antigravity 打造的高性能轻量级账号管理、实时监控、会话审计与 Token 统计系统。

<div align="center">
  <img src="public/icon.png" width="108" height="108" alt="Antigravity Manager Logo">
  <h3>Antigravity Manager</h3>
  <p>极简 · 极速响应 · 会话追踪 · 实际路由识别 · 深度审计</p>

  <p>
    <a href="https://github.com/ruofeng086/Antigravity-Manager/releases">
      <img src="https://img.shields.io/badge/Release-v1.0.0-blue?style=flat-square" alt="GitHub release">
    </a>
    <img src="https://img.shields.io/badge/Tauri-v2-orange?style=flat-square" alt="Tauri">
    <img src="https://img.shields.io/badge/Backend-Rust-red?style=flat-square" alt="Rust">
    <img src="https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=flat-square" alt="React">
    <img src="https://img.shields.io/badge/License-CC--BY--NC--SA--4.0-lightgrey?style=flat-square" alt="License">
  </p>

  <p>
    <a href="#-核心特性">核心特性</a> • 
    <a href="#-功能模块解析">功能模块</a> • 
    <a href="#-下载与安装">下载安装</a> • 
    <a href="#-本地运行与构建">本地构建</a> • 
    <a href="#-技术架构">技术架构</a>
  </p>
</div>

---

## 🌟 核心特性

- 🎯 **极致轻量化**：专注于 Antigravity 账号调度与全维可观测性，界面纯粹干练，资源占用极低。
- 🔄 **真实模型路由识别**：准确捕获请求模型与实际上游响应模型（例如请求 `gemini-3.8-flash`，实际路由至 `gemini-3.8-flash-control` 或 `gemini-3.8-flash-n`）。
- ⚡ **首字节延迟 (TTFB) 与生成速率 (TPS)**：精细化度量网络建连耗时与每秒 Token 生成速度，性能瓶颈一目了然。
- 🆔 **精准会话归属溯源**：支持通过会话 ID（Session ID）穿透过滤与一键检索，直观呈现每个请求归属的具体会话。
- 📊 **历史会话深度统计**：自动解析 Antigravity 本地历史数据，跨天/周/月/全量维度统计 Token 消耗趋势与分布。
- 🛡️ **账号健康与配额管理**：多账号智能状态轮询、配额保护与最优账号推荐。

---

## 🖥️ 功能模块解析

### 1. 「仪表盘」 (Dashboard)
- 账号健康度监控与配额总览。
- 最优可用账号智能推荐与一键快速切换。

### 2. 「账号管理」 (Accounts)
- 多账号统一授权与安全凭证管理。
- 账号优先级、标签分类与实时配额刷新。

### 3. 「实时监控」 (Monitor)
- 实时统计卡片：当前模型、生成速率 (TPS)、平均延迟、首字节耗时 (TTFB)、成功率与每分钟请求数 (RPM)。
- 模型调用分布柱状图，直观展示活跃模型占比。
- 最近请求动态流，快速定位当前流量状态。
- 内置一键代理服务控制开关，支持实时状态感知与热启动。

### 4. 「请求日志」 (Logs)
- 每一条请求的完整生命周期可观测性：
  - **所属会话 (Session ID)**：自动提取并在前端提供专属徽章与一键过滤。
  - **实际模型识别 (Model Routing)**：醒目展示模型映射链路（如 `gemini-3.8-flash ➔ gemini-3.8-flash-control`）。
  - **首字节耗时 (TTFB)**：毫秒级首字节到达时间度量与速度分级高亮。
  - **生成速率 (TPS)**：计算公式 `output_tokens / (duration - ttfb)`，精准评估上游吐字速度。
- 抽屉式详情检查面板（Slide-over Drawer），结构化查看请求头、响应头及完整 Payload。

### 5. 「Token 统计」 (Statistics)
- 本地历史会话数据深度解析（单机支持海量历史会话与数十亿级别 Token 统计）。
- 多维度时间聚合：今日、近 7 天、本月、全部历史。
- 堆叠面积图（输入 / 缓存 / 思考 / 输出 Token 趋势）与渠道占比饼图。

### 6. 「设置」 (Settings)
- 精简常规外观（暗黑模式、主题自适应与缩放调节）。
- 账号安全参数与本地数据存储路径管理。

---

## 📦 下载与安装

请前往 [GitHub Releases](https://github.com/ruofeng086/Antigravity-Manager/releases) 获取最新打包版本。

| 平台 | 安装包名称 | 说明 |
| :--- | :--- | :--- |
| **Windows x64** | `Antigravity-Manager-Setup.exe` | 推荐，标准 NSIS 安装程序 |

下载后双击运行即可完成安装。

---

## 🛠️ 本地运行与构建

### 环境要求
- Node.js >= 18
- Rust >= 1.75
- Git

### 本地启动
```bash
# 1. 克隆代码仓库
git clone https://github.com/ruofeng086/Antigravity-Manager.git
cd Antigravity-Manager

# 2. 安装前端依赖
npm install

# 3. 运行本地开发环境
npm run dev
```

### 本地打包
```bash
npm run build
npm run tauri build
```

---

## 🏗️ 技术架构

- **桌面底座**：Tauri v2 + Rust
- **前端框架**：React 19 + TypeScript + Vite + Tailwind CSS
- **动效与交互**：Framer Motion + Lucide Icons + Recharts
- **本地持久化**：SQLite (rusqlite) + WAL 模式
- **网络与代理**：Axum + Tokio + Reqwest

---

### 鸣谢
本项目基于开源项目 [lbjlaq/Antigravity-Manager](https://github.com/lbjlaq/Antigravity-Manager) 开发，感谢原作者及社区贡献。

### 开源协议
[CC-BY-NC-SA-4.0 License](LICENSE)
