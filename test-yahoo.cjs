const fetch = require('node-fetch');
fetch('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1m&range=1d')
  .then(res => res.json())
  .then(data => console.log(data?.chart?.result?.[0]?.meta?.regularMarketPrice))
  .catch(console.error);
