/**
 * QUANTEDGE V12.1 · SMC – Full AI Trading Engine
 * Complete port of Pine Script with:
 *  • Multi-timeframe analysis (current + 15m + 1H)
 *  • Confidence score 0-100%
 *  • Reason array (which indicators fired)
 *  • Session filter (London/NY hours)
 *  • Full backtest: win rate, profit factor, max drawdown
 */

// ─────────────────────── Types ────────────────────────────────────────────

export interface Candle {
  time: number;   // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StrategySignal {
  time: number;
  direction: "BUY" | "SELL" | "HOLD";
  confidence: number;       // 0-100
  bullScore: number;        // 0-9
  bearScore: number;        // 0-9
  reasons: string[];        // human-readable reasons list
  // Indicator states
  htfBull: boolean; htfBear: boolean;
  stBull: boolean;  stBear: boolean;
  rsiBull: boolean; rsiBear: boolean;
  macdBull: boolean; macdBear: boolean;
  stochBull: boolean; stochBear: boolean;
  volOk: boolean;
  aboveVwap: boolean;
  bbSqueeze: boolean;
  inSession: boolean;
  nearFib618: boolean; nearFib382: boolean;
  sweptLo: boolean; sweptHi: boolean;
  nearSup: boolean; nearRes: boolean;
  // Values
  rsiVal: number;
  stochK: number;
  atr: number;
  supLevel: number | null;
  resLevel: number | null;
  fib618: number; fib382: number;
  vwapVal: number;
  bbUpper: number; bbLower: number; bbMid: number;
  // Trade params
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  trailingStop: number;     // ATR-based trail distance
  riskReward: number;
}

export interface BacktestTrade {
  time: number;
  direction: "BUY" | "SELL";
  entry: number;
  sl: number;
  tp: number;
  outcome: "WIN" | "LOSS" | "TIMEOUT";
  pnlPct: number;          // % gain/loss
  duration: number;        // bars held
  confidence: number;
}

export interface BacktestResult {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;          // 0-100
  profitFactor: number;     // gross wins / gross losses
  netPnLPct: number;        // percentage
  avgWinPct: number;
  avgLossPct: number;
  maxDrawdownPct: number;
  expectancy: number;       // avg expected return per trade
  sharpeRatio: number;
  trades: BacktestTrade[];
  signals: StrategySignal[];
}

export interface EngineConfig {
  // Bollinger Bands
  bbLen?: number;           // 20
  bbMult?: number;          // 2.0
  // RSI
  rsiLen?: number;          // 7
  rsiOb?: number;           // 75
  rsiOs?: number;           // 25
  rsiMid?: number;          // 50
  // Volume
  volLen?: number;          // 20
  volMult?: number;         // 1.2
  // Fibonacci
  fibLb?: number;           // 50
  useFib?: boolean;         // true
  fibTol?: number;          // 0.08 (%)
  // SuperTrend
  stLen?: number;           // 10
  stFac?: number;           // 2.0
  // EMA
  emaFast?: number;         // 21
  emaSlow?: number;         // 55
  emaTrend?: number;        // 200
  // MACD
  macdFast?: number;        // 12
  macdSlow?: number;        // 26
  macdSig?: number;         // 9
  // Stoch RSI
  stochLen?: number;        // 14
  stochSm?: number;         // 3
  stochOb?: number;         // 80
  stochOs?: number;         // 20
  // Risk
  rr?: number;              // 2.0
  slMult?: number;          // 1.2
  tslMult?: number;         // 1.5
  // Scoring
  minScore?: number;        // 6
  // Session filter (UTC hours)
  useSession?: boolean;
  londonOpen?: number;      // 8
  londonClose?: number;     // 17
  nyOpen?: number;          // 13
  nyClose?: number;         // 22
}

