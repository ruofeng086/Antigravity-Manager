# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.0] - 2026-11-14

### 🎉 Initial Official Release

Antigravity Manager v1.0.0 is a specialized, lightweight management tool built specifically for Antigravity, focusing on account lifecycle management, full-chain real-time monitoring, session-level auditing, and token analytics.

#### 🌟 Key Highlights

- **Ultra-Lightweight Architecture**:
  - Completely stripped out unnecessary commercial reseller and redundant proxy modules.
  - Built on Tauri v2 + Rust backend + React 19 frontend for minimal memory footprint and fast startup.

- **Antigravity Desktop Real-Time Ingestion**:
  - Live synchronization and tracking of Antigravity Desktop model executions and requests.
  - Comprehensive dashboard: active model, TPS throughput, average latency, and success rates.

- **Precise Session Tracing & Audit Logging**:
  - Full attribution of each model request to its corresponding conversation (Session / Cascade ID).
  - Upstream model resolution: catch drift between client requests and actual routed models (e.g. `gemini-3.8-flash` routed to `gemini-3.8-flash-n`).
  - Accurate measurement of Time-to-First-Byte (TTFB) and Tokens Per Second (TPS).
  - Complete token breakdown: Input, Output, Cache, and Thinking tokens.

- **Token Consumption Analytics**:
  - Historical auditing of local Antigravity sessions across day, week, month, and all-time windows.
  - Visual charts showing model family and provider distributions.
