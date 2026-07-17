import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import AppShell from "@/components/AppShell";
import Seo from "@/components/Seo";
import { cn } from "@/lib/utils";
import { createChart, ColorType, AreaSeries, type UTCTimestamp } from "lightweight-charts";
import {
  Zap, Play, Pause, RotateCcw, Brain, TrendingUp, TrendingDown,
  Activity, Target, Shield, BarChart2, ChevronRight, CheckCircle2,
  XCircle, Clock, Settings2, Search, Wallet, Trophy, AlertTriangle,
  Sparkles, ArrowUpRight, ArrowDownRight, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createBotState, optimise, tickBot,
  type BotState, type BotTrade
} from "@/lib/auto-bot";
import { type Candle } from "@/lib/strategy-engine";

// ── Constants ─────────────────────────────────────────────────────────────

const PAIRS = [
  "BTCUSD","BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT",
  "ADAUSDT","DOGEUSDT","AVAXUSDT","LINKUSDT","MATICUSDT",
];

const TF_MAP: Record<string, string> = {
  "1m":"1m","5m":"5m","15m":"15m","30m":"30m",
  "1H":"1h","4H":"4h","1D":"1d","1W":"1w",
};

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtNum(n: number, dec = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

function fmtPct(n: number, showPlus = true) {
  return `${showPlus && n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function fmtTs(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString("en-US", { hour12: false });
}

// ── Stat card ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, positive, icon: Icon, glow }: {
  label: string; value: string; sub?: string;
  positive?: boolean; icon: any; glow?: string;
}) {
  return (
    <div className={cn(
      "relative bg-card/60 border border-border/40 rounded-2xl p-4 flex flex-col gap-2 overflow-hidden",
      glow && `shadow-lg ${glow}`
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</span>
        <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center",
          positive === true  ? "bg-emerald-500/15 text-emerald-400" :
          positive === false ? "bg-rose-500/15 text-rose-400" :
          "bg-primary/15 text-primary"
        )}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className={cn("text-2xl font-bold tracking-tight",
        positive === true  ? "text-emerald-400" :
        positive === false ? "text-rose-400" : ""
      )}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ── Equity Chart ──────────────────────────────────────────────────────────

function EquityChart({ curve }: { curve: { time: number; value: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  useEffect(() => {
    if (!ref.current) return;
    const c = createChart(ref.current, {
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "rgba(156,163,175,1)", attributionLogo: false },
      grid: { vertLines: { color: "rgba(255,255,255,0.03)" }, horzLines: { color: "rgba(255,255,255,0.03)" } },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.06)" },
      timeScale: { borderColor: "rgba(255,255,255,0.06)", timeVisible: true },
      width: ref.current.clientWidth, height: ref.current.clientHeight || 160,
    });
    const series = c.addSeries(AreaSeries, {
      lineColor: "#22c55e", topColor: "rgba(34,197,94,0.30)",
      bottomColor: "rgba(34,197,94,0.02)", lineWidth: 2,
    });
    chartRef.current = c; seriesRef.current = series;
    const ro = new ResizeObserver(() => {
      if (ref.current) c.applyOptions({ width: ref.current.clientWidth, height: ref.current.clientHeight });
    });
    ro.observe(ref.current);
    return () => { ro.disconnect(); c.remove(); }
  }, []);

  useEffect(() => {
    if (!seriesRef.current || curve.length < 2) return;
    try {
      const pts = curve.map(p => ({ time: p.time as UTCTimestamp, value: p.value }));
      // Deduplicate timestamps
      const seen = new Set<number>();
      const deduped = pts.filter(p => { if (seen.has(p.time)) return false; seen.add(p.time); return true; });
      seriesRef.current.setData(deduped);
      chartRef.current?.timeScale().fitContent();
    } catch { /* ignore */ }
  }, [curve]);

  return <div ref={ref} className="w-full h-full" />;
}

// ── Trade Row ─────────────────────────────────────────────────────────────

function TradeRow({ t }: { t: BotTrade }) {
  const win  = t.status === "WIN";
  const loss = t.status === "LOSS";
  const open = t.status === "OPEN";

  return (
    <div className={cn(
      "grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center px-4 py-2.5 text-xs border-b border-border/30 last:border-0",
      "hover:bg-secondary/20 transition-colors"
    )}>
      {/* Direction badge */}
      <div className={cn(
        "text-[10px] font-bold px-2 py-0.5 rounded-md",
        t.direction === "BUY" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
      )}>
        {t.direction}
      </div>

      {/* Info */}
      <div className="min-w-0">
        <div className="font-bold">{t.symbol}</div>
        <div className="text-muted-foreground text-[10px]">{fmtTs(t.time)} · conf {t.confidence}%</div>
      </div>

      {/* Entry */}
      <div className="text-right">
        <div className="font-mono">${fmtNum(t.entry)}</div>
        <div className="text-[10px] text-muted-foreground">entry</div>
      </div>

      {/* Status */}
      <div className={cn(
        "font-bold text-[11px] text-right",
        win ? "text-emerald-400" : loss ? "text-rose-400" : "text-yellow-400"
      )}>
        {open ? (
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />OPEN</span>
        ) : win ? (
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />WIN</span>
        ) : (
          <span className="flex items-center gap-1"><XCircle className="w-3 h-3" />LOSS</span>
        )}
      </div>

      {/* PnL */}
      <div className={cn("font-bold text-right w-16", win ? "text-emerald-400" : loss ? "text-rose-400" : "text-muted-foreground")}>
        {t.pnlPct !== undefined ? fmtPct(t.pnlPct) : "—"}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function Strategy() {
  const [symbol,   setSymbol]   = useState("BTCUSD");
  const [timeframe, setTf]      = useState("1m");
  const [bot,      setBot]      = useState<BotState>(() => createBotState("BTCUSD", "1m"));
  const [candles,  setCandles]  = useState<Candle[]>([]);
  const [price,    setPrice]    = useState<number>(0);
  const [loading,  setLoading]  = useState(false);
  const [tab,      setTab]      = useState<"trades"|"log"|"config">("trades");
  const [customInput, setCustom] = useState("BTCUSD");

  const wsRef      = useRef<WebSocket | null>(null);
  const intervalId = useRef<any>(null);
  const botRef     = useRef<BotState>(bot);
  const candlesRef = useRef<Candle[]>([]);
  const priceRef   = useRef<number>(0);

  botRef.current   = bot;
  candlesRef.current = candles;
  priceRef.current = price;

  // ── Fetch historical candles ────────────────────────────────────────────
  const fetchCandles = useCallback(async (sym: string, tf: string) => {
    setLoading(true);
    try {
      const ivl = TF_MAP[tf] || "1d";
      const binSym = sym === "BTCUSD" ? "BTCUSDT" : sym;
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${binSym}&interval=${ivl}&limit=500`
      );
      const raw = await res.json();
      if (!Array.isArray(raw)) throw new Error("bad response");
      const c: Candle[] = raw.map((d: any) => ({
        time:   d[0] / 1000,
        open:   parseFloat(d[1]),
        high:   parseFloat(d[2]),
        low:    parseFloat(d[3]),
        close:  parseFloat(d[4]),
        volume: parseFloat(d[5]),
      }));
      setCandles(c);
      if (c.length) setPrice(c[c.length - 1].close);
      return c;
    } catch (e) {
      console.error("Candles fetch:", e);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Connect WebSocket for live tick ────────────────────────────────────
  const connectWs = useCallback((sym: string, tf: string) => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    const ivl = TF_MAP[tf] || "1d";
    const binSym = sym === "BTCUSD" ? "BTCUSDT" : sym;
    const ws  = new WebSocket(`wss://stream.binance.com:9443/ws/${binSym.toLowerCase()}@kline_${ivl}`);
    ws.onerror = () => {};
    ws.onclose  = () => {};
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.e !== "kline") return;
        const k  = msg.k;
        const lp = parseFloat(k.c);
        setPrice(lp);

        if (k.x) {
          // Candle closed — append to history
          setCandles(prev => {
            const next = [...prev, {
              time: k.t / 1000, open: +k.o, high: +k.h,
              low: +k.l, close: +k.c, volume: +k.v
            }].slice(-500);
            return next;
          });
        }
      } catch { /* ignore */ }
    };
    wsRef.current = ws;
  }, []);

  // ── Run bot tick every 5s ───────────────────────────────────────────────
  useEffect(() => {
    intervalId.current = setInterval(() => {
      const currentCandles = candlesRef.current;
      const currentPrice = priceRef.current;
      if (!botRef.current.running || !currentCandles.length) return;
      const lp = currentPrice || currentCandles[currentCandles.length - 1]?.close;
      if (!lp) return;
      setBot(prev => tickBot(prev, currentCandles, lp));
    }, 5000);
    return () => clearInterval(intervalId.current);
  }, []);

  // ── Symbol / TF change → reload ─────────────────────────────────────────
  const load = useCallback(async (sym: string, tf: string) => {
    setSymbol(sym);
    setBot(createBotState(sym, TF_MAP[tf] || "1d"));
    const c = await fetchCandles(sym, tf);
    connectWs(sym, tf);
    return c;
  }, [fetchCandles, connectWs]);
  useEffect(() => { load("BTCUSD", "1m"); }, []); // eslint-disable-line

  // ── Train button ────────────────────────────────────────────────────────
  const handleTrain = useCallback(() => {
    if (!candles.length) return;
    setBot(prev => ({
      ...prev,
      trainingDone: false,
      trainingLog: ["🧠 Starting parameter optimisation…"],
    }));

    setTimeout(() => {
      const { cfg, result, log } = optimise(candles);
      setBot(prev => ({
        ...prev,
        bestCfg:      cfg,
        trainingDone: true,
        trainingLog: [
          ...log,
          ``,
          `📊 Backtest Summary (optimised):`,
          `  Win Rate:      ${result.winRate}%`,
          `  Profit Factor: ${result.profitFactor}`,
          `  Net PnL:       ${result.netPnLPct}%`,
          `  Sharpe Ratio:  ${result.sharpeRatio}`,
          `  Total Trades:  ${result.totalTrades}`,
          `  Max Drawdown:  ${result.maxDrawdownPct}%`,
          `  Avg Win:       ${result.avgWinPct}%`,
          `  Avg Loss:      ${result.avgLossPct}%`,
          `  Expectancy:    ${result.expectancy}%/trade`,
          ``,
          `✅ AI parameters locked in. Ready to trade.`,
        ],
        winRate:      result.winRate,
        profitFactor: result.profitFactor,
        totalPnlPct:  result.netPnLPct,
        maxDD:        result.maxDrawdownPct,
        sharpe:       result.sharpeRatio,
        equityCurve:  [
          { time: Date.now() / 1000 - result.trades.length * 86400, value: 10000 },
          ...result.trades.map((t, i) => ({
            time: Date.now() / 1000 - (result.trades.length - i) * 86400,
            value: 10000 * (1 + (result.netPnLPct / 100) * ((i + 1) / result.trades.length)),
          }))
        ],
      }));
    }, 100); // yield to React so "Training…" shows first
  }, [candles]);

  // ── Toggle bot ──────────────────────────────────────────────────────────
  const toggleBot = useCallback(() => {
    if (!bot.trainingDone) {
      handleTrain();
      return;
    }
    setBot(prev => ({ ...prev, running: !prev.running }));
  }, [bot.trainingDone, handleTrain]);

  // ── Derived ─────────────────────────────────────────────────────────────
  const openTrade   = bot.openTrade;
  const closedTrades = bot.trades.filter(t => t.status !== "OPEN");
  const pnlPos      = bot.totalPnlPct >= 0;
  const equityPos   = bot.equity >= 10000;

  // ── OHLCV text for open trade ────────────────────────────────────────────
  const openPnl = useMemo(() => {
    if (!openTrade || !price) return null;
    const { direction, entry } = openTrade;
    return direction === "BUY"
      ? ((price - entry) / entry) * 100
      : ((entry - price) / entry) * 100;
  }, [openTrade, price]);

  return (
    <AppShell title="Auto-Bot" subtitle="QUANTEDGE V12.1 · SMC — AI-powered automated trading engine">
      <Seo title="AI Auto-Bot • QUANTEDGE V12.1 · SMC" description="Automated paper trading bot powered by the QUANTEDGE V12.1 · SMC strategy engine." />

      <div className="space-y-5 pb-12">

        {/* ── HERO: symbol + controls ── */}
        <div className="glass rounded-3xl border border-border/50 p-5 shadow-luxe">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">

            {/* Left: title + status */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">QUANTEDGE V12.1 · SMC Auto-Bot</span>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest",
                    bot.running ? "bg-emerald-500/20 text-emerald-400 animate-pulse" : "bg-muted/50 text-muted-foreground"
                  )}>
                    {bot.running ? "● LIVE" : bot.trainingDone ? "READY" : "NOT TRAINED"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {symbol} · {timeframe} · Paper balance: <span className={cn("font-bold", equityPos ? "text-emerald-400" : "text-rose-400")}>{fmtUsd(bot.equity)}</span>
                </div>
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Symbol input */}
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={customInput}
                  onChange={e => setCustom(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && load(customInput, timeframe)}
                  placeholder="Symbol…"
                  className="pl-8 pr-3 py-2 text-xs font-mono bg-background/60 border border-border/50 rounded-xl w-32 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              {/* Timeframe pills */}
              <div className="flex gap-1">
                {["1H","4H","1D","1W"].map(t => (
                  <button
                    key={t}
                    onClick={() => { setTf(t); load(symbol, t); }}
                    className={cn(
                      "px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all",
                      timeframe === t
                        ? "bg-primary/20 text-primary border-primary/40"
                        : "bg-background/40 text-muted-foreground border-border/40 hover:text-foreground"
                    )}
                  >{t}</button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-2"
                onClick={handleTrain}
                disabled={loading || !candles.length}
              >
                <Brain className="w-4 h-4" />
                {bot.trainingDone ? "Re-Train" : "Train AI"}
              </Button>

              <Button
                size="sm"
                className={cn(
                  "rounded-xl gap-2 font-bold",
                  bot.running
                    ? "bg-rose-500 hover:bg-rose-600 text-white"
                    : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:brightness-110 text-white"
                )}
                onClick={toggleBot}
                disabled={loading}
              >
                {bot.running ? <><Pause className="w-4 h-4" />STOP BOT</> : <><Play className="w-4 h-4" />START BOT</>}
              </Button>

              <Button
                variant="ghost" size="sm" className="rounded-xl"
                onClick={() => { setBot(createBotState(symbol, TF_MAP[timeframe] || "1d")); }}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick pairs */}
          <div className="flex flex-wrap gap-2 mt-4">
            {PAIRS.map(p => (
              <button
                key={p}
                onClick={() => { setCustom(p); load(p, timeframe); }}
                className={cn(
                  "text-[11px] border rounded-full px-3 py-1 transition-all font-mono",
                  symbol === p
                    ? "bg-primary/20 text-primary border-primary/40"
                    : "bg-secondary/40 hover:bg-primary/10 hover:text-primary border-border/40"
                )}
              >{p}</button>
            ))}
          </div>
        </div>

        {/* ── STAT GRID ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <StatCard
            label="Equity"
            value={fmtUsd(bot.equity)}
            sub={`Started $10,000`}
            positive={equityPos}
            icon={Wallet}
            glow={equityPos ? "shadow-emerald-500/10" : "shadow-rose-500/10"}
          />
          <StatCard
            label="Total PnL"
            value={fmtPct(bot.totalPnlPct)}
            sub={fmtUsd(bot.equity - 10000)}
            positive={pnlPos}
            icon={pnlPos ? ArrowUpRight : ArrowDownRight}
          />
          <StatCard
            label="Win Rate"
            value={`${bot.winRate}%`}
            sub={`${closedTrades.filter(t=>t.status==="WIN").length}W / ${closedTrades.filter(t=>t.status==="LOSS").length}L`}
            positive={bot.winRate >= 55}
            icon={Trophy}
          />
          <StatCard
            label="Profit Factor"
            value={bot.profitFactor > 0 ? fmtNum(bot.profitFactor) : "—"}
            sub={bot.profitFactor >= 1.5 ? "Excellent" : bot.profitFactor >= 1 ? "Good" : "Negative"}
            positive={bot.profitFactor >= 1.5}
            icon={TrendingUp}
          />
          <StatCard
            label="Max Drawdown"
            value={`${bot.maxDD}%`}
            sub={bot.maxDD < 10 ? "Safe" : bot.maxDD < 20 ? "Moderate" : "High risk"}
            positive={bot.maxDD < 10}
            icon={Shield}
          />
          <StatCard
            label="Live Price"
            value={price > 0 ? `$${fmtNum(price)}` : "—"}
            sub={symbol}
            icon={Activity}
          />
        </div>

        {/* ── EQUITY CURVE + OPEN TRADE ── */}
        <div className="grid lg:grid-cols-3 gap-4">

          {/* Equity curve */}
          <div className="lg:col-span-2 glass rounded-2xl border border-border/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-sm flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                Equity Curve
              </div>
              <div className={cn("text-xs font-bold", equityPos ? "text-emerald-400" : "text-rose-400")}>
                {fmtUsd(bot.equity)}
              </div>
            </div>
            <div className="h-[180px]">
              <EquityChart curve={bot.equityCurve} />
            </div>
          </div>

          {/* Open trade card */}
          <div className="glass rounded-2xl border border-border/40 p-4 flex flex-col">
            <div className="font-bold text-sm flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-primary" />
              Active Trade
            </div>

            {openTrade ? (
              <div className="flex flex-col gap-3 flex-1">
                {/* Direction */}
                <div className={cn(
                  "text-center py-3 rounded-xl font-bold text-lg",
                  openTrade.direction === "BUY"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-rose-500/15 text-rose-400"
                )}>
                  {openTrade.direction === "BUY" ? "▲" : "▼"} {openTrade.direction}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["Entry", `$${fmtNum(openTrade.entry)}`],
                    ["Live", `$${fmtNum(price || openTrade.entry)}`],
                    ["Stop", `$${fmtNum(openTrade.sl)}`],
                    ["Target", `$${fmtNum(openTrade.tp)}`],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-secondary/30 rounded-lg p-2">
                      <div className="text-muted-foreground text-[10px]">{l}</div>
                      <div className="font-bold font-mono">{v}</div>
                    </div>
                  ))}
                </div>

                {/* Live unrealised PnL */}
                <div className={cn(
                  "text-center py-2 rounded-xl text-sm font-bold",
                  (openPnl ?? 0) >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                )}>
                  Unrealised: {openPnl !== null ? fmtPct(openPnl) : "—"}
                </div>

                <div className="text-[10px] text-muted-foreground text-center">
                  Confidence: {openTrade.confidence}% · {fmtTs(openTrade.time)}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <div className="w-12 h-12 rounded-2xl bg-secondary/40 flex items-center justify-center">
                  <Clock className="w-6 h-6 opacity-50" />
                </div>
                <div className="text-sm text-center">
                  {bot.running ? "Waiting for signal…" : "Bot not running"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── TRADES / LOG / CONFIG TABS ── */}
        <div className="glass rounded-2xl border border-border/40 overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-border/40 bg-card/30">
            {(["trades","log","config"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all",
                  tab === t
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "trades" ? `Trade Log (${bot.trades.length})` :
                 t === "log"    ? "Training Log" : "AI Config"}
              </button>
            ))}
          </div>

          {/* Trade log */}
          {tab === "trades" && (
            <div className="max-h-[400px] overflow-y-auto">
              {bot.trades.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Activity className="w-8 h-8 opacity-30" />
                  <div className="text-sm">No trades yet. Train AI then start bot.</div>
                </div>
              ) : (
                bot.trades.map(t => <TradeRow key={t.id} t={t} />)
              )}
            </div>
          )}

          {/* Training log */}
          {tab === "log" && (
            <div className="max-h-[400px] overflow-y-auto p-4 font-mono text-[11px] space-y-1">
              {bot.trainingLog.length === 0 ? (
                <div className="text-muted-foreground text-center py-12">
                  Click <strong>Train AI</strong> to start optimisation.
                </div>
              ) : (
                bot.trainingLog.map((l, i) => (
                  <div key={i} className={cn(
                    l.startsWith("✅") ? "text-emerald-400" :
                    l.startsWith("📊") ? "text-primary" :
                    l.startsWith("🎯") ? "text-yellow-400" :
                    "text-muted-foreground"
                  )}>{l || <br />}</div>
                ))
              )}
            </div>
          )}

          {/* Config display */}
          {tab === "config" && (
            <div className="p-5">
              {!bot.trainingDone ? (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  Train the AI first to see optimised configuration.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> Optimised Configuration
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(bot.bestCfg).map(([k, v]) => (
                      <div key={k} className="bg-secondary/30 rounded-xl p-3">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{k}</div>
                        <div className="font-bold font-mono mt-1">{String(v)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-xs space-y-2">
                    <div className="font-bold text-emerald-400 flex items-center gap-2">
                      <Brain className="w-3.5 h-3.5" /> Strategy Rules (Active)
                    </div>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• HTF EMA (200/55/21) must align with SuperTrend direction</li>
                      <li>• Volume confirmation required above {bot.bestCfg.volMult ?? 1.2}× moving average</li>
                      <li>• RSI must cross midline (period {bot.bestCfg.rsiLen ?? 7})</li>
                      <li>• Score threshold ≥ {bot.bestCfg.minScore ?? 5}/9 indicators</li>
                      <li>• Risk/Reward ratio {bot.bestCfg.rr ?? 2.0}:1 minimum</li>
                      <li>• SL placed at {bot.bestCfg.slMult ?? 1.2}× ATR from entry</li>
                      <li>• Fibonacci 0.618/0.382 zones act as target zones</li>
                      <li>• Session filter: OFF (crypto trades 24/7)</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── DISCLAIMER ── */}
        <div className="flex items-start gap-2.5 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-xs text-amber-400/80">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Paper Trading Only:</strong> All trades are simulated with a virtual $10,000 balance. No real funds are at risk. Past backtest performance does not guarantee future results.
          </span>
        </div>

      </div>
    </AppShell>
  );
}
