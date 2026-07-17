import { useEffect, useState, useCallback, useRef } from "react";
import { runEngine, backtest, type Candle, type StrategySignal, type BacktestResult, type EngineConfig } from "@/lib/strategy-engine";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, Target, ShieldCheck,
  Zap, BarChart2, Activity, AlertTriangle, Clock, ChevronDown, ChevronUp,
  Info, CheckCircle2, XCircle, Gauge, Layers, List, Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstruments } from "@/hooks/use-instruments";
import { useTimeTrades } from "@/hooks/use-time-trades";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

// ── Types ─────────────────────────────────────────────────────────────────

interface Props {
  symbol: string;
  interval?: string;
  cfg?: EngineConfig;
  compact?: boolean;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ConfidenceMeter({ value }: { value: number }) {
  const color = value >= 75 ? "#22c55e" : value >= 55 ? "#f59e0b" : "#ef4444";
  const r = 52, cx = 60, cy = 60;
  const circum = 2 * Math.PI * r;
  const half   = circum / 2;
  const offset = half - (value / 100) * half;
  return (
    <div className="flex flex-col items-center">
      <svg width={120} height={72} viewBox="0 0 120 72">
        <path
          d={`M 8 60 A ${r} ${r} 0 0 1 112 60`}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round"
        />
        <path
          d={`M 8 60 A ${r} ${r} 0 0 1 112 60`}
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(value / 100) * half} ${half}`}
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)" }}
        />
        <text x="60" y="58" textAnchor="middle" fill={color} fontSize="22" fontWeight="900">{value}%</text>
        <text x="60" y="72" textAnchor="middle" fill="rgba(150,150,170,1)" fontSize="9">CONFIDENCE</text>
      </svg>
    </div>
  );
}

function ScoreBar({ score, max = 9, bull }: { score: number; max?: number; bull: boolean }) {
  const pct = (score / max) * 100;
  const color = bull ? "#22c55e" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-6 text-right">{score}</span>
      <div className="flex-1 h-2 bg-secondary/40 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-4 text-left">/{max}</span>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-secondary/20 rounded-xl p-3 flex flex-col gap-0.5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("text-lg font-black", color ?? "text-foreground")}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function StrategyPanel({ symbol, interval = "1d", cfg: cfgProp, compact = false }: Props): JSX.Element {
  const [candles,  setCandles]  = useState<Candle[]>([]);
  const [signal,   setSignal]   = useState<StrategySignal | null>(null);
  const [bt,       setBt]       = useState<BacktestResult | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [lastTime, setLastTime] = useState<Date | null>(null);
  const [tab,      setTab]      = useState<"signal" | "backtest" | "reasons">("signal");
  const [showAll,  setShowAll]  = useState(false);
  const [autoInvest, setAutoInvest] = useState(false);
  const [equityCurve, setEquityCurve] = useState<number[]>([]);

  const { toast } = useToast();
  const { user } = useAuth();
  const instrumentsQuery = useInstruments();
  const { placeTrade } = useTimeTrades();
  const lastOrderTimeRef = useRef<number | null>(null);

  // ── Stable refs — never change identity, never trigger re-renders ─────────
  const wsRef      = useRef<WebSocket | null>(null);
  const destroyRef = useRef(false);
  const btTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // cfgProp: stabilise on first mount so it never causes re-runs
  const cfgRef = useRef<EngineConfig>(cfgProp ?? {});
  // Keep current symbol/interval accessible inside callbacks without deps
  const symbolRef   = useRef(symbol);
  const intervalRef = useRef(interval);
  symbolRef.current   = symbol;
  intervalRef.current = interval;

  // ── In-memory candle cache ───────────────────────────────────────────────
  const CACHE_TTL   = 5 * 60 * 1000;
  const cacheRef    = useRef<Map<string, { ts: number; data: Candle[] }>>(new Map());
  const abortRef    = useRef<AbortController | null>(null);

  // ── load stored in a ref — calling it NEVER recreates useEffect ──────────
  const loadRef = useRef<(forceRefresh?: boolean) => Promise<void>>(null!);

  loadRef.current = async (forceRefresh = false) => {
    const sym      = symbolRef.current;
    const ivl      = intervalRef.current;
    const cfg      = cfgRef.current;
    if (!sym) return;

    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Reset destroy flag for this load cycle
    destroyRef.current = false;
    setLoading(true);
    setError(null);
    if (btTimerRef.current) clearTimeout(btTimerRef.current);

    try {
      const symUpper = sym.toUpperCase();
      const isCrypto = /USDT$|BTC$|ETH$|BNB$/.test(symUpper) && !["XAUUSD", "XAGUSD", "EURUSD", "GBPUSD"].includes(symUpper);

      const cacheKey = `${symUpper}_${ivl}`;
      const cached   = cacheRef.current.get(cacheKey);
      let raw: Candle[];

      if (!forceRefresh && cached && Date.now() - cached.ts < CACHE_TTL) {
        raw = cached.data;
      } else {
        let res: Response;
        let isTwelveData = !isCrypto;
        
        try {
          if (isCrypto) {
            res = await fetch(
              `https://api.binance.com/api/v3/klines?symbol=${symUpper}&interval=${ivl}&limit=500`,
              { signal: ctrl.signal }
            );
          } else {
            // TwelveData Integration for Gold/Forex
            let tdInt = ivl;
            if (ivl.endsWith("m")) tdInt = ivl + "in";
            else if (ivl === "1d") tdInt = "1day";
            else if (ivl === "1w") tdInt = "1week";
            
            let tdSymbol = symUpper;
            if (tdSymbol.length >= 6 && !tdSymbol.includes("/")) tdSymbol = tdSymbol.substring(0, 3) + "/" + tdSymbol.substring(3);
            
            res = await fetch(
              `https://api.twelvedata.com/time_series?symbol=${tdSymbol}&interval=${tdInt}&outputsize=500`,
              { signal: ctrl.signal }
            );
          }
        } catch {
          if (!destroyRef.current) setLoading(false);
          return;
        }
        
        if (!res.ok) {
          if (!destroyRef.current) {
            setError(`Network error or exchange unavailable`);
            setLoading(false);
          }
          return;
        }
        
        const data = await res.json();
        
        if (isCrypto) {
          if (!Array.isArray(data) || data.length === 0) throw new Error("No candle data returned");
          raw = data.map((d: any) => ({
            time:   d[0] / 1000,
            open:   parseFloat(d[1]),
            high:   parseFloat(d[2]),
            low:    parseFloat(d[3]),
            close:  parseFloat(d[4]),
            volume: parseFloat(d[5]),
          }));
        } else {
          if (!data.values || !Array.isArray(data.values) || data.values.length === 0) throw new Error("No premium data returned");
          raw = data.values.reverse().map((d: any) => ({
            time:   new Date(d.datetime).getTime() / 1000,
            open:   parseFloat(d.open),
            high:   parseFloat(d.high),
            low:    parseFloat(d.low),
            close:  parseFloat(d.close),
            volume: parseFloat(d.volume || "0"),
          }));
        }
        
        cacheRef.current.set(cacheKey, { ts: Date.now(), data: raw });
      }

      if (destroyRef.current) return;
      setCandles(raw);

      // ── Step 1: Signal immediately (fast ~5ms) ───────────────────────────
      const sigs = runEngine(raw, cfg);
      if (!destroyRef.current) {
        const currentSignal = sigs.length > 0 ? sigs[sigs.length - 1] : null;
        setSignal(currentSignal);
        setLastTime(new Date());
        setLoading(false);
        
        // --- AUTO INVEST LOGIC ---
        if (autoInvest && currentSignal && currentSignal.direction !== "HOLD") {
           // We only want to fire once per signal timestamp
           if (lastOrderTimeRef.current !== currentSignal.time) {
              const matchedInst = instrumentsQuery.data?.find((i: any) => i.symbol === symUpper);
              if (matchedInst && !placeTrade.isPending) {
                 lastOrderTimeRef.current = currentSignal.time;
                 const side: "BUY" | "SELL" = currentSignal.direction as any;
                 const price = currentSignal.entryPrice;
                 
                 placeTrade.mutate({
                   instrumentId: matchedInst.id,
                   side,
                   amount: user?.autoTradeAmount || "5.00",
                   strikePrice: String(price),
                   durationSeconds: 60,
                   placedBy: "AI_BOT"
                 }, {
                   onSuccess: () => {
                     toast({
                       title: "🤖 Auto-Invest Executed!",
                       description: `${side} $${user?.autoTradeAmount || "5.00"} ${symUpper} Time Trade @ $${price.toFixed(2)}`,
                     });
                   },
                   onError: (err) => {
                     toast({
                       title: "Auto-Invest Failed",
                       description: err.message,
                       variant: "destructive"
                     });
                   }
                 });
              }
           }
        }
      }

      // ── Step 2: Backtest deferred after first paint ──────────────────────
      btTimerRef.current = setTimeout(() => {
        if (destroyRef.current) return;
        // Use a relaxed config for backtesting to generate more signals for visualization
        const btCfg = { ...cfg, minScore: 4 };
        const btR = backtest(raw, btCfg);
        if (!destroyRef.current) {
          setBt(btR);
          // Build equity curve for sparkline
          if (btR.trades.length > 0) {
            let eq = 10000;
            const curve = [eq];
            for (const t of btR.trades) {
              const invest = eq * 0.10;
              if (t.outcome === "WIN") eq += invest * 0.85;
              else eq -= invest;
              curve.push(Math.round(eq));
            }
            setEquityCurve(curve);
          }
        }
      }, 50);

      // ── Step 3: WebSocket for live ticks (only when online) ──────────────
      const prev = wsRef.current;
      if (prev && prev.readyState < 2) {
        prev.onmessage = null;
        prev.onerror   = null;
        prev.onclose   = null;
        try { prev.close(); } catch { /* ignore */ }
      }
      wsRef.current = null;
      if (destroyRef.current) return;
      if (typeof navigator === "undefined" || !navigator.onLine) return;
      if (isCrypto) {
        try {
          const ws = new WebSocket(
            `wss://stream.binance.com:9443/ws/${symUpper.toLowerCase()}@kline_${ivl}`
          );
          wsRef.current = ws;
          ws.onerror = () => { wsRef.current = null; };
          ws.onclose = () => { ws.onerror = null; };

          ws.onmessage = (ev: MessageEvent) => {
            if (destroyRef.current) return;
            try {
              const msg = JSON.parse(ev.data);
              if (msg.e !== "kline") return;
              const k = msg.k;
              const updated: Candle = {
                time: k.t / 1000, open: parseFloat(k.o),
                high: parseFloat(k.h), low: parseFloat(k.l),
                close: parseFloat(k.c), volume: parseFloat(k.v),
              };
              setCandles(prev => {
                if (destroyRef.current) return prev;
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.time === updated.time) next[next.length - 1] = updated;
                else next.push(updated);
                const sigs2 = runEngine(next.slice(-300), cfg);
                if (sigs2.length > 0 && !destroyRef.current) {
                  const liveSignal = sigs2[sigs2.length - 1];
                  setSignal(liveSignal);
                  
                  // --- LIVE AUTO INVEST LOGIC ---
                  if (autoInvest && liveSignal.direction !== "HOLD") {
                     if (lastOrderTimeRef.current !== liveSignal.time) {
                        const matchedInst = instrumentsQuery.data?.find((i: any) => i.symbol === symUpper);
                        if (matchedInst && !placeTrade.isPending) {
                           lastOrderTimeRef.current = liveSignal.time;
                           
                           placeTrade.mutate({
                             instrumentId: matchedInst.id,
                             side: liveSignal.direction as any,
                             amount: user?.autoTradeAmount || "5.00",
                             strikePrice: String(liveSignal.entryPrice),
                             durationSeconds: 60,
                             placedBy: "AI_BOT"
                           }, {
                             onSuccess: () => {
                               toast({
                                 title: "🤖 Live Auto-Invest Executed!",
                                 description: `${liveSignal.direction} $${user?.autoTradeAmount || "5.00"} ${symUpper} @ $${liveSignal.entryPrice.toFixed(2)} options trade.`,
                               });
                             }
                           });
                        }
                     }
                  }
                }
                return next;
              });
            } catch { /* ignore parse errors */ }
          };
        } catch { /* WebSocket unavailable — skip silently */ }
      }
    } catch (e: any) {
      if (!destroyRef.current) {
        setError(e.message ?? "Unknown error");
        setLoading(false);
      }
    }
  };


  // ── Effect: only fires when symbol or interval actually changes ──────────
  useEffect(() => {
    destroyRef.current = false;
    loadRef.current();

    return () => {
      destroyRef.current = true;
      if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
      if (btTimerRef.current) clearTimeout(btTimerRef.current);
      const ws = wsRef.current;
      if (ws) {
        ws.onmessage = null;
        ws.onerror   = null;
        ws.onclose   = null;
        if (ws.readyState < 2) try { ws.close(); } catch { /* ignore */ }
      }
      wsRef.current = null;
    };
  }, [symbol, interval]); // ← ONLY these two primitives — no functions

  // ── Derived UI values ──────────────────────────────────────────────────
  const dir   = signal?.direction ?? "HOLD";
  const isBuy = dir === "BUY";
  const isSell= dir === "SELL";
  const dirGlow = isBuy
    ? "shadow-[0_0_24px_rgba(34,197,94,0.25)] border-emerald-500/40 bg-emerald-500/8"
    : isSell
      ? "shadow-[0_0_24px_rgba(239,68,68,0.25)] border-rose-500/40 bg-rose-500/8"
      : "border-border/40";

  const winColor = (bt?.winRate ?? 0) >= 60 ? "text-emerald-400"
    : (bt?.winRate ?? 0) >= 50 ? "text-amber-400" : "text-rose-400";
  const pfColor  = (bt?.profitFactor ?? 0) >= 1.5 ? "text-emerald-400"
    : (bt?.profitFactor ?? 0) >= 1 ? "text-amber-400" : "text-rose-400";

  const priceStr = (n?: number) => {
    if (!n) return "—";
    return n > 100 ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
      : `$${n.toFixed(n > 1 ? 4 : 6)}`;
  };

  const reasons = signal?.reasons ?? [];
  const reasonsToShow = showAll ? reasons : reasons.slice(0, 5);

  const tabs = [
    { id: "signal",   label: "Signal",   icon: Zap },
    { id: "backtest", label: "Backtest", icon: BarChart2 },
    { id: "reasons",  label: "Reasons",  icon: List },
  ] as const;

  if (compact) {
    if (loading) return <div className="glass rounded-2xl p-3 text-xs text-muted-foreground flex gap-2"><RefreshCw className="w-3 h-3 animate-spin" /> Loading...</div>;
    if (!signal) return <div className="glass rounded-2xl p-3 text-xs text-muted-foreground">No signal</div>;
    return (
      <div className={cn("glass rounded-2xl border p-3 flex items-center gap-3", dirGlow)}>
        <span className={cn("font-black text-lg", isBuy ? "text-emerald-400" : "text-rose-400")}>{dir}</span>
        <span className="text-xs text-muted-foreground">{signal.confidence}% confidence</span>
        <span className="text-xs text-muted-foreground ml-auto">{isBuy ? signal.bullScore : signal.bearScore}/9</span>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl border border-border/60 overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/20">
        <div className="flex items-center gap-2 flex-wrap">
          <Zap className="w-4 h-4 text-primary shrink-0" />
          <span className="font-bold text-sm">QUANTEDGE V12.1 · SMC</span>
          <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-widest">AI Engine</span>
          {symbol && <span className="text-[10px] bg-secondary/60 px-2 py-0.5 rounded-full font-mono">{symbol} · {interval}</span>}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
            <Bot className={cn("w-3.5 h-3.5", autoInvest ? "text-primary animate-pulse" : "text-muted-foreground")} />
            <span className="text-[10px] uppercase font-bold tracking-widest">Auto Invest</span>
            <Switch 
               checked={autoInvest} 
               onCheckedChange={(checked) => {
                 setAutoInvest(checked);
                 if (checked) {
                   toast({ title: "🤖 Auto Invest Armed", description: "The AI bot will now automatically convert signals into live orders." });
                 }
               }} 
               className="ml-1 data-[state=checked]:bg-primary h-4 w-7 [&_span]:w-3 [&_span]:h-3"
            />
          </div>
          {lastTime && (
            <div className="text-[10px] text-muted-foreground hidden sm:flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastTime.toLocaleTimeString()}
            </div>
          )}
          <Button size="sm" variant="ghost" onClick={() => loadRef.current(true)} disabled={loading} className="h-7 px-2 rounded-lg">
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex border-b border-border/40">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all",
              tab === t.id
                ? "border-b-2 border-primary text-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="p-6 text-center flex flex-col items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
          <div className="text-sm text-muted-foreground max-w-xs">{error}</div>
          <Button size="sm" onClick={() => loadRef.current(true)} className="rounded-xl">Retry</Button>
        </div>
      )}

      {/* ── Loading ── */}
      {!error && loading && !signal && (
        <div className="p-8 flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <div className="text-sm">Analyzing {symbol} on {interval} timeframe…</div>
          <div className="text-xs">Running 9 indicators + backtest on 500 candles</div>
        </div>
      )}

      {/* ── SIGNAL TAB ── */}
      {!error && !(!signal && loading) && tab === "signal" && (
        <div className="p-4 space-y-4">

          {/* Direction Banner + Confidence Meter */}
          <div className={cn("rounded-2xl border p-4 flex flex-col sm:flex-row items-center gap-4", dirGlow)}>
            <div className="flex items-center gap-3">
              {isBuy  && <TrendingUp  className="w-10 h-10 text-emerald-400 shrink-0" />}
              {isSell && <TrendingDown className="w-10 h-10 text-rose-400   shrink-0" />}
              {!isBuy && !isSell && <Minus className="w-10 h-10 text-muted-foreground shrink-0" />}
              <div>
                <div className={cn("text-4xl font-black tracking-tighter",
                  isBuy ? "text-emerald-400" : isSell ? "text-rose-400" : "text-muted-foreground")}>
                  {dir}
                </div>
                {signal && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Entry: {priceStr(signal.entryPrice)} · R/R {signal.riskReward}:1
                  </div>
                )}
              </div>
            </div>

            {signal ? (
              <div className="sm:ml-auto flex flex-col sm:flex-row items-center gap-4">
                <ConfidenceMeter value={signal.confidence} />
                <div className="space-y-1.5 min-w-[90px]">
                  <div className="text-[10px] uppercase text-emerald-400 tracking-widest">Bull</div>
                  <ScoreBar score={signal.bullScore} bull />
                  <div className="text-[10px] uppercase text-rose-400 tracking-widest mt-2">Bear</div>
                  <ScoreBar score={signal.bearScore} bull={false} />
                </div>
              </div>
            ) : (
              <div className="sm:ml-auto text-sm text-muted-foreground">No signal on last candle</div>
            )}
          </div>

          {/* SL / TP Grid */}
          {signal && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-secondary/30 rounded-xl p-3 text-center">
                <div className="text-[9px] uppercase text-muted-foreground tracking-widest mb-1">Entry</div>
                <div className="font-bold text-sm">{priceStr(signal.entryPrice)}</div>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
                <div className="text-[9px] uppercase text-rose-400 tracking-widest mb-1 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" /> Stop
                </div>
                <div className="font-bold text-sm text-rose-400">{priceStr(signal.stopLoss)}</div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                <div className="text-[9px] uppercase text-emerald-400 tracking-widest mb-1 flex items-center justify-center gap-1">
                  <Target className="w-2.5 h-2.5" /> Target
                </div>
                <div className="font-bold text-sm text-emerald-400">{priceStr(signal.takeProfit)}</div>
              </div>
            </div>
          )}

          {/* Live Indicator Grid */}
          {signal && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Live Indicator State
              </div>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { label: "HTF EMA Bias",   v: isBuy ? signal.htfBull  : signal.htfBear,  weight: 2 },
                  { label: "SuperTrend",      v: isBuy ? signal.stBull   : signal.stBear },
                  { label: "RSI " + signal.rsiVal.toFixed(1), v: isBuy ? signal.rsiBull : signal.rsiBear },
                  { label: "MACD",            v: isBuy ? signal.macdBull : signal.macdBear },
                  { label: "Stoch RSI " + signal.stochK.toFixed(1), v: isBuy ? signal.stochBull : signal.stochBear },
                  { label: "Volume OK",       v: signal.volOk },
                  { label: "VWAP",            v: isBuy ? signal.aboveVwap : !signal.aboveVwap },
                  { label: "Fib Zone",        v: isBuy ? signal.nearFib618 : signal.nearFib382 },
                  { label: "Liquidity",       v: isBuy ? (signal.sweptLo || signal.nearSup) : (signal.sweptHi || signal.nearRes) },
                  { label: "Session",         v: signal.inSession },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 bg-secondary/20 rounded-lg px-2.5 py-1.5">
                    {item.v
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      : <XCircle      className="w-3.5 h-3.5 text-rose-400/50 shrink-0" />}
                    <span className="text-xs truncate">{item.label}</span>
                    {(item.weight ?? 1) > 1 && (
                      <span className="ml-auto text-[9px] bg-primary/20 text-primary px-1 rounded shrink-0">×2</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Levels */}
          {signal && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-secondary/20 rounded-xl p-3 space-y-1">
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Key Levels</div>
                <div className="flex justify-between"><span className="text-muted-foreground">Support</span><span className="font-mono">{priceStr(signal.supLevel ?? undefined)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Resistance</span><span className="font-mono">{priceStr(signal.resLevel ?? undefined)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">VWAP</span><span className="font-mono">{priceStr(signal.vwapVal)}</span></div>
              </div>
              <div className="bg-secondary/20 rounded-xl p-3 space-y-1">
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Fibonacci</div>
                <div className="flex justify-between"><span className={cn("text-muted-foreground", signal.nearFib618 && "text-yellow-400")}>0.618</span><span className="font-mono">{priceStr(signal.fib618)}</span></div>
                <div className="flex justify-between"><span className={cn("text-muted-foreground", signal.nearFib382 && "text-purple-400")}>0.382</span><span className="font-mono">{priceStr(signal.fib382)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">ATR</span><span className="font-mono">{priceStr(signal.atr)}</span></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BACKTEST TAB ── */}
      {!error && tab === "backtest" && (
        <div className="p-4 space-y-4">
          {!bt || bt.totalTrades === 0 ? (
            <div className="p-6 flex flex-col items-center gap-4 text-center">
              <BarChart2 className="w-10 h-10 text-primary/40" />
              <div className="text-sm font-semibold">No backtest trades yet</div>
              <div className="text-xs text-muted-foreground max-w-xs">
                The AI engine scans historical candles for high-confidence signals. Try a shorter interval like <strong>1h</strong> or <strong>15m</strong>, or click <strong>Scan</strong> to reload data.
              </div>
              {loading && <div className="flex items-center gap-2 text-xs text-primary"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running backtest…</div>}
            </div>
          ) : (
            <>
              {/* Big stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatCard label="Win Rate"      value={`${bt.winRate}%`}  sub={`${bt.wins}W / ${bt.losses}L`} color={winColor} />
                <StatCard label="Profit Factor" value={String(bt.profitFactor)} sub="Gross W / L" color={pfColor} />
                <StatCard label="Expectancy"    value={`${bt.expectancy > 0 ? "+" : ""}${bt.expectancy}%`} sub="per trade avg" color={bt.expectancy > 0 ? "text-emerald-400" : "text-rose-400"} />
                <StatCard label="Sharpe Ratio"  value={String(bt.sharpeRatio)} sub="annualized" color={bt.sharpeRatio > 1 ? "text-emerald-400" : "text-amber-400"} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatCard label="Net PnL"     value={`${bt.netPnLPct > 0 ? "+" : ""}${bt.netPnLPct}%`} color={bt.netPnLPct > 0 ? "text-emerald-400" : "text-rose-400"} />
                <StatCard label="Max Drawdown" value={`-${bt.maxDrawdownPct}%`} color="text-rose-400" />
                <StatCard label="Avg Win"     value={`+${bt.avgWinPct}%`} color="text-emerald-400" />
                <StatCard label="Avg Loss"    value={`-${bt.avgLossPct}%`} color="text-rose-400" />
              </div>

              {/* Win rate bar */}
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Win Rate ({bt.totalTrades} trades · {interval} · {symbol})</span>
                  <span className={winColor}>{bt.winRate}%</span>
                </div>
                <div className="h-3 rounded-full bg-secondary/40 overflow-hidden flex">
                  <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${bt.winRate}%` }} />
                  <div className="h-full bg-rose-500/60 transition-all duration-700" style={{ width: `${100 - bt.winRate}%` }} />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                  <span>0% – Break-even @ {Math.ceil(100 / (1 + bt.profitFactor))}%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Equity Curve Sparkline */}
              {equityCurve.length > 2 && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Equity Curve
                  </div>
                  <div className="h-16 w-full bg-secondary/20 rounded-xl overflow-hidden flex items-end gap-[1px] px-2 py-2">
                    {(() => {
                      const min = Math.min(...equityCurve);
                      const max = Math.max(...equityCurve);
                      const range = max - min || 1;
                      return equityCurve.map((v, i) => {
                        const pct = ((v - min) / range) * 100;
                        const isUp = i === 0 || v >= equityCurve[i - 1];
                        return (
                          <div
                            key={i}
                            className="flex-1 rounded-sm min-w-[2px] transition-all duration-300"
                            style={{
                              height: `${Math.max(4, pct)}%`,
                              background: isUp ? "#10b981" : "#f43f5e",
                              opacity: 0.75,
                            }}
                          />
                        );
                      });
                    })()}
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                    <span>Start: $10,000</span>
                    <span className={bt.netPnLPct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                      End: ${(10000 * (1 + bt.netPnLPct / 100)).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              )}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Last {Math.min(10, bt.trades.length)} Trades</div>
                <div className="space-y-1">
                  {bt.trades.slice(-10).reverse().map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-secondary/20 rounded-lg px-3 py-2">
                      <span className={cn("font-bold w-8 shrink-0", t.direction === "BUY" ? "text-emerald-400" : "text-rose-400")}>{t.direction}</span>
                      <span className="text-muted-foreground font-mono">${t.entry.toFixed(t.entry > 10 ? 2 : 4)}</span>
                      <span className={cn("ml-auto font-mono font-bold", t.outcome === "WIN" ? "text-emerald-400" : "text-rose-400")}>
                        {t.pnlPct > 0 ? "+" : ""}{t.pnlPct.toFixed(2)}%
                      </span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold",
                        t.outcome === "WIN" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                        {t.outcome}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{t.confidence}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── REASONS TAB ── */}
      {!error && tab === "reasons" && (
        <div className="p-4">
          {!signal ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              No current signal to explain.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary */}
              <div className={cn("flex items-center gap-3 p-3 rounded-xl border",
                isBuy ? "bg-emerald-500/8 border-emerald-500/30" : "bg-rose-500/8 border-rose-500/30")}>
                <Info className={cn("w-4 h-4 shrink-0", isBuy ? "text-emerald-400" : "text-rose-400")} />
                <div className="text-sm">
                  <span className={cn("font-bold", isBuy ? "text-emerald-400" : "text-rose-400")}>{dir} Signal</span>
                  {" "}with <span className="font-bold">{signal.confidence}% confidence</span>.{" "}
                  {isBuy ? signal.bullScore : signal.bearScore}/9 indicators confirmed.
                </div>
              </div>

              {/* Reasons list */}
              <div className="space-y-1.5">
                {reasonsToShow.map((r, i) => (
                  <div key={i} className="text-sm bg-secondary/20 rounded-lg px-3 py-2.5 leading-snug">{r}</div>
                ))}
              </div>

              {reasons.length > 5 && (
                <button
                  onClick={() => setShowAll(s => !s)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {showAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showAll ? "Show less" : `Show ${reasons.length - 5} more`}
                </button>
              )}

              {/* Signal metadata */}
              <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/40 space-y-1">
                <div>Signal time: {new Date(signal.time * 1000).toLocaleString()}</div>
                <div>BB Squeeze: {signal.bbSqueeze ? "⚠️ Active (low vol)" : "Normal"}</div>
                <div>Session filter: {signal.inSession ? "✅ In active session" : "⚠️ Outside session"}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