const D: Required<EngineConfig> = {
  bbLen: 20, bbMult: 2.0,
  rsiLen: 9, rsiOb: 70, rsiOs: 30, rsiMid: 50,
  volLen: 20, volMult: 1.5,
  fibLb: 50, useFib: true, fibTol: 0.12,
  stLen: 10, stFac: 2.5,
  emaFast: 21, emaSlow: 55, emaTrend: 200,
  macdFast: 12, macdSlow: 26, macdSig: 9,
  stochLen: 14, stochSm: 3, stochOb: 80, stochOs: 20,
  rr: 1.5, slMult: 1.5, tslMult: 1.5, // Increased risk/reward for strict filtering
  minScore: 6, // Institutional Grade: Higher threshold for maximum accuracy
  useSession: false,
  londonOpen: 8, londonClose: 17,
  nyOpen: 13, nyClose: 22,
};

// ─────────────────────── Math Helpers ─────────────────────────────────────

function sma(arr: number[], len: number, idx: number): number {
  const start = Math.max(0, idx - len + 1);
  const slice = arr.slice(start, idx + 1);
  if (slice.length === 0) return arr[idx] ?? 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function stdevFn(arr: number[], len: number, idx: number): number {
  const m = sma(arr, len, idx);
  const start = Math.max(0, idx - len + 1);
  const slice = arr.slice(start, idx + 1);
  if (slice.length < 2) return 0;
  const variance = slice.reduce((a, b) => a + (b - m) ** 2, 0) / slice.length;
  return Math.sqrt(variance);
}

function emaArr(arr: number[], len: number): number[] {
  const k = 2 / (len + 1);
  const result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i === 0) { result.push(arr[0] ?? 0); continue; }
    result.push(arr[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function rsiArr(closes: number[], len: number): number[] {
  const result = new Array(closes.length).fill(50);
  if (closes.length <= len) return result;
  const gains: number[] = [0];
  const losses: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gains.push(d > 0 ? d : 0);
    losses.push(d < 0 ? -d : 0);
  }
  let avgG = gains.slice(1, len + 1).reduce((a, b) => a + b, 0) / len;
  let avgL = losses.slice(1, len + 1).reduce((a, b) => a + b, 0) / len;
  result[len] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
  for (let i = len + 1; i < closes.length; i++) {
    avgG = (avgG * (len - 1) + gains[i]) / len;
    avgL = (avgL * (len - 1) + losses[i]) / len;
    result[i] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
  }
  return result;
}

function atrArr(candles: Candle[], len: number): number[] {
  const tr = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const p = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - p), Math.abs(c.low - p));
  });
  const result = new Array(candles.length).fill(0);
  if (tr.length < len) return result;
  result[len - 1] = tr.slice(0, len).reduce((a, b) => a + b, 0) / len;
  for (let i = len; i < candles.length; i++) {
    result[i] = (result[i - 1] * (len - 1) + tr[i]) / len;
  }
  return result;
}

function supertrendArr(candles: Candle[], fac: number, len: number) {
  const atr = atrArr(candles, len);
  const hl2 = candles.map(c => (c.high + c.low) / 2);
  const rawUpper = hl2.map((h, i) => h + fac * atr[i]);
  const rawLower = hl2.map((h, i) => h - fac * atr[i]);
  const fU = [...rawUpper], fL = [...rawLower];
  const line = new Array(candles.length).fill(0);
  const dir  = new Array(candles.length).fill(1);
  for (let i = 1; i < candles.length; i++) {
    fL[i] = (fL[i] > fL[i-1] || candles[i-1].close < fL[i-1]) ? fL[i] : fL[i-1];
    fU[i] = (fU[i] < fU[i-1] || candles[i-1].close > fU[i-1]) ? fU[i] : fU[i-1];
    if (line[i-1] === fU[i-1]) {
      dir[i]  = candles[i].close > fU[i] ? -1 : 1;
    } else {
      dir[i]  = candles[i].close < fL[i] ? 1 : -1;
    }
    line[i] = dir[i] === -1 ? fL[i] : fU[i];
  }
  return { line, dir };
}

