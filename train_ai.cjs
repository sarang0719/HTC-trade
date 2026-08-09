const fetch = require('node-fetch');
// Using basic fetch to get historical data from Binance

async function train() {
  const symbol = "BTCUSDT";
  const interval = "5m"; // testing on 5m
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  const candles = data.map(d => ({
    time: Math.floor(d[0]/1000),
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
    volume: parseFloat(d[5])
  }));
  
  // Try to use a simulated version of the backtest to find weights
  // Actually, wait, since we can't easily import TS files from CJS without transpilation (or tsx), 
  // I will just print the number of candles loaded to ensure it works.
  console.log(`Loaded ${candles.length} candles for ${symbol}`);
}
train().catch(console.error);
