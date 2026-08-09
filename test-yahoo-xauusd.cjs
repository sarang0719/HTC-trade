const fetch = require('node-fetch');
fetch('https://query1.finance.yahoo.com/v8/finance/chart/XAUUSD=X?interval=1m&range=1d', {
  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
})
  .then(res => res.json())
  .then(data => {
     console.log(data?.chart?.result?.[0]?.meta?.regularMarketPrice);
     console.log(data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.slice(-1)[0]);
  })
  .catch(console.error);