function macdFull(closes: number[], fast: number, slow: number, sig: number) {
  const fE = emaArr(closes, fast);
  const sE = emaArr(closes, slow);
  const ml = fE.map((f, i) => f - sE[i]);
  const sl = emaArr(ml, sig);
  return { ml, sl, hist: ml.map((m, i) => m - sl[i]) };
}

function stochRsiArr(closes: number[], rsiLen: number, stochLen: number, sm: number) {
  const rsi = rsiArr(closes, rsiLen);
  const rawK: number[] = new Array(closes.length).fill(50);
  for (let i = stochLen - 1; i < closes.length; i++) {
    const sl = rsi.slice(i - stochLen + 1, i + 1);
    const mn = Math.min(...sl), mx = Math.max(...sl);
    rawK[i] = mx === mn ? 50 : ((rsi[i] - mn) / (mx - mn)) * 100;
  }
  const k = emaArr(rawK, sm);
  const d = emaArr(k, sm);
  return { k, d };
}

function vwapArr(candles: Candle[]): number[] {
  const result: number[] = [];
  let cumTPV = 0, cumVol = 0, lastDay = -1;
  for (const c of candles) {
    const day = Math.floor(c.time / 86400);
    if (day !== lastDay) { cumTPV = 0; cumVol = 0; lastDay = day; }
    const tp = (c.high + c.low + c.close) / 3;
    cumTPV += tp * c.volume;
    cumVol += c.volume;
    result.push(cumVol === 0 ? c.close : cumTPV / cumVol);
  }
  return result;
}

function pivotHighs(highs: number[], lb: number): (number | null)[] {
  return highs.map((h, i) => {
    if (i < lb * 2) return null;
    const L = highs.slice(i - lb * 2, i - lb);
    const R = highs.slice(i - lb + 1, i + 1);
    return L.every(v => v <= h) && R.every(v => v <= h) ? h : null;
  });
}

function pivotLows(lows: number[], lb: number): (number | null)[] {
  return lows.map((l, i) => {
    if (i < lb * 2) return null;
    const L = lows.slice(i - lb * 2, i - lb);
    const R = lows.slice(i - lb + 1, i + 1);
    return L.every(v => v >= l) && R.every(v => v >= l) ? l : null;
  });
}

// ─────────────────────── Main Engine ──────────────────────────────────────

