import fs from 'fs';
import path from 'path';

const tagArg = process.argv[2];
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;
const tagName = tagArg && tagArg.trim() ? tagArg.trim() : `v${version}`;

const content = `> 🚀 **Lightweight, high-performance multi-account manager, real-time observability proxy, session tracer, and deep token analytics suite for Google Antigravity.**
> 专为 Google Antigravity 打造的高性能多账号管理、实时代理监控、会话级日志审计与 Token 深度统计系统。

---

## 📦 Downloads / 客户端跨平台安装包

| Platform / 操作系统 | Architecture / 芯片架构 | Package File / 文件名 | Description / 说明 |
| :--- | :--- | :--- | :--- |
| **Windows** | x64 (64-bit) | \`Antigravity-Manager-${version}-Setup.exe\` | Windows NSIS 一键安装包 |
| **macOS** | Apple Silicon (M1/M2/M3/M4) | \`Antigravity-Manager-${version}-aarch64.dmg\` | 苹果芯片原生 DMG 安装镜像 |
| **macOS** | Intel (x64) | \`Antigravity-Manager-${version}-x64.dmg\` | 英特尔芯片 Mac 原生 DMG 安装镜像 |
| **Linux** | x64 (AMD64) | \`Antigravity-Manager-${version}-amd64.AppImage\` | Linux 通用免安装便携包 (AppImage) |
| **Linux** | x64 (AMD64) | \`Antigravity-Manager_${version}_amd64.deb\` | Debian / Ubuntu 原生 DEB 安装包 |

> 💡 **Platform Notes / 平台特别说明**:
> - **macOS**: If macOS Gatekeeper displays *"Antigravity Manager is damaged and can't be opened"*, open Terminal and run:  
>   \`xattr -cr "/Applications/Antigravity Manager.app"\`
> - **Linux**: For AppImage, remember to grant execution permissions before launching:  
>   \`chmod +x Antigravity-Manager-*.AppImage\`

---

## 🌟 Highlights & Key Features / 核心特性

### 1. Ultra-Low Overhead & Pure Engineering / 极简架构与极致性能
- **EN**: Engineered specifically for Google Antigravity Desktop and CLI. Completely stripped of commercial bloat and redundant reverse-proxy modules, maintaining minimal background memory and CPU footprint.
- **ZH**: 纯粹保留账号管理、本地代理及监控统计核心，全面剔除冗余商业模块，超低后台常驻资源与 CPU 占用。

### 2. Millisecond Observability & Live Telemetry / 毫秒级实时监控
- **EN**: Captures real-time client requests, active model routing, generation throughput (Tokens Per Second - TPS), Time-to-First-Byte (TTFB), request latency, and full success rates.
- **ZH**: 毫秒级捕获当前请求模型、TPS 吞吐速率、首字节响应耗时 (TTFB)、请求延迟与全量请求成功率。

### 3. Session-Level Tracing & Actual Model Routing / 会话级日志与实际物理路由识别
- **EN**:
  - **Precise Session Attribution**: Correlates every request directly with desktop conversation sessions (\`Session ID\` & \`Session Title\`).
  - **Physical Route Drift Detection**: Automatically identifies model drift between requested client models and actual backend endpoints (e.g. \`gemini-3.8-flash\` ➜ \`gemini-3.8-flash-control\` / \`gemini-3.8-flash-n\`).
  - **Payload Inspection Drawer**: Inspect raw request headers, upstream routing parameters, and response bodies on demand with full pagination and multi-dimensional search filtering.
- **ZH**:
  - **会话归属追踪**：精确关联每个请求归属哪个会话 (\`Session ID\` 与会话标题)。
  - **真实物理路由漂移识别**：实时识别客户端请求模型与实际后端路由模型（如 \`gemini-3.8-flash\` ➜ \`gemini-3.8-flash-control\` / \`gemini-3.8-flash-n\`）。
  - **Payload 审计抽屉**：支持一键展开查看原始请求头与完整响应体，内置完备分页与多维度组合筛选过滤。

### 4. Deep Token Analytics & Quota Intelligence / 深度 Token 统计与额度智能分析
- **EN**: Seamlessly parses local Antigravity session storage. Provides daily, weekly, monthly, and all-time token consumption breakdowns with interactive bar charts and cache hit rate analytics.
- **ZH**: 无缝解析本地 Antigravity 历史会话用量，提供日/周/月/全周期 Token 消耗分布柱状图与明细趋势图。

### 5. Multi-Account High-Availability Rotation / 多账号高可用智能轮询
- **EN**: Supports multiple Antigravity / Google accounts with intelligent load balancing, quota health detection, and automatic failover retry.
- **ZH**: 支持多账号并行负载均衡、额度状态自动探活与故障自动重试切换。

---

## 🛠️ What's New in ${tagName} / 本次更新内容
- **Cross-Platform Native Builds**: Added automated GitHub Actions builds for Windows (x64 NSIS), macOS (Apple Silicon arm64 & Intel x64 DMGs), and Linux (AppImage & DEB).
- **Session Logs Pagination**: Added high-performance pagination with customizable page sizes (10, 20, 50, 100).
- **Enhanced Search & Filtering**: Full SQLite query support for \`mapped_model\`, \`upstream_model\`, \`session_title\`, \`session_id\`, \`client_ip\`, and HTTP status codes (2xx / 4xx / 5xx).
- **Bilingual Documentation**: Comprehensive English-first documentation and release assets.
`;

const outPath = path.resolve('dist-release-body.md');
fs.writeFileSync(outPath, content, 'utf8');
console.log(`Generated release body at ${outPath} (${content.length} chars)`);
