import { predictNextCandle } from '../client/src/lib/candle-predictor';
import { backtestPredictor } from '../client/src/lib/candle-backtest';

async function runTest(symbol: string, binanceSymbol: string) {
  const interval = "5m"; // 5 minute timeframe
  console.log(`\n==============================================`);
  console.log(`🚀 RUNNING QUANTEDGE V12.1 SMC TEST ON ${symbol}`);
  console.log(`==============================================`);
  console.log(`Fetching 1500 historical candles for ${binanceSymbol}...`);
  
  const res = await fetch(`https://api3.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=1500`);
  const data = await res.json();
  
  if (!Array.isArray(data)) {
    console.error(`Failed to fetch data for ${binanceSymbol}:`, data);
    return;
  }
  
  const candles = data.map((d: any) => ({
    time: Math.floor(d[0]/1000),
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
    volume: parseFloat(d[5])
  }));

  console.log(`Executing Ultra-Strict SMC AI Bot over ${candles.length} candles...`);
  
  // Run the backtest function which utilizes the updated predictNextCandle
  let result = backtestPredictor(candles, 300);
  
  console.log(`\n--- 🏆 TEST RESULTS FOR ${symbol} ---`);
  console.log(`Total Candles Scanned: ${result.totalCandlesSeen}`);
  console.log(`Perfect SMC Setups Found: ${result.sampleSize}`);
  console.log(`Winning Trades: ${result.wins}`);
  console.log(`Losing Trades: ${result.losses}`);
  console.log(`Win Rate Accuracy: ${result.accuracy}%`);
  
  if (result.sampleSize > 0) {
     const profit = (result.wins * 0.85 * 100) - (result.losses * 100); // Assuming 85% payout and $100 trades
     console.log(`Estimated Profit (at $100 per trade): $${profit.toFixed(2)}`);
  } else {
     console.log(`Estimated Profit: $0.00 (No perfect setups detected in this timeframe. Bot avoided all chop!)`);
  }
}

async function main() {
  await runTest("BTCUSD", "BTCUSDT");
  await runTest("XAUUSD", "XAUTUSDT");
}

main().catch(console.error);