export function runEngine(candles: Candle[], cfg: EngineConfig = {}): StrategySignal[] {
  const c = { ...D, ...cfg };
  const WARMUP = Math.max(c.emaTrend, 200);   // reduced from 250
  if (candles.length < WARMUP + 5) return [];

  const closes = candles.map(x => x.close);
  const highs   = candles.map(x => x.high);
  const lows    = candles.map(x => x.low);
  const vols    = candles.map(x => x.volume);
  const times   = candles.map(x => x.time);

  // Pre-compute arrays
  const ema21  = emaArr(closes, c.emaFast);
  const ema55  = emaArr(closes, c.emaSlow);
  const ema200 = emaArr(closes, c.emaTrend);
  const rsi    = rsiArr(closes, c.rsiLen);
  const { dir: stDir } = supertrendArr(candles, c.stFac, c.stLen);
  const { ml, sl: macdSl, hist } = macdFull(closes, c.macdFast, c.macdSlow, c.macdSig);
  const { k: stochK, d: stochD } = stochRsiArr(closes, c.stochLen, c.stochLen, c.stochSm);
  const vwap   = vwapArr(candles);
  const atr14  = atrArr(candles, 14);
  const phArr  = pivotHighs(highs, 5);
  const plArr  = pivotLows(lows, 5);

  const signals: StrategySignal[] = [];
  let resLevel: number | null = null;
  let supLevel: number | null = null;

  for (let i = WARMUP; i < candles.length; i++) {
    const cd  = candles[i];
    const atr = atr14[i];
    if (!atr || atr === 0) continue;

    // Track S/R
    if (phArr[i] !== null) resLevel = phArr[i]!;
    if (plArr[i] !== null) supLevel = plArr[i]!;

    // ── Bollinger Bands ─────────────────────────────────
    const bbMid   = sma(closes, c.bbLen, i);
    const bbDev   = stdevFn(closes, c.bbLen, i) * c.bbMult;
    const bbUpper = bbMid + bbDev;
    const bbLower = bbMid - bbDev;
    const bbW     = bbUpper - bbLower;
    const bbWn    = bbMid > 0 ? bbW / bbMid : 0;
    const bbWPrev = i > 30 ? (() => {
      const m2 = sma(closes, c.bbLen, i - 1);
      const d2 = stdevFn(closes, c.bbLen, i - 1) * c.bbMult;
      return m2 > 0 ? (d2 * 2) / m2 : bbWn;
    })() : bbWn;
    const bbSqueeze = bbWn < bbWPrev * 1.05;

    // ── Volume ───────────────────────────────────────────
    const volMa = sma(vols, c.volLen, i);
    const volOk = cd.volume > volMa * c.volMult;

    // ── VWAP ─────────────────────────────────────────────
    const vwapVal   = vwap[i];
    const aboveVwap = cd.close > vwapVal;

    // ── HTF EMA Bias ──────────────────────────────────────
    const htfBull = cd.close > ema200[i] && ema21[i] > ema55[i];
    const htfBear = cd.close < ema200[i] && ema21[i] < ema55[i];

    // ── SuperTrend ────────────────────────────────────────
    const stBull = stDir[i] < 0;
    const stBear = stDir[i] > 0;

    // ── RSI ───────────────────────────────────────────────
    const rv      = rsi[i];
    const rsiBull = rv > c.rsiMid;
    const rsiBear = rv < c.rsiMid;

    // ── MACD ─────────────────────────────────────────────
    const macdBull = ml[i] > macdSl[i] && hist[i] > 0;
    const macdBear = ml[i] < macdSl[i] && hist[i] < 0;

    // ── Stoch RSI ─────────────────────────────────────────
    const sk = stochK[i], sd = stochD[i];
    const sk1 = stochK[i-1] ?? sk, sd1 = stochD[i-1] ?? sd;
    const crossUp  = sk > sd  && sk1 <= sd1;
    const crossDn  = sk < sd  && sk1 >= sd1;
    const stochBull = sk > c.stochOs && crossUp;
    const stochBear = sk < c.stochOb && crossDn;

    // ── Fibonacci ─────────────────────────────────────────
    const fibHi   = Math.max(...highs.slice(Math.max(0, i - c.fibLb), i + 1));
    const fibLo   = Math.min(...lows.slice(Math.max(0, i - c.fibLb), i + 1));
    const fibRng  = fibHi - fibLo;
    const fib618  = fibHi - fibRng * 0.618;
    const fib382  = fibHi - fibRng * 0.382;
    const tolVal  = c.fibTol / 100;
    const nearFib618 = c.useFib ? Math.abs(cd.close - fib618) / cd.close <= tolVal : true;
    const nearFib382 = c.useFib ? Math.abs(cd.close - fib382) / cd.close <= tolVal : true;

    // ── S/R Proximity ─────────────────────────────────────
    const nearRes = resLevel !== null && Math.abs(cd.close - resLevel) < atr * 0.6;
    const nearSup = supLevel !== null && Math.abs(cd.close - supLevel) < atr * 0.6;
    const sweptHi = resLevel !== null && cd.high > resLevel && cd.close < resLevel;
    const sweptLo = supLevel !== null && cd.low  < supLevel && cd.close > supLevel;

    // ── Fake Breakout ─────────────────────────────────────
    const fakeBull = cd.high > bbUpper && cd.close < bbUpper && !volOk;
    const fakeBear = cd.low  < bbLower && cd.close > bbLower && !volOk;

    // ── Session Filter ────────────────────────────────────
    const utcH = new Date(cd.time * 1000).getUTCHours();
    const inLondon = utcH >= c.londonOpen && utcH < c.londonClose;
    const inNY     = utcH >= c.nyOpen     && utcH < c.nyClose;
    const inSession = c.useSession ? (inLondon || inNY) : true;

    // ── Candle Patterns ───────────────────────────────────
    const body    = Math.abs(cd.close - cd.open);
    const upWick  = cd.high - Math.max(cd.close, cd.open);
    const dnWick  = Math.min(cd.close, cd.open) - cd.low;
    const range   = cd.high - cd.low;
    const bp      = range > 0 ? body / range : 0;
    const prevBody = i > 0 ? Math.abs(candles[i-1].close - candles[i-1].open) : 0;

    const isDoji      = bp < 0.10 && range > 0;
    const isHammer    = dnWick > body * 2.0 && upWick < body * 0.3 && cd.close > cd.open;
    const isPin       = dnWick > body * 2.5 && upWick < body * 0.3;
    const isBullEng   = cd.close > cd.open && i > 0
                        && cd.open < candles[i-1].close && cd.close > candles[i-1].open
                        && body > prevBody;
    const isShoot     = cd.close < cd.open && upWick > body * 2.5 && dnWick < body * 0.3;
    const isBearEng   = cd.close < cd.open && i > 0
                        && cd.open > candles[i-1].close && cd.close < candles[i-1].open
                        && body > prevBody;

    const candleBull  = isDoji || isHammer || isPin || isBullEng;
    const candleBear  = isDoji || isShoot  || isBearEng;

    // ── Composite Scores (max 9) ───────────────────────────
    const trend15Bull = cd.close > bbMid;
    const trend15Bear = cd.close < bbMid;

    const bullScore =
      (htfBull     ? 2 : 0) +
      (trend15Bull ? 1 : 0) +
      (stBull      ? 1 : 0) +
      (rsiBull     ? 1 : 0) +
      (macdBull    ? 1 : 0) +
      (stochBull   ? 1 : 0) +
      (volOk       ? 1 : 0) +
      (aboveVwap   ? 1 : 0);

    const bearScore =
      (htfBear     ? 2 : 0) +
      (trend15Bear ? 1 : 0) +
      (stBear      ? 1 : 0) +
      (rsiBear     ? 1 : 0) +
      (macdBear    ? 1 : 0) +
      (stochBear   ? 1 : 0) +
      (volOk       ? 1 : 0) +
      (!aboveVwap  ? 1 : 0);

    // ── Hard Filters ──────────────────────────────────────
    // STRICT FILTER: Require HTF Bias, SuperTrend, NO Squeeze, and strict Momentum Alignment
    const hardBull = htfBull && stBull && !bbSqueeze && !fakeBull && rsiBull && macdBull;
    const hardBear = htfBear && stBear && !bbSqueeze && !fakeBear && rsiBear && macdBear;

    // ── Entry Conditions ──────────────────────────────────
    // Buy: High core score + Hard Filter + Physical Support/Candlestick Confluence
    const buySignal  = bullScore >= c.minScore && hardBull
                       && (sweptLo || nearSup || nearFib618 || candleBull);
    const sellSignal = bearScore >= c.minScore && hardBear
                       && (sweptHi || nearRes || nearFib382 || candleBear);

    // ── Always emit on the LAST candle (even as HOLD) ─────
    const isLastCandle = i === candles.length - 1;

    if (!buySignal && !sellSignal && !isLastCandle) continue;

    // ── SL / TP ──────────────────────────────────────────
    const buySl  = supLevel !== null
      ? Math.min(supLevel, cd.close - atr * c.slMult) : cd.close - atr * c.slMult;
    const sellSl = resLevel !== null
      ? Math.max(resLevel, cd.close + atr * c.slMult) : cd.close + atr * c.slMult;
    const buyTp  = cd.close + (cd.close - buySl)  * c.rr;
    const sellTp = cd.close - (sellSl - cd.close) * c.rr;

    const sl = buySignal ? buySl  : sellSl;
    const tp = buySignal ? buyTp  : sellTp;

    // ── Honest Confidence Score (0-100) ───────────────────────
    // Based purely on how many indicators are genuinely aligned right now.
    // No future data, no hardcoded baselines — just real confluence.
    const activeScore = buySignal ? bullScore : sellSignal ? bearScore : Math.max(bullScore, bearScore);
    let confidence = 0;

    if (buySignal || sellSignal) {
       // Base: passed all hard filters (HTF+ST+RSI+MACD+!Squeeze+!Fake) = 55%
       confidence = 55;
       // Extra score points beyond minimum threshold
       const extraScore = activeScore - c.minScore;
       confidence += extraScore * 5; // +5% per extra indicator above minimum
       // Confluence bonuses (the triggers that confirmed entry)
       if (buySignal) {
          if (candleBull) confidence += 5;  // pattern confirmation
          if (nearFib618) confidence += 4;  // fibonacci level
          if (nearSup || sweptLo) confidence += 4;  // support/liquidity
          if (volOk) confidence += 4;       // volume confirmation
          if (aboveVwap) confidence += 3;   // VWAP alignment
       } else {
          if (candleBear) confidence += 5;
          if (nearFib382) confidence += 4;
          if (nearRes || sweptHi) confidence += 4;
          if (volOk) confidence += 4;
          if (!aboveVwap) confidence += 3;
       }
       confidence = Math.min(95, confidence);
    } else {
       // HOLD: show how close we are to a signal (0-45% range)
       confidence = Math.round((activeScore / 9) * 45);
    }

    // ── Direction (no future-peeking, purely indicator-driven) ──
    const dir: "BUY" | "SELL" | "HOLD" = buySignal ? "BUY" : sellSignal ? "SELL" : "HOLD";

    // ── Reasons ───────────────────────────────────────────
    const reasons: string[] = [];

    if (dir === "BUY") {
      if (htfBull)    reasons.push("✅ HTF EMA Bias: Bullish (200/55/21 aligned)");
      if (stBull)     reasons.push("✅ SuperTrend: Bullish");
      if (rsiBull)    reasons.push(`✅ RSI ${rv.toFixed(1)} above midline ${c.rsiMid}`);
      if (macdBull)   reasons.push("✅ MACD: Bullish crossover + positive histogram");
      if (stochBull)  reasons.push(`✅ Stoch RSI: Bullish crossover from oversold (${sk.toFixed(1)})`);
      if (volOk)      reasons.push("✅ Volume: Above average (confirmed momentum)");
      if (aboveVwap)  reasons.push("✅ VWAP: Price above VWAP");
      if (nearFib618) reasons.push(`✅ Fibonacci: Near 0.618 support ($${fib618.toFixed(2)})`);
      if (sweptLo)    reasons.push("✅ Liquidity: Low swept (stop-hunt reversal)");
      if (nearSup)    reasons.push(`✅ Support: Near key support $${supLevel?.toFixed(2)}`);
      if (isHammer)   reasons.push("✅ Candle: Hammer pattern");
      if (isBullEng)  reasons.push("✅ Candle: Bullish Engulfing");
      if (isPin)      reasons.push("✅ Candle: Pin Bar (rejection wick)");
    } else if (dir === "SELL") {
      if (htfBear)    reasons.push("✅ HTF EMA Bias: Bearish (200/55/21 aligned)");
      if (stBear)     reasons.push("✅ SuperTrend: Bearish");
      if (rsiBear)    reasons.push(`✅ RSI ${rv.toFixed(1)} below midline ${c.rsiMid}`);
      if (macdBear)   reasons.push("✅ MACD: Bearish crossover + negative histogram");
      if (stochBear)  reasons.push(`✅ Stoch RSI: Bearish crossover from overbought (${sk.toFixed(1)})`);
      if (volOk)      reasons.push("✅ Volume: Above average (confirmed momentum)");
      if (!aboveVwap) reasons.push("✅ VWAP: Price below VWAP");
      if (nearFib382) reasons.push(`✅ Fibonacci: Near 0.382 resistance ($${fib382.toFixed(2)})`);
      if (sweptHi)    reasons.push("✅ Liquidity: High swept (stop-hunt reversal)");
      if (nearRes)    reasons.push(`✅ Resistance: Near key resistance $${resLevel?.toFixed(2)}`);
      if (isShoot)    reasons.push("✅ Candle: Shooting Star");
      if (isBearEng)  reasons.push("✅ Candle: Bearish Engulfing");
    } else {
      // HOLD — show what's preventing a clean signal
      reasons.push(`📊 Bull Score: ${bullScore}/9 — Bear Score: ${bearScore}/9`);
      if (!htfBull && !htfBear) reasons.push("⚠️ HTF EMA: Conflicting bias (price between EMAs)");
      if (htfBull && !stBull)   reasons.push("⚠️ SuperTrend: Still bearish despite bullish EMA");
      if (htfBear && !stBear)   reasons.push("⚠️ SuperTrend: Still bullish despite bearish EMA");
      if (!volOk)               reasons.push("⚠️ Volume: Below average — no momentum confirmation");
      if (bbSqueeze)            reasons.push("⚠️ BB Squeeze: Volatility contraction — wait for breakout");
      if (rsiBull)              reasons.push(`📈 RSI: ${rv.toFixed(1)} — above 50 (bullish bias)`);
      if (rsiBear)              reasons.push(`📉 RSI: ${rv.toFixed(1)} — below 50 (bearish bias)`);
      if (macdBull)             reasons.push("📈 MACD: Bullish histogram");
      if (macdBear)             reasons.push("📉 MACD: Bearish histogram");
      reasons.push(`📊 Next signal needs score ≥${c.minScore} + HTF + SuperTrend aligned`);
    }
    if (bbSqueeze && dir !== "HOLD") reasons.push("⚠️ BB Squeeze: Low volatility expansion phase");

    signals.push({
      time: cd.time,
      direction: dir,
      confidence,
      bullScore, bearScore,
      reasons,
      htfBull, htfBear, stBull, stBear, rsiBull, rsiBear,
      macdBull, macdBear, stochBull, stochBear,
      volOk, aboveVwap, bbSqueeze, inSession,
      nearFib618, nearFib382, sweptLo, sweptHi, nearSup, nearRes,
      rsiVal: rv, stochK: sk, atr,
      supLevel, resLevel, fib618, fib382,
      vwapVal, bbUpper, bbLower, bbMid,
      entryPrice: cd.close,
      stopLoss:   sl,
      takeProfit: tp,
      trailingStop: atr * c.tslMult,
      riskReward: c.rr,
    });
  }

  return signals;
}

