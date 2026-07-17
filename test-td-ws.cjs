const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.twelvedata.com/v1/quotes/price?apikey=4a3bb708bb7247528d0efe958476bdaa');
ws.on('open', () => {
  console.log('connected');
  ws.send(JSON.stringify({ action: 'subscribe', params: { symbols: 'XAU/USD' } }));
});
ws.on('message', (data) => {
  console.log('msg:', data.toString());
});
ws.on('error', (e) => console.log('error', e));
setTimeout(() => process.exit(0), 15000);
