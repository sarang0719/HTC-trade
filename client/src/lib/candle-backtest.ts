/**
 * candle-backtest.ts — REAL walk-forward accuracy testing for predictNextCandle().
 *
 * This replaces the fabricated "78.4% trained win rate" that used to be
 * hardcoded in candle-predictor.ts. There is no shortcut here: to know how
 * often the predictor is actually right, you have to run it against real
 * historical candles and count.
 *
 * Usage:
 *   const result = backtestPredictor(historicalCandles, 60);
 *   console.log(result.accuracy, result.sampleSize);
 *
 * Read result.accuracy for what it is: performance on PAST data for ONE
 * symbol/timeframe. It is not a guarantee of future performance, and it will
 * vary a lot symbol-to-symbol and regime-to-regime. Re-run this whenever you
 * want an up-to-date number instead of trusting a stale one.
 */

import type { Candle } from "./strategy-engine";
import { predictNextCandle } from "./candle-predictor";

export interface BacktestResult {
  accuracy: number;        // % of confirmed signals where direction matched the next candle's actual close vs open
  sampleSize: number;      // how many confirmed signals were evaluated
  totalCandlesSeen: number;
  wins: number;
  losses: number;
  byStrength: Record<"STRONG" | "NORMAL" | "WEAK", { wins: number; losses: number }>;
}

/**
 * Walk forward through `candles`, generating a prediction at each step using
 * only the data available up to that point (no lookahead), then check it
 * against what actually happened on the following candle.
 *
 * Only "confirmed" signals are scored — unconfirmed/MONITORING signals aren't
 * real calls, so including them would inflate or deflate the number
 * meaninglessly.
 */
export function backtestPredictor(candles: Candle[], candleSeconds = 60, customWeights?: any): BacktestResult {
  const byStrength: BacktestResult["byStrength"] = {
    STRONG: { wins: 0, losses: 0 },
    NORMAL: { wins: 0, losses: 0 },
    WEAK:   { wins: 0, losses: 0 },
  };

  let wins = 0;
  let losses = 0;

  const MIN_HISTORY = 50; // must match WARMUP in candle-predictor.ts

  for (let i = MIN_HISTORY; i < candles.length - 1; i++) {
    const windowSoFar = candles.slice(0, i + 1); // only data up to and including candle i — no peeking ahead
    const prediction = predictNextCandle(windowSoFar, candleSeconds, customWeights);

    if (!prediction.isConfirmed) continue; // only score real, confirmed calls

    const nextCandle = candles[i + 1];
    const actualDirection = nextCandle.close >= nextCandle.open ? "BUY" : "SELL";
    const correct = prediction.direction === actualDirection;

    if (correct) wins++; else losses++;

    const strength = prediction.strength ?? "WEAK";
    if (correct) byStrength[strength].wins++; else byStrength[strength].losses++;
  }

  const sampleSize = wins + losses;
  const accuracy = sampleSize > 0 ? Math.round((wins / sampleSize) * 1000) / 10 : 0;

  return {
    accuracy,
    sampleSize,
    totalCandlesSeen: candles.length,
    wins,
    losses,
    byStrength,
  };
}
