import { predictNextCandle } from '../client/src/lib/candle-predictor';
import { backtestPredictor } from '../client/src/lib/candle-backtest';

async function train() {
  const symbol = "BTCUSDT";
  const interval = "5m";
  console.log(`Fetching 1000 candles for ${symbol}...`);
  const res = await fetch(`https://api3.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`);
  const data = await res.json();
  
  const candles = data.map((d: any) => ({
    time: Math.floor(d[0]/1000),
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
    volume: parseFloat(d[5])
  }));

  console.log("Base backtest performance with default weights:");
  let result = backtestPredictor(candles, 300);
  console.log(`Accuracy: ${result.accuracy}%, sample size: ${result.sampleSize}`);

  console.log("Running grid search for optimal weights...");
  let bestW = null;
  let bestAcc = 0;
  
  // Weights ranges
  const W_RANGE = [1, 2, 3, 4, 5];
  
  // We'll test random combinations to avoid full grid search which is O(5^8)
  for (let i = 0; i < 500; i++) {
     const customW = {
        SMC_OB_FVG: W_RANGE[Math.floor(Math.random() * W_RANGE.length)],
        EXHAUSTION: W_RANGE[Math.floor(Math.random() * W_RANGE.length)],
        BOS_CHOCH: W_RANGE[Math.floor(Math.random() * W_RANGE.length)],
        EMA_STACK: W_RANGE[Math.floor(Math.random() * W_RANGE.length)],
        VOLUMETRIC: W_RANGE[Math.floor(Math.random() * W_RANGE.length)],
        RSI_ACCEL: W_RANGE[Math.floor(Math.random() * W_RANGE.length)],
        ST_CHANNEL: W_RANGE[Math.floor(Math.random() * W_RANGE.length)],
        MACD_FLOW: W_RANGE[Math.floor(Math.random() * W_RANGE.length)],
     };
     const res = backtestPredictor(candles, 300, customW);
     if (res.sampleSize > 20 && res.accuracy > bestAcc) {
       bestAcc = res.accuracy;
       bestW = customW;
       console.log(`New Best! Acc: ${bestAcc}%, Size: ${res.sampleSize}, Weights: ${JSON.stringify(bestW)}`);
     }
  }
}

train().catch(console.error);
