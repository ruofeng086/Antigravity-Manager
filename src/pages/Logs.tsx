import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  Download,
  Eye,
  Filter,
  RefreshCw,
  ScrollText,
  Search,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { request } from '../utils/request';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from '../utils/env';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProxyLog {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  status: number;
  duration: number; // ms
  model?: string; // 客户端请求模型
  mapped_model?: string; // 实际路由模型
  upstream_model?: string; // 上游响应模型
  account_email?: string;
  client_ip?: string;
  error?: string;
  request_body?: string;
  upstream_request_body?: string;
  response_body?: string;
  request_headers?: string;
  upstream_request_headers?: string;
  response_headers?: string;
  input_tokens?: number;
  output_tokens?: number;
  cached_tokens?: number;
  reasoning_tokens?: number;
  protocol?: string;
  username?: string;
  session_id?: string;
  session_title?: string;
  // 前端辅助字段
  ttfb_ms?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function extractTtfbMs(log: ProxyLog): number | undefined {
  if (log.ttfb_ms != null && log.ttfb_ms > 0) return log.ttfb_ms;
  if (log.response_headers) {
    try {
      const headers =
        typeof log.response_headers === 'string'
          ? JSON.parse(log.response_headers)
          : log.response_headers;
      const val =
        headers['x-timing-ttft-ms'] ||
        headers['x-timing-headers-ms'] ||
        headers['ttft_ms'] ||
        headers['ttfb_ms'];
      if (val) {
        const n = parseFloat(val);
        if (!isNaN(n) && n > 0) return n;
      }
    } catch {
      // ignore JSON parse error
    }
  }
  return undefined;
}

export function calcTps(outputTokens?: number, durationMs?: number): number | null {
  if (!outputTokens || !durationMs || durationMs <= 0) return null;
  const tps = (outputTokens / durationMs) * 1000;
  return isFinite(tps) && tps > 0 ? tps : null;
}

export function fmtMs(ms?: number): string {
  if (ms == null || isNaN(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function fmtNum(n?: number): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function fmtTime(val?: number): string {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  const timeStr = d.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${timeStr}.${ms}`;
}

export function fmtDate(val?: number): string {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function modelShort(name?: string): string {
  if (!name) return '—';
  return name.replace(/^gemini-/, 'G-').replace(/-latest$/, '');
}

// ─── Component ───────────────────────────────────────────────────────────────

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<ProxyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ProxyLog | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [sessionFilter, setSessionFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [modelFilter, setModelFilter] = useState<'all' | 'gemini' | 'claude' | 'gpt'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Detail Modal Tab
  const [detailTab, setDetailTab] = useState<'info' | 'headers' | 'body'>('info');

  const visibleRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const filterStr = sessionFilter ? sessionFilter : searchText.trim();
      const errorsOnly = statusFilter === 'error';

      const [resLogs, resCount] = await Promise.allSettled([
        request<ProxyLog[]>('get_proxy_logs_filtered', {
          filter: filterStr,
          errorsOnly: errorsOnly,
          errors_only: errorsOnly,
          limit: 100,
          offset: 0,
        }),
        request<number>('get_proxy_logs_count_filtered', {
          filter: filterStr,
          errorsOnly: errorsOnly,
          errors_only: errorsOnly,
        }),
      ]);

      let logsList: ProxyLog[] = [];
      if (resLogs.status === 'fulfilled' && Array.isArray(resLogs.value) && resLogs.value.length > 0) {
        logsList = resLogs.value;
      } else {
        // Fallback to memory logs buffer if DB query returns empty
        try {
          const memLogs = await request<ProxyLog[]>('get_proxy_logs', { limit: 100 });
          if (Array.isArray(memLogs) && memLogs.length > 0) {
            logsList = memLogs;
          }
        } catch (_) {}
      }
      if (logsList.length > 0) {
        setLogs(logsList);
      }
      if (resCount.status === 'fulfilled' && typeof resCount.value === 'number') {
        setTotalCount(resCount.value);
      } else if (logsList.length > 0) {
        setTotalCount(logsList.length);
      }
    } catch (err) {
      console.error('Failed to load proxy logs:', err);
    } finally {
      setLoading(false);
    }
  }, [searchText, sessionFilter, statusFilter]);

  // Initial fetch and auto refresh
  useEffect(() => {
    fetchLogs();

    const handleVisibility = () => {
      visibleRef.current = !document.hidden;
      if (!document.hidden && autoRefresh) fetchLogs();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    if (autoRefresh) {
      timerRef.current = setInterval(() => {
        if (visibleRef.current) fetchLogs();
      }, 4000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchLogs, autoRefresh]);

  // Real-time event listener via Tauri
  useEffect(() => {
    if (!isTauri()) return;
    let unlistenFn: (() => void) | undefined;
    listen<ProxyLog>('proxy://request', (event) => {
      if (event.payload) {
        setLogs((prev) => [event.payload, ...prev.slice(0, 199)]);
        setTotalCount((c) => c + 1);
      }
    }).then((un) => {
      unlistenFn = un;
    });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  // Filter logs locally if model filter is applied
  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      // Model family filter
      if (modelFilter !== 'all') {
        const m = (log.mapped_model || log.upstream_model || log.model || '').toLowerCase();
        if (modelFilter === 'gemini' && !m.includes('gemini')) return false;
        if (modelFilter === 'claude' && !m.includes('claude')) return false;
        if (modelFilter === 'gpt' && !m.includes('gpt') && !m.includes('openai')) return false;
      }
      // Status filter
      if (statusFilter === 'success' && (log.status < 200 || log.status >= 400)) return false;
      if (statusFilter === 'error' && log.status < 400) return false;

      // Session Filter
      if (sessionFilter && log.session_id !== sessionFilter) return false;

      return true;
    });
  }, [logs, modelFilter, statusFilter, sessionFilter]);

  // Open Log Detail
  const handleOpenDetail = async (log: ProxyLog) => {
    setSelectedLog(log);
    setDetailLoading(true);
    setDetailTab('info');
    try {
      const fullLog = await request<ProxyLog>('get_proxy_log_detail', { logId: log.id });
      if (fullLog) {
        setSelectedLog(fullLog);
      }
    } catch {
      // keep selectedLog with summary info
    } finally {
      setDetailLoading(false);
    }
  };

  // Clear Logs
  const handleClearLogs = async () => {
    if (!window.confirm('确定要清空所有请求日志吗？该操作不可撤销。')) return;
    try {
      await request('clear_proxy_logs');
      setLogs([]);
      setTotalCount(0);
      setSelectedLog(null);
    } catch (e: any) {
      alert(`清空失败: ${e?.message ?? e}`);
    }
  };

  // Copy to clipboard
  const handleCopy = (key: string, text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Export logs to JSON
  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `antigravity-logs-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="h-full flex flex-col p-5 sm:p-6 gap-4 w-full overflow-hidden"
    >
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <ScrollText className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">请求日志</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-white/5 border border-white/10 text-gray-400">
                {totalCount} 条记录
              </span>
            </div>
            <p className="text-xs text-gray-500">
              精确监控每个请求的会话归属、实际路由模型、首字节耗时 (TTFB) 与输出速率 (TPS)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto Refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              autoRefresh
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? '自动刷新中' : '自动刷新已暂停'}
          </button>

          {/* Refresh button */}
          <button
            onClick={() => {
              setLoading(true);
              fetchLogs();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>

          {/* Export button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            导出
          </button>

          {/* Clear button */}
          <button
            onClick={handleClearLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空
          </button>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-xl border border-white/8 bg-white/[0.02] backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索会话 ID / 模型名称 / URL / IP..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            {searchText && (
              <button
                onClick={() => setSearchText('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Active Session Filter Tag */}
          {sessionFilter && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs">
              <span>会话: {sessionFilter.slice(0, 14)}...</span>
              <button onClick={() => setSessionFilter(null)} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Segment */}
          <div className="flex items-center rounded-lg p-0.5 bg-black/30 border border-white/10 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'all' ? 'bg-violet-600 text-white font-medium' : 'text-gray-400 hover:text-white'
              }`}
            >
              全部状态
            </button>
            <button
              onClick={() => setStatusFilter('success')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'success' ? 'bg-emerald-600 text-white font-medium' : 'text-gray-400 hover:text-white'
              }`}
            >
              成功 (2xx)
            </button>
            <button
              onClick={() => setStatusFilter('error')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'error' ? 'bg-rose-600 text-white font-medium' : 'text-gray-400 hover:text-white'
              }`}
            >
              失败 (4xx/5xx)
            </button>
          </div>

          {/* Model Family Filter */}
          <div className="flex items-center gap-1 rounded-lg p-0.5 bg-black/30 border border-white/10 text-xs">
            <Filter className="w-3.5 h-3.5 text-gray-500 ml-2" />
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value as any)}
              className="bg-transparent text-gray-300 text-xs pr-3 py-1 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-gray-900 text-white">所有模型家族</option>
              <option value="gemini" className="bg-gray-900 text-white">Gemini 家族</option>
              <option value="claude" className="bg-gray-900 text-white">Claude 家族</option>
              <option value="gpt" className="bg-gray-900 text-white">GPT / OpenAI</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Logs Table ── */}
      <div className="rounded-xl border border-white/8 bg-white/[0.02] flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1 overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-white/10 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">时间</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">所属会话 (Session)</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">模型路由 (实际模型)</th>
                <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">首字节耗时 (TTFB)</th>
                <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">总耗时</th>
                <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">生成速率 (TPS)</th>
                <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Token (入 / 出)</th>
                <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">状态</th>
                <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 opacity-40 text-violet-400" />
                    正在载入日志数据...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center text-gray-500">
                    <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    没有匹配的请求日志记录
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const ttfb = extractTtfbMs(log);
                  const tps = calcTps(log.output_tokens, log.duration);
                  const reqModel = log.model;
                  const actModel = log.upstream_model || log.mapped_model || log.model;
                  const isRerouted = reqModel && actModel && reqModel !== actModel;

                  // TTFB Color scheme
                  const ttfbColor =
                    ttfb == null
                      ? 'text-gray-500'
                      : ttfb < 500
                      ? 'text-emerald-400'
                      : ttfb < 1500
                      ? 'text-cyan-400'
                      : 'text-amber-400';

                  // Status Code Color
                  const statusOk = log.status >= 200 && log.status < 300;
                  const statusWarning = log.status >= 300 && log.status < 400;

                  return (
                    <tr
                      key={log.id}
                      onClick={() => handleOpenDetail(log)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      {/* Time */}
                      <td className="px-4 py-3 font-mono text-gray-300 whitespace-nowrap">
                        {fmtTime(log.timestamp)}
                      </td>

                      {/* Session ID / Title */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.session_id ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setSessionFilter(log.session_id!);
                              }}
                              title={`会话: ${log.session_title || log.session_id}\nID: ${log.session_id}\n点击筛选该会话`}
                              className="px-2 py-0.5 rounded font-medium text-[11px] bg-violet-500/10 border border-violet-500/25 text-violet-300 hover:bg-violet-500/20 transition-colors max-w-[200px] truncate block cursor-pointer"
                            >
                              {log.session_title || (log.session_id.length > 16
                                ? `${log.session_id.slice(0, 8)}...${log.session_id.slice(-6)}`
                                : log.session_id)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(`session-${log.id}`, log.session_id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-white transition-opacity"
                              title={`复制完整会话ID: ${log.session_id}`}
                            >
                              {copiedKey === `session-${log.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-600 font-mono">未绑定会话</span>
                        )}
                      </td>

                      {/* Model & Routing */}
                      <td className="px-4 py-3 max-w-[280px]">
                        <div className="flex flex-col gap-0.5">
                          {isRerouted ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-gray-400 font-mono text-[11px] line-through truncate max-w-[110px]" title={`请求模型: ${reqModel}`}>
                                {reqModel}
                              </span>
                              <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span
                                className="px-1.5 py-0.5 rounded font-mono font-medium text-[11px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 truncate max-w-[140px]"
                                title={`Google 真实物理路由端点: ${actModel}`}
                              >
                                {actModel}
                              </span>
                            </div>
                          ) : (
                            <span
                              className="font-mono text-gray-200 truncate block font-medium"
                              title={actModel || 'unknown'}
                            >
                              {actModel ? modelShort(actModel) : '—'}
                              {actModel && (
                                <span className="text-[10px] text-gray-500 ml-1.5 font-normal">
                                  {actModel}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* TTFB */}
                      <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                        <span className={`font-semibold ${ttfbColor}`}>
                          {fmtMs(ttfb)}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3 text-right font-mono text-gray-300 whitespace-nowrap">
                        {fmtMs(log.duration)}
                      </td>

                      {/* TPS */}
                      <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                        {tps != null ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                            <Zap className="w-2.5 h-2.5" />
                            {tps.toFixed(1)} t/s
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* Tokens */}
                      <td className="px-4 py-3 text-right font-mono text-gray-400 whitespace-nowrap">
                        <span>{fmtNum(log.input_tokens)}</span>
                        <span className="text-gray-600 mx-1">/</span>
                        <span className="text-gray-200">{fmtNum(log.output_tokens)}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[11px] font-medium border ${
                            statusOk
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : statusWarning
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          }`}
                        >
                          {statusOk ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {log.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(log);
                          }}
                          className="px-2 py-1 rounded text-[11px] text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          详情
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Slide-over Detail Drawer ── */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="w-full max-w-2xl h-full bg-gray-950 border-l border-white/10 flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      请求详情
                      <span className="font-mono text-xs text-gray-400">#{selectedLog.id.slice(0, 8)}</span>
                    </h2>
                    <p className="text-xs text-gray-500">{fmtDate(selectedLog.timestamp)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy('log-json', JSON.stringify(selectedLog, null, 2))}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300"
                  >
                    {copiedKey === 'log-json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    复制完整日志
                  </button>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Navigation Tabs */}
              <div className="flex items-center px-5 border-b border-white/10 gap-4 text-xs font-medium">
                <button
                  onClick={() => setDetailTab('info')}
                  className={`py-3 border-b-2 transition-colors ${
                    detailTab === 'info'
                      ? 'border-violet-500 text-violet-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  基本指标与耗时
                </button>
                <button
                  onClick={() => setDetailTab('headers')}
                  className={`py-3 border-b-2 transition-colors ${
                    detailTab === 'headers'
                      ? 'border-violet-500 text-violet-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  报文头 (Headers)
                </button>
                <button
                  onClick={() => setDetailTab('body')}
                  className={`py-3 border-b-2 transition-colors ${
                    detailTab === 'body'
                      ? 'border-violet-500 text-violet-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  报文体 (Payload)
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {detailLoading && (
                  <div className="flex items-center gap-2 text-xs text-violet-400 p-2 rounded bg-violet-500/10 border border-violet-500/20">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    正在同步载入服务端完整报文体与响应头...
                  </div>
                )}

                {detailTab === 'info' && (
                  <>
                    {/* Key Metrics Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl border border-white/8 bg-white/[0.03]">
                        <span className="text-[11px] text-gray-500 block mb-1">首字节耗时 (TTFB)</span>
                        <span className="text-base font-bold font-mono text-cyan-400">
                          {fmtMs(extractTtfbMs(selectedLog))}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl border border-white/8 bg-white/[0.03]">
                        <span className="text-[11px] text-gray-500 block mb-1">总耗时</span>
                        <span className="text-base font-bold font-mono text-white">
                          {fmtMs(selectedLog.duration)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl border border-white/8 bg-white/[0.03]">
                        <span className="text-[11px] text-gray-500 block mb-1">生成速率 (TPS)</span>
                        <span className="text-base font-bold font-mono text-emerald-400 flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          {calcTps(selectedLog.output_tokens, selectedLog.duration)?.toFixed(1) ?? '—'} t/s
                        </span>
                      </div>
                    </div>

                    {/* Session Box */}
                    <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> 所属会话 (Session)
                        </span>
                        {selectedLog.session_id && (
                          <button
                            onClick={() => handleCopy('session-detail', selectedLog.session_id)}
                            className="text-xs text-violet-400 hover:text-white flex items-center gap-1 transition-colors"
                          >
                            {copiedKey === 'session-detail' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            复制会话 ID
                          </button>
                        )}
                      </div>
                      {selectedLog.session_title && (
                        <div className="text-sm font-bold text-white mb-2 px-0.5">
                          {selectedLog.session_title}
                        </div>
                      )}
                      <div className="font-mono text-xs text-gray-300 break-all bg-black/40 p-2.5 rounded-lg border border-white/5">
                        <span className="text-gray-500 block text-[10px] mb-0.5 uppercase tracking-wider">Session ID</span>
                        {selectedLog.session_id || '该请求未附带或未识别到会话标识'}
                      </div>
                    </div>

                    {/* Model Resolution Box */}
                    <div className="p-4 rounded-xl border border-white/8 bg-white/[0.03]">
                      <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 mb-3">
                        <Cpu className="w-3.5 h-3.5 text-violet-400" /> 模型路由解析
                      </span>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500 block mb-0.5">客户端请求模型:</span>
                          <span className="font-mono font-medium text-white break-all">
                            {selectedLog.model || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block mb-0.5">实际物理路由端点 (Google 真实模型):</span>
                          <span className="font-mono font-medium text-emerald-400 break-all">
                            {selectedLog.upstream_model || selectedLog.mapped_model || selectedLog.model || '—'}
                          </span>
                          {selectedLog.mapped_model && selectedLog.mapped_model !== (selectedLog.upstream_model || selectedLog.model) && (
                            <span className="text-[10px] text-gray-400 block mt-0.5">
                              品类/计费档位: {selectedLog.mapped_model}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tokens Details */}
                    <div className="p-4 rounded-xl border border-white/8 bg-white/[0.03]">
                      <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 mb-3">
                        <Zap className="w-3.5 h-3.5 text-amber-400" /> Token 用量明细
                      </span>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="p-2 rounded bg-black/30">
                          <span className="text-gray-500 block text-[10px]">输入 Token</span>
                          <span className="font-mono font-semibold text-white">{fmtNum(selectedLog.input_tokens)}</span>
                        </div>
                        <div className="p-2 rounded bg-black/30">
                          <span className="text-gray-500 block text-[10px]">输出 Token</span>
                          <span className="font-mono font-semibold text-cyan-400">{fmtNum(selectedLog.output_tokens)}</span>
                        </div>
                        <div className="p-2 rounded bg-black/30">
                          <span className="text-gray-500 block text-[10px]">缓存命中</span>
                          <span className="font-mono font-semibold text-emerald-400">{fmtNum(selectedLog.cached_tokens)}</span>
                        </div>
                        <div className="p-2 rounded bg-black/30">
                          <span className="text-gray-500 block text-[10px]">思考/推理</span>
                          <span className="font-mono font-semibold text-purple-400">{fmtNum(selectedLog.reasoning_tokens)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Network & Account Info */}
                    <div className="p-4 rounded-xl border border-white/8 bg-white/[0.03] space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-500">请求方法 / 路径</span>
                        <span className="font-mono text-white">{selectedLog.method} {selectedLog.url}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-500">HTTP 状态码</span>
                        <span className="font-mono text-white">{selectedLog.status}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                        <span className="text-gray-500">实际执行账号</span>
                        {selectedLog.account_email ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-emerald-400 font-medium">{selectedLog.account_email}</span>
                            {selectedLog.protocol === 'antigravity-desktop' && (
                              <span className="text-[10px] text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
                                桌面端执行账号
                              </span>
                            )}
                          </div>
                        ) : selectedLog.protocol === 'antigravity-desktop' ? (
                          <span className="font-mono text-violet-300 text-[11px] bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                            Antigravity Desktop (原生桌面端直接调用)
                          </span>
                        ) : (
                          <span className="font-mono text-gray-500">—</span>
                        )}
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-500">客户端 IP</span>
                        <span className="font-mono text-white">{selectedLog.client_ip || '—'}</span>
                      </div>
                    </div>
                  </>
                )}

                {detailTab === 'headers' && (
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-semibold text-gray-300 block mb-2">响应报文头 (Response Headers)</span>
                      <pre className="p-3 rounded-lg bg-black/50 border border-white/5 font-mono text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-60">
                        {selectedLog.response_headers
                          ? JSON.stringify(JSON.parse(selectedLog.response_headers), null, 2)
                          : '无响应头信息'}
                      </pre>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-300 block mb-2">请求报文头 (Request Headers)</span>
                      <pre className="p-3 rounded-lg bg-black/50 border border-white/5 font-mono text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-60">
                        {selectedLog.request_headers
                          ? JSON.stringify(JSON.parse(selectedLog.request_headers), null, 2)
                          : '无请求头信息'}
                      </pre>
                    </div>
                  </div>
                )}

                {detailTab === 'body' && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-300">响应体 (Response Body)</span>
                        {selectedLog.response_body && (
                          <button
                            onClick={() => handleCopy('resp-body', selectedLog.response_body)}
                            className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                          >
                            {copiedKey === 'resp-body' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            复制
                          </button>
                        )}
                      </div>
                      <pre className="p-3 rounded-lg bg-black/50 border border-white/5 font-mono text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-72">
                        {selectedLog.response_body || '无响应报文体（或未启用报文落库）'}
                      </pre>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-300">请求体 (Request Body)</span>
                        {selectedLog.request_body && (
                          <button
                            onClick={() => handleCopy('req-body', selectedLog.request_body)}
                            className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                          >
                            {copiedKey === 'req-body' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            复制
                          </button>
                        )}
                      </div>
                      <pre className="p-3 rounded-lg bg-black/50 border border-white/5 font-mono text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-72">
                        {selectedLog.request_body || '无请求报文体'}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Logs;
