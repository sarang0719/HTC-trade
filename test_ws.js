const WebSocket = require('ws');
function test(symbol) {
  const wsUrl = `wss://stream.binance.com:9443/stream?streams=${symbol}@miniTicker`;
  const ws = new WebSocket(wsUrl);
  ws.on('open', () => console.log(`[${symbol}] Connected`));
  ws.on('message', (data) => console.log(`[${symbol}] Message:`, data.toString().slice(0, 50)));
  ws.on('error', (err) => console.log(`[${symbol}] Error:`, err.message));
  ws.on('close', (code, reason) => console.log(`[${symbol}] Closed:`, code, reason.toString()));
}
test('paxgusdt');
test('xautusdt');
test('btcusdt');
setTimeout(() => process.exit(0), 5000);
