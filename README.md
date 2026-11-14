# Antigravity Manager 🚀

> High-performance, lightweight account management, real-time observability, session-level audit, and token analytics for Antigravity.

<div align="center">
  <img src="public/icon.png" width="108" height="108" alt="Antigravity Manager Logo">
  <h3>Antigravity Manager</h3>
  <p>Streamlined · Low Latency · Session Tracing · Actual Model Routing · Deep Token Audit</p>

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
    <a href="#-features">Features</a> • 
    <a href="#-modules">Modules</a> • 
    <a href="#-download--installation">Download</a> • 
    <a href="#-development--build">Build</a> • 
    <a href="#-architecture">Architecture</a>
  </p>
</div>

---

## 🌟 Features

- 🎯 **Lightweight & High-Performance**: Purpose-built for Antigravity. Zero commercial bloat, minimal memory footprint.
- 🔄 **Actual Model Routing Identification**: Catches model drift between client requests and upstream endpoints (e.g., requested `gemini-3.8-flash` routed to `gemini-3.8-flash-control` or `gemini-3.8-flash-n`).
- ⚡ **Time-to-First-Byte (TTFB) & Tokens Per Second (TPS)**: Real-time latency tracking and output throughput measurement.
- 🆔 **Precise Session Attribution**: Extracted from headers and JSON payloads, complete with one-click filtering.
- 📊 **Historical Session Analytics**: Audits local Antigravity archive sessions across day, week, month, and all-time dimensions.
- 🛡️ **Account Health & Quota Routing**: Multi-account status polling, automated quota protection, and optimal account selection.

---

## 🖥️ Modules

### 1. Dashboard
- Account health status, quota utilization, and optimal account recommendation.

### 2. Accounts
- Centralized multi-account credentials and token management.
- Priority tagging, health checks, and instant quota refresh.

### 3. Monitor
- Live metrics: Active Model, Generation Rate (TPS), Average Latency, TTFB, Success Rate, and RPM.
- Active model usage distribution bar chart.
- Real-time proxy status indicator with 1-click startup toggle.

### 4. Logs
- Session-level request logging with speed-graded TTFB indicators.
- Upstream model routing mapping (`requested ➔ actual`).
- Slide-over inspection drawer for request/response headers and JSON payloads.

### 5. Statistics
- Comprehensive historical analysis of local Antigravity sessions.
- Stacked token consumption area charts (Input, Cache, Reasoning, Output) and provider distribution.

### 6. Settings
- Clean theme customization (Dark/Light/System) and UI scaling.
- Storage path and security configuration.

---

## 📦 Download & Installation

Visit [GitHub Releases](https://github.com/ruofeng086/Antigravity-Manager/releases) to download the latest executable.

| Platform | Installer | Description |
| :--- | :--- | :--- |
| **Windows x64** | `Antigravity-Manager-Setup.exe` | Recommended NSIS installer |

---

## 🛠️ Development & Build

### Prerequisites
- Node.js >= 18
- Rust >= 1.75
- Git

```bash
# Clone
git clone https://github.com/ruofeng086/Antigravity-Manager.git
cd Antigravity-Manager

# Install
npm install

# Dev
npm run dev

# Build
npm run build
npm run tauri build
```

---

## 🏗️ Architecture

- **Desktop Framework**: Tauri v2 + Rust
- **Frontend Stack**: React 19 + TypeScript + Vite + Tailwind CSS
- **Visualization**: Recharts + Framer Motion + Lucide Icons
- **Storage**: SQLite (rusqlite) + WAL mode
- **Proxy**: Axum + Tokio + Reqwest

---

### Acknowledgements
This project is developed based on the open-source repository [lbjlaq/Antigravity-Manager](https://github.com/lbjlaq/Antigravity-Manager). We appreciate the original authors' work.

### License
[CC-BY-NC-SA-4.0 License](LICENSE)