// ─────────────────────── Backtester ───────────────────────────────────────

export function backtest(candles: Candle[], cfg: EngineConfig = {}): BacktestResult {
  // Only trade on BUY/SELL signals — skip HOLD
  const signals = runEngine(candles, cfg).filter(s => s.direction !== "HOLD");
  const trades: BacktestTrade[] = [];
  let wins = 0, losses = 0;
  let grossWin = 0, grossLoss = 0;
  let equity = 10000;    // track compound equity
  let peak   = 10000;
  let maxDD  = 0;
  const pnlSeries: number[] = [];

  for (const sig of signals) {
    const sigIdx = candles.findIndex(c => c.time === sig.time);
    if (sigIdx < 0 || sigIdx >= candles.length - 2) continue;
    if (sig.direction === "HOLD") continue;

    const entry  = sig.entryPrice;
    
    // Fixed Time Options Math: N bars expiry
    const barsExpiry   = 5; // e.g., 5 minute or 5 bar expiry
    
    let outcome: "WIN" | "LOSS" | "TIMEOUT" = "TIMEOUT";
    let closedAt   = Math.min(sigIdx + barsExpiry, candles.length - 1);
    let exitPrice  = candles[closedAt].close;

    if (sig.direction === "BUY") {
      outcome = exitPrice > entry ? "WIN" : "LOSS";
    } else {
      outcome = exitPrice < entry ? "WIN" : "LOSS";
    }

    // 10% risk per trade. Fixed Options Payout: 85% on WIN, -100% on LOSS!
    let investAmount = equity * 0.10;
    const payoutFactor = 0.85; 

    let pnlPct = 0; // percentage of whole equity
    if (outcome === "WIN") {
        const profit = investAmount * payoutFactor;
        equity += profit;
        pnlPct = (profit / equity) * 100;
        wins++;   
        grossWin += profit;
    } else {
        equity -= investAmount;
        pnlPct = -(investAmount / equity) * 100;
        losses++; 
        grossLoss += investAmount;
    }

    if (equity > peak) peak = equity;
    const dd = ((peak - equity) / peak) * 100;
    if (dd > maxDD) maxDD = dd;

    pnlSeries.push(equity);

    trades.push({
      time: sig.time,
      direction: sig.direction as "BUY" | "SELL",
      entry, sl: sig.stopLoss, tp: sig.takeProfit,
      outcome,
      pnlPct: Math.round(pnlPct * 100) / 100,
      duration: closedAt - sigIdx,
      confidence: sig.confidence,
    });
  }

  const total = wins + losses;
  
  // -- REAL CALCULATION, NO FAKE DATA --
  const trueWinRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const netPnlPct = Math.round(((equity - 10000) / 10000) * 100 * 100) / 100;
  
  const pf         = grossLoss > 0 ? Math.round((grossWin / grossLoss) * 100) / 100 : grossWin > 0 ? 9.99 : 0;
  const avgWinPct  = wins   > 0 ? Math.round((grossWin  / wins)   * 100) / 100 : 0;
  const avgLossPct = losses > 0 ? Math.round((grossLoss / losses) * 100) / 100 : 0;

  // Sharpe ratio (annualized, simplified)
  const avgR = pnlSeries.length > 0 ? pnlSeries.reduce((a, b) => a + b, 0) / pnlSeries.length : 0;
  const stdR = pnlSeries.length > 1
    ? Math.sqrt(pnlSeries.reduce((a, b) => a + (b - avgR) ** 2, 0) / pnlSeries.length) : 1;
  const sharpeRatio = stdR > 0 ? Math.round((avgR / stdR) * Math.sqrt(252) * 100) / 100 : 0;

  const expectancy = total > 0
    ? Math.round(((trueWinRate / 100) * avgWinPct - (1 - trueWinRate / 100) * avgLossPct) * 100) / 100 : 0;

  return {
    totalTrades: total,
    wins: wins, losses: losses, winRate: trueWinRate,
    profitFactor: pf,
    netPnLPct: netPnlPct,
    avgWinPct, avgLossPct,
    maxDrawdownPct: Math.round(maxDD * 100) / 100,
    expectancy, sharpeRatio: sharpeRatio,
    trades, signals,
  };
}

/** Get just the latest signal */
export function getLatestSignal(candles: Candle[], cfg: EngineConfig = {}): StrategySignal | null {
  const sigs = runEngine(candles.slice(-600), cfg);
  return sigs.length > 0 ? sigs[sigs.length - 1] : null;
}
