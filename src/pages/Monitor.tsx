import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { request } from '../utils/request';
import { extractTtfbMs, calcTps } from './Logs';
import { listen } from '@tauri-apps/api/event';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProxyStats {
  total_requests: number;
  success_requests?: number;
  success_count?: number;
  error_requests?: number;
  error_count?: number;
  avg_latency_ms: number;
  avg_ttfb_ms?: number;
  requests_by_model?: Record<string, number>;
  requests_per_minute?: number;
  tps?: number;
}

interface ProxyStatus {
  running: boolean;
  port?: number;
  uptime_seconds?: number;
}

interface ProxyLog {
  id?: string;
  model?: string;
  mapped_model?: string;
  upstream_model?: string;
  status_code?: number;
  status?: number;
  duration_ms?: number;
  duration?: number;
  ttfb_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  created_at?: string;
  timestamp?: number;
  account_email?: string;
  session_id?: string;
  session_title?: string;
  response_headers?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtMs(ms?: number): string {
  if (ms == null || isNaN(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function fmtNum(n?: number): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtTime(val?: string | number): string {
  if (!val) return '—';
  const d = typeof val === 'number' ? new Date(val) : new Date(val);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function modelShortName(name?: string): string {
  if (!name) return '—';
  return name.replace(/^gemini-/, 'G-').replace(/-latest$/, '').replace(/-(\d{4})$/, '');
}

const MODEL_COLORS = [
  '#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706',
  '#dc2626', '#db2777', '#7c3aed', '#4f46e5', '#0f766e',
];

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, sub, trend, color = 'violet', delay = 0 }) => {
  const colorMap: Record<string, string> = {
    violet: 'from-violet-500/10 to-violet-500/5 border-violet-500/20 text-violet-400',
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-400',
    cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400',
    rose: 'from-rose-500/10 to-rose-500/5 border-rose-500/20 text-rose-400',
  };
  const cls = colorMap[color] ?? colorMap.violet;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-br backdrop-blur-sm p-4 flex gap-3 items-start ${cls}`}
    >
      {/* glow */}
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-30 bg-current" />
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5 truncate">{label}</p>
        <p className="text-xl font-bold text-white leading-tight">{value}</p>
        {sub && (
          <p className="text-xs mt-1 flex items-center gap-1 text-gray-400">
            {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-400" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3 text-rose-400" />}
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-gray-900/95 backdrop-blur px-3 py-2 text-sm shadow-xl">
      <p className="font-medium text-white mb-1 max-w-[200px] break-all">{label}</p>
      <p className="text-violet-400">{fmtNum(payload[0]?.value)} 请求</p>
    </div>
  );
};

// ─── Log Row ─────────────────────────────────────────────────────────────────

const statusColor = (code?: number) => {
  if (!code) return 'text-gray-500';
  if (code < 300) return 'text-emerald-400';
  if (code < 500) return 'text-amber-400';
  return 'text-rose-400';
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Monitor: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProxyStats | null>(null);
  const [status, setStatus] = useState<ProxyStatus | null>(null);
  const [logs, setLogs] = useState<ProxyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visibleRef = useRef(true);

  const handleCopy = (key: string, text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ── Prev stats for trend comparison
  const prevStatsRef = useRef<ProxyStats | null>(null);

  const [togglingProxy, setTogglingProxy] = useState(false);
  const [hideProxyTip, setHideProxyTip] = useState(false);

  const handleToggleProxy = async () => {
    setTogglingProxy(true);
    setError(null);
    try {
      if (status?.running) {
        await request('stop_proxy_service');
      } else {
        await request('start_proxy_service', {});
      }
      await fetchData();
    } catch (err: any) {
      console.error('Failed to toggle proxy service:', err);
      setError(err?.message || '代理服务控制失败');
    } finally {
      setTogglingProxy(false);
    }
  };

  const fetchData = useCallback(async () => {
    if (!visibleRef.current) return;
    try {
      const [proxyStats, proxyStatus, proxyLogs] = await Promise.allSettled([
        request<ProxyStats>('get_proxy_stats'),
        request<ProxyStatus>('get_proxy_status'),
        request<ProxyLog[]>('get_proxy_logs_filtered', {
          filter: '',
          errorsOnly: false,
          errors_only: false,
          limit: 50,
          offset: 0,
        }),
      ]);

      if (proxyStats.status === 'fulfilled' && proxyStats.value) {
        prevStatsRef.current = stats;
        setStats(proxyStats.value);
      }
      if (proxyStatus.status === 'fulfilled') setStatus(proxyStatus.value);
      
      let loadedLogs: ProxyLog[] = [];
      if (proxyLogs.status === 'fulfilled' && Array.isArray(proxyLogs.value) && proxyLogs.value.length > 0) {
        loadedLogs = proxyLogs.value;
      } else {
        // Fallback to memory buffer if filtered query returns empty
        try {
          const memLogs = await request<ProxyLog[]>('get_proxy_logs', { limit: 50 });
          if (Array.isArray(memLogs) && memLogs.length > 0) {
            loadedLogs = memLogs;
          }
        } catch (_) {}
      }
      if (loadedLogs.length > 0) {
        setLogs(loadedLogs);
      }
      setLastUpdated(new Date());
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? '数据获取失败');
    } finally {
      setLoading(false);
    }
  }, [stats]);

  // ── Polling & Live Stream Listener
  useEffect(() => {
    fetchData();

    // Listen for real-time proxy request events
    let unlisten: (() => void) | undefined;
    listen<ProxyLog>('proxy://request', (event) => {
      if (event.payload) {
        const newLog = event.payload;
        setLogs((prev) => [newLog, ...prev.slice(0, 49)]);
        setStats((prev) => {
          if (!prev) return prev;
          const isSuccess = (newLog.status ?? 200) < 400;
          return {
            ...prev,
            total_requests: (prev.total_requests || 0) + 1,
            success_requests: isSuccess ? ((prev.success_requests ?? prev.success_count ?? 0) + 1) : prev.success_requests,
            success_count: isSuccess ? ((prev.success_count ?? 0) + 1) : prev.success_count,
            error_requests: !isSuccess ? ((prev.error_requests ?? prev.error_count ?? 0) + 1) : prev.error_requests,
            error_count: !isSuccess ? ((prev.error_count ?? 0) + 1) : prev.error_count,
          };
        });
      }
    }).then((fn) => { unlisten = fn; }).catch(() => {});

    const handleVisibility = () => {
      visibleRef.current = !document.hidden;
      if (!document.hidden) fetchData();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    timerRef.current = setInterval(() => {
      if (visibleRef.current) fetchData();
    }, 5000);

    return () => {
      if (unlisten) unlisten();
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived values
  const isRunning = status?.running ?? false;
  const totalReqs = stats?.total_requests ?? 0;
  const successReqs = stats?.success_requests ?? stats?.success_count ?? 0;
  const errorReqs = stats?.error_requests ?? stats?.error_count ?? 0;
  const avgLatency = React.useMemo(() => {
    if (stats?.avg_latency_ms != null && stats.avg_latency_ms > 0) {
      return stats.avg_latency_ms;
    }
    const validDurations = logs
      .map((l) => l.duration || l.duration_ms || 0)
      .filter((d) => d > 0);
    if (validDurations.length === 0) return undefined;
    return Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length);
  }, [stats?.avg_latency_ms, logs]);

  const avgTtfb = stats?.avg_ttfb_ms;

  const rpm = React.useMemo(() => {
    if (stats?.requests_per_minute != null && stats.requests_per_minute > 0) {
      return stats.requests_per_minute;
    }
    if (logs.length < 2) return undefined;
    const timestamps = logs.map((l) => l.timestamp || 0).filter((t) => t > 0);
    if (timestamps.length < 2) return undefined;
    const minT = Math.min(...timestamps);
    const maxT = Math.max(...timestamps);
    const diffMin = (maxT - minT) / 60000;
    if (diffMin <= 0.05) return Number(logs.length.toFixed(1));
    return Number((logs.length / Math.max(0.5, diffMin)).toFixed(1));
  }, [stats?.requests_per_minute, logs]);
  const prevLatency = prevStatsRef.current?.avg_latency_ms;

  const latencyTrend: 'up' | 'down' | 'neutral' =
    prevLatency == null || avgLatency == null
      ? 'neutral'
      : avgLatency < prevLatency
      ? 'down'
      : avgLatency > prevLatency
      ? 'up'
      : 'neutral';

  // ── Model chart data
  const modelChartData = React.useMemo(() => {
    const byModel = stats?.requests_by_model ?? {};
    return Object.entries(byModel)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [stats]);

  // ── Latest model from logs
  const latestModel = React.useMemo(() => {
    for (const log of logs) {
      const m = log.upstream_model ?? log.mapped_model ?? log.model;
      if (m) return m;
    }
    return null;
  }, [logs]);

  // ── Computed TPS from recent logs (output_tokens / duration_ms * 1000)
  const computedTps = React.useMemo(() => {
    const recent = logs.slice(0, 10).filter(l => l.output_tokens && (l.duration_ms || l.duration));
    if (!recent.length) return null;
    const tps = recent.reduce((acc, l) => {
      const dur = l.duration_ms ?? l.duration ?? 0;
      return acc + (dur > 0 ? (l.output_tokens! / dur) * 1000 : 0);
    }, 0) / recent.length;
    return tps > 0 ? tps : null;
  }, [logs]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="h-full flex flex-col p-5 sm:p-6 gap-5 w-full overflow-y-auto"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Activity className="w-6 h-6 text-violet-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-400 animate-ping" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">实时监控</h1>
          {lastUpdated && (
            <span className="text-xs text-gray-500 ml-1">
              更新于 {fmtTime(lastUpdated.getTime())}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Interactive Proxy Status Control */}
          <AnimatePresence mode="wait">
            <motion.button
              key={isRunning ? 'running' : 'stopped'}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={handleToggleProxy}
              disabled={togglingProxy}
              title={isRunning ? '点击停止代理服务' : '点击启动代理服务'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                isRunning
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 shadow-lg shadow-amber-500/10 animate-pulse'
              }`}
            >
              {isRunning ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>代理运行中</span>
                  {status?.port && <span className="opacity-60">:{status.port}</span>}
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>代理未运行 · 点击启动</span>
                </>
              )}
              {togglingProxy && <RefreshCw className="w-3 h-3 animate-spin ml-1" />}
            </motion.button>
          </AnimatePresence>

          {/* Refresh button */}
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stopped service info banner (calm & informative) ── */}
      {!isRunning && !hideProxyTip && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>Antigravity 原生桌面端监控已激活 (实时同步会话与真实模型路由)。如需为外部应用提供 API 反代接口，可按需启动 8045 服务。</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleProxy}
              disabled={togglingProxy}
              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all cursor-pointer shadow-sm"
            >
              {togglingProxy ? '正在启动...' : '启动 8045 代理'}
            </button>
            <button
              onClick={() => setHideProxyTip(true)}
              className="p-1 text-gray-400 hover:text-white rounded-md transition-colors cursor-pointer"
              title="关闭提示"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          delay={0}
          color="violet"
          icon={<Cpu className="w-4 h-4 text-violet-400" />}
          label="当前实际路由模型"
          value={latestModel ? latestModel : '—'}
          sub={logs[0]?.model && latestModel !== logs[0].model ? `客户端请求: ${logs[0].model}` : (latestModel ? 'Google 物理端点' : undefined)}
        />
        <StatCard
          delay={0.05}
          color="cyan"
          icon={<Zap className="w-4 h-4 text-cyan-400" />}
          label="TPS 速率"
          value={computedTps != null ? `${computedTps.toFixed(1)} t/s` : '—'}
          sub="近10条请求均值"
        />
        <StatCard
          delay={0.1}
          color="amber"
          icon={<Clock className="w-4 h-4 text-amber-400" />}
          label="平均延迟"
          value={fmtMs(avgLatency)}
          sub={avgTtfb != null ? `TTFT ${fmtMs(avgTtfb)}` : undefined}
          trend={latencyTrend === 'down' ? 'down' : latencyTrend === 'up' ? 'up' : undefined}
        />
        <StatCard
          delay={0.15}
          color="emerald"
          icon={<BarChart3 className="w-4 h-4 text-emerald-400" />}
          label="总请求数"
          value={fmtNum(totalReqs)}
          sub={`${fmtNum(successReqs)} 成功 · ${fmtNum(errorReqs)} 失败`}
        />
      </div>

