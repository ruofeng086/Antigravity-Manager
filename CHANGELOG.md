# 更新日志 (Changelog)

所有关键版本的更新记录都将在此文档中记录。本项目遵循 [语义化版本 2.0.0](https://semver.org/lang/zh-CN/) 标准。

---

## [1.0.0] - 2026-11-14

### 🎉 初始正式版发布 (Initial Official Release)

Antigravity Manager v1.0.0 是专为 Antigravity 深度定制与优化的新一代轻量级管理工具，专注于账号生命周期管理、全链路实时监控、会话级深度审计与 Token 统计。

#### 🌟 核心特性

- **极致轻量架构**:
  - 全面剔除冗余商业分销及多余代理模块，仅保留核心账号治理与监控链路。
  - 基于 Tauri v2 + Rust 后端 + React 19 前端，常驻内存占用极低，毫秒级响应。

- **Antigravity Desktop 实时联动与监控**:
  - 实时同步与捕获 Antigravity Desktop 本地执行记录与模型调用。
  - 实时监控大盘：当前活跃模型、TPS 吞吐速率、平均延迟、成功率及请求吞吐。

- **精准会话追踪与全维审计日志**:
  - 完整记录每个模型请求的归属会话 (Session / Cascade ID)。
  - 实际上游路由模型识别：精准识别客户端请求模型与实际上游响应模型的路由映射 (如 `gemini-3.8-flash` 路由至 `gemini-3.8-flash-n`)。
  - 首字节响应延迟 (TTFB) 与生成速率 (TPS) 精确测算与展示。
  - 完整审计 Token 用量：输入 Token、输出 Token、缓存读取 Token 及思考 (Thinking) Token。

- **Token 深度统计分析**:
  - 支持按天、周、月及全量时间跨度审计本地会话消耗分布。
  - 直观展示模型家族与提供商消耗占比。