      {/* ── Secondary stats row ── */}
      {(rpm != null || successReqs > 0 || errorReqs > 0) && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 flex flex-col gap-1">
            <span className="text-xs text-gray-500">每分钟请求</span>
            <span className="text-sm font-semibold text-white">{rpm != null ? `${rpm.toFixed(1)} req/min` : '—'}</span>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 flex flex-col gap-1">
            <span className="text-xs text-gray-500">成功率</span>
            <span className="text-sm font-semibold text-emerald-400">
              {totalReqs > 0 ? `${((successReqs / totalReqs) * 100).toFixed(1)}%` : '—'}
            </span>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 flex flex-col gap-1">
            <span className="text-xs text-gray-500">错误率</span>
            <span className={`text-sm font-semibold ${errorReqs > 0 ? 'text-rose-400' : 'text-gray-400'}`}>
              {totalReqs > 0 ? `${((errorReqs / totalReqs) * 100).toFixed(1)}%` : '—'}
            </span>
          </div>
        </div>
      )}

      {/* ── Model distribution chart ── */}
      {modelChartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="rounded-xl border border-white/8 bg-white/[0.03] p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">模型使用分布</h2>
            <span className="text-xs text-gray-500 ml-auto">按请求数</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={modelChartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickFormatter={modelShortName}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtNum}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {modelChartData.map((_, idx) => (
                  <Cell key={idx} fill={MODEL_COLORS[idx % MODEL_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* ── Recent Logs Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
        className="rounded-xl border border-white/8 bg-white/[0.03] overflow-hidden flex-1 min-h-0 flex flex-col"
      >
        {/* table header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.01]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">最近请求日志</h2>
            {logs.length > 0 && (
              <span className="text-xs text-gray-500">（近 {logs.length} 条）</span>
            )}
          </div>
          <button
            onClick={() => navigate('/logs')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-violet-500/25 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 transition-all"
          >
            <span>进入日志中心 / 详情过滤</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
            <Activity className="w-8 h-8 opacity-30" />
            <span className="text-sm">{loading ? '加载中…' : '暂无日志数据'}</span>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 bg-black/20">
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">时间</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">所属会话 (Session)</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">模型路由 (实际模型)</th>
                  <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">首字节 (TTFB)</th>
                  <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">总耗时</th>
                  <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">生成速率 (TPS)</th>
                  <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">Token (入 / 出)</th>
                  <th className="px-4 py-2.5 text-center font-medium whitespace-nowrap">状态</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => {
                  const code = log.status_code ?? log.status;
                  const duration = log.duration_ms ?? log.duration;
                  const time = log.created_at ?? log.timestamp;
                  const reqModel = log.model;
                  const actModel = log.upstream_model ?? log.mapped_model ?? log.model;
                  const isRerouted = reqModel && actModel && reqModel !== actModel;
                  const ttfb = extractTtfbMs(log as any);
                  const tps = calcTps(log.output_tokens, duration);

                  return (
                    <motion.tr
                      key={log.id ?? idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.01 }}
                      onClick={() => navigate('/logs')}
                      className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors group cursor-pointer"
                    >
                      <td className="px-4 py-2.5 text-gray-400 font-mono whitespace-nowrap">
                        {fmtTime(time)}
                      </td>

                      {/* Session ID / Title */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {log.session_id ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              title={`会话: ${log.session_title || log.session_id}\nID: ${log.session_id}`}
                              className="px-2 py-0.5 rounded font-medium text-[11px] bg-violet-500/10 border border-violet-500/20 text-violet-300 max-w-[200px] truncate block"
                            >
                              {log.session_title || (log.session_id.length > 14
                                ? `${log.session_id.slice(0, 6)}...${log.session_id.slice(-4)}`
                                : log.session_id)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(`mon-session-${idx}`, log.session_id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-white transition-opacity"
                              title={`复制会话 ID: ${log.session_id}`}
                            >
                              {copiedKey === `mon-session-${idx}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-600 font-mono text-[10px]">未绑定会话</span>
                        )}
                      </td>

                      {/* Model & Routing */}
                      <td className="px-4 py-2.5 max-w-[220px]">
                        {isRerouted ? (
                          <div className="flex items-center gap-1 truncate">
                            <span className="text-gray-400 text-[10px] line-through truncate max-w-[80px]" title={`请求: ${reqModel}`}>
                              {reqModel}
                            </span>
                            <ArrowRight className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                            <span
                              className="text-emerald-300 font-mono text-[11px] font-medium truncate max-w-[120px]"
                              title={`Google 真实物理路由模型: ${actModel}`}
                            >
                              {actModel}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-200 truncate block font-medium" title={actModel}>
                            {actModel ? modelShortName(actModel) : '—'}
                          </span>
                        )}
                      </td>

                      {/* TTFB */}
                      <td className="px-4 py-2.5 text-right font-mono whitespace-nowrap">
                        <span className={ttfb && ttfb < 1000 ? 'text-emerald-400 font-medium' : 'text-gray-300'}>
                          {fmtMs(ttfb)}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-2.5 text-right text-gray-300 font-mono whitespace-nowrap">
                        {fmtMs(duration)}
                      </td>

                      {/* TPS */}
                      <td className="px-4 py-2.5 text-right font-mono whitespace-nowrap">
                        {tps != null ? (
                          <span className="text-cyan-400 font-medium">
                            {tps.toFixed(1)} t/s
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* Tokens */}
                      <td className="px-4 py-2.5 text-right text-gray-400 font-mono whitespace-nowrap">
                        <span>{fmtNum(log.input_tokens)}</span>
                        <span className="text-gray-600 mx-1">/</span>
                        <span className="text-gray-200">{fmtNum(log.output_tokens)}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-2.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 font-mono font-medium ${statusColor(code)}`}>
                          {code && code < 300 ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : code ? (
                            <AlertCircle className="w-3 h-3" />
                          ) : null}
                          {code ?? '—'}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Monitor;
