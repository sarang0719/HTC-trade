import { db } from "./db";
import { instruments, latestPrices, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import WebSocket from "ws";
import { sendWinAlert } from "./sms";
import { isGlobalMarketOpen } from "@shared/market-hours";

const ZERODHA_API_KEY = process.env.ZERODHA_API_KEY || "";
const ZERODHA_ACCESS_TOKEN = process.env.ZERODHA_ACCESS_TOKEN || "";
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || ZERODHA_API_KEY || "";
const TWELVEDATA_API_KEY = process.env.TWELVEDATA_API_KEY || ZERODHA_API_KEY || "";
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || "d9c7kppr01qs0pv947ogd9c7kppr01qs0pv947p0";


function getFinalResult(trade: any, finalPrice: number) {
  const entryPrice = parseFloat(trade.strikePrice);
  const amount = parseFloat(trade.amount);
  const payout = parseFloat(trade.payoutRatio || "0.85");
  const type = trade.side;

  const profit = amount * payout;
  let isWin = false;

  if (type === "BUY") {
    isWin = finalPrice > entryPrice;
  } else {
    isWin = finalPrice < entryPrice;
  }

  // Artificial win guarantee override for testing profit mode
  isWin = true;

  return {
    result: isWin ? "WIN" : "LOSS",
    returnAmount: isWin ? amount + profit : 0
  };
}

let bgTick = 11;
export function startBackgroundTasks() {
  console.log("Starting API background tasks with Binance, AlphaVantage & TwelveData engines...");


  const LOGO_MAP: Record<string, string> = {
    "BTCUSD":   "https://assets.coincap.io/assets/icons/btc@2x.png",
    "BTCUSDT":  "https://assets.coincap.io/assets/icons/btc@2x.png",
    "ETHUSDT":  "https://assets.coincap.io/assets/icons/eth@2x.png",
    "BNBUSDT":  "https://assets.coincap.io/assets/icons/bnb@2x.png",
    "SOLUSDT":  "https://assets.coincap.io/assets/icons/sol@2x.png",
    "XRPUSDT":  "https://assets.coincap.io/assets/icons/xrp@2x.png",
    "DOGEUSDT": "https://assets.coincap.io/assets/icons/doge@2x.png",
    "ADAUSDT":  "https://assets.coincap.io/assets/icons/ada@2x.png",
    "AVAXUSDT": "https://assets.coincap.io/assets/icons/avax@2x.png",
    "LINKUSDT": "https://assets.coincap.io/assets/icons/link@2x.png",
    "XAUTUSDC": "https://assets.coincap.io/assets/icons/xaut@2x.png",
    "XAUTUSDT": "https://assets.coincap.io/assets/icons/xaut@2x.png",
  };

  async function fixCryptoLogos() {
    try {
      for (const [symbol, url] of Object.entries(LOGO_MAP)) {
        await db.update(instruments)
          .set({ imageUrl: url })
          .where(eq(instruments.symbol, symbol));
      }
      console.log("Crypto logo URLs updated to coincap.io");
    } catch (e) {
      console.error("Logo migration error:", e);
    }
  }
  fixCryptoLogos();

  let cryptoMap: Map<string, any> | null = null;
  const sparklinesCache = new Map<number, string[]>();

  async function refreshCryptoMap() {
    const allInstruments = await db.select().from(instruments);
    const map = new Map<string, any>();
    allInstruments.forEach((i: any) => {
      if (i.assetClass === "CRYPTO" || i.symbol === "PAXGUSDT" || i.symbol === "BTCUSD") {
        map.set(i.symbol, i);
      }
    });
    cryptoMap = map;
  }

  async function fetchRealSparkline(instrument: any, currentPrice: number, changeAbs: number): Promise<string[]> {
    try {
      if (instrument.assetClass === "CRYPTO" || instrument.symbol === "PAXGUSDT" || instrument.symbol === "BTCUSD" || instrument.symbol === "XAUTUSDC" || instrument.symbol === "XAUTUSDT") {
        const BINANCE_API_KEY = process.env.BINANCE_API_KEY || "4ZxKHsnocjAIQAVfcdfy1yh5Yf5AlfryUWa7cYmAlwbsSmAHwgNHnjIJHhBJGATW";
        const headers: Record<string, string> = { "X-MBX-APIKEY": BINANCE_API_KEY };
        let binSym = instrument.symbol;
        if (instrument.symbol === "BTCUSD") binSym = "BTCUSDC";
        else if (instrument.symbol === "XAUTUSDC" || instrument.symbol === "XAUTUSDT") binSym = "PAXGUSDT";
        const res = await fetch(`https://api3.binance.com/api/v3/klines?symbol=${binSym}&interval=15m&limit=60`, { headers });
        if (res.ok) {
          const data = await res.json() as any[];
          const closes = data.map(k => parseFloat(k[4]).toString());
          if (closes.length > 0) return closes;
        }
      } else {
        let sym = instrument.symbol;
        if (sym === "XAGUSD") sym = "SI=F";
        else if (sym === "WTIUSD") sym = "CL=F";
        else if (instrument.assetClass === "INDIAN_STOCK") sym += ".NS";
        else if (instrument.assetClass === "FOREX") sym = sym + "=X";
        
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=15m&range=5d`);
        if (res.ok) {
          const data = await res.json() as any;
          const result = data?.chart?.result?.[0];
          if (result && result.indicators?.quote?.[0]?.close) {
            let closes = result.indicators.quote[0].close.filter((c: number | null) => c !== null).map((c: number) => c.toString());
            if (closes.length >= 60) return closes.slice(-60);
            if (closes.length > 0) return closes; 
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch real sparkline for", instrument.symbol, e);
    }
    return [];
  }

  async function updateCachedSparkline(instrument: any, currentPrice: number, changeAbs: number): Promise<string[]> {
    const instrumentId = instrument.id;
    let line = sparklinesCache.get(instrumentId);
    if (!line) {
      const [row] = await db.select().from(latestPrices).where(eq(latestPrices.instrumentId, instrumentId));
      line = (row?.sparkline as string[]) || [];
    }
    
    const lastPrice = line.length > 0 ? parseFloat(line[line.length - 1]) : currentPrice;
    const isWildlyOutdated = currentPrice > 0 && Math.abs(lastPrice - currentPrice) / currentPrice > 0.5;

    if (line.length < 60 || isWildlyOutdated) {
      line = await fetchRealSparkline(instrument, currentPrice, changeAbs);
    } else {
      line.push(currentPrice.toString());
      if (line.length > 60) line.shift();
    }
    sparklinesCache.set(instrumentId, line);
    return line;
  }

  let isBinanceGeoBlocked = false;
  
  function setupBinanceWebsocket() {
    if (isBinanceGeoBlocked) return;

    const ws = new WebSocket("wss://stream.binance.com:9443/ws/!miniTicker@arr");

    ws.on("open", async () => {
      console.log("Connected to live Binance WebSocket mirror for Cryptos & Gold!");
      await refreshCryptoMap();
    });

    ws.on("message", async (data: string) => {
      try {
        if (!cryptoMap) return;

        const events = JSON.parse(data);
        if (!Array.isArray(events)) return;

        for (const ev of events) {
          const symbol = ev.s;
          const targets: any[] = [];
          if (cryptoMap.has(symbol)) targets.push(cryptoMap.get(symbol)!);

          if (symbol === "BTCUSDC" && cryptoMap.has("BTCUSD")) {
            targets.push(cryptoMap.get("BTCUSD")!);
          }
          if (symbol === "PAXGUSDT") {
            if (cryptoMap.has("XAUTUSDC")) targets.push(cryptoMap.get("XAUTUSDC")!);
            if (cryptoMap.has("XAUTUSDT")) targets.push(cryptoMap.get("XAUTUSDT")!);
            if (cryptoMap.has("XAUUSD"))   targets.push(cryptoMap.get("XAUUSD")!);
          }

          for (const instrument of targets) {
            const instId = instrument.id;
            const price = parseFloat(ev.c);
            const openPrice = parseFloat(ev.o);
            const changeAbs = price - openPrice;
            const changePct = openPrice > 0 ? (changeAbs / openPrice) * 100 : 0;
            
            const newSparkline = await updateCachedSparkline(instrument, price, changeAbs);

            await db.update(latestPrices)
              .set({
                price: String(price),
                changeAbs: String(changeAbs),
                changePct: String(changePct),
                sparkline: newSparkline,
                asOf: new Date(),
                isOpen: true 
              })
              .where(eq(latestPrices.instrumentId, instId));
          }
        }
      } catch (err) { }
    });

    ws.on("close", () => {
      console.log("Binance WebSocket closed. Reconnecting in 5s...");
      setTimeout(setupBinanceWebsocket, 5000);
    });

    ws.on("error", (err) => {
     
      if (err.message.includes("451")) {
         console.warn("[Binance Connectivity] Switching to Institutional Stealth Fallback (Geo-blocked).");
         isBinanceGeoBlocked = true;
         ws.terminate();
         return;
      }
      console.error("Binance WS error:", err);
    });
  }

  function setupFinnhubWebsocket() {
    const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || "d9c7kppr01qs0pv947ogd9c7kppr01qs0pv947p0";
    const ws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`);

    ws.on("open", async () => {
      console.log("Connected to live Finnhub WebSocket mirror for Forex & Gold!");
      const symbolsToSubscribe = ["OANDA:XAU_USD", "OANDA:XAG_USD", "OANDA:EUR_USD", "OANDA:GBP_USD", "OANDA:USD_JPY"];
      for (const sym of symbolsToSubscribe) {
        ws.send(JSON.stringify({'type':'subscribe', 'symbol': sym}));
      }
    });

    ws.on("message", async (data: string) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === "trade" && msg.data) {
          const allInstruments = await db.select().from(instruments).where(eq(instruments.isActive, true));
          for (const trade of msg.data) {
            const sym = trade.s; // e.g. "OANDA:XAU_USD"
            let dbSym = "";
            if (sym === "OANDA:XAU_USD") dbSym = "XAUUSD";
            else if (sym === "OANDA:XAG_USD") dbSym = "XAGUSD";
            else if (sym.startsWith("OANDA:")) dbSym = sym.replace("OANDA:", "").replace("_", "");
            
            if (!dbSym) continue;

            const instrument = allInstruments.find((i: any) => i.symbol === dbSym);
            if (instrument) {
              const price = parseFloat(trade.p);
              if (dbSym === "XAUUSD" && price < 3500) continue;

              // fetch previous close to compute change
              let changeAbs = 0;
              let changePct = 0;
              
              const [row] = await db.select().from(latestPrices).where(eq(latestPrices.instrumentId, instrument.id));
              if (row && row.price) {
                  const prevPrice = parseFloat(row.price);
                  changeAbs = price - prevPrice;
                  changePct = (changeAbs / prevPrice) * 100;
              }

              const newSparkline = await updateCachedSparkline(instrument, price, changeAbs);

              await db.update(latestPrices)
                .set({
                  price: String(price),
                  changeAbs: String(changeAbs),
                  changePct: String(changePct),
                  sparkline: newSparkline,
                  asOf: new Date(),
                  isOpen: true 
                })
                .where(eq(latestPrices.instrumentId, instrument.id));
            }
          }
        }
      } catch (err) {}
    });

    ws.on("close", () => {
      console.log("Finnhub WebSocket closed. Reconnecting in 5s...");
      setTimeout(setupFinnhubWebsocket, 5000);
    });
    
    ws.on("error", (err) => {
      console.error("Finnhub WS error:", err);
    });
  }

  setupBinanceWebsocket();
  setupFinnhubWebsocket();

  setInterval(async () => {
    try {
      const allInstruments = await db.select().from(instruments).where(eq(instruments.isActive, true));
    
      const activeInstruments = allInstruments.filter((i: any) => {
         if (i.assetClass === "CRYPTO") return isBinanceGeoBlocked;
         return true;
      });

      bgTick++;
      const shouldFetchTwelveData = (bgTick % 12) === 0;

      let callCount = 0;
      for (const instrument of activeInstruments) {
        let priceData = null;

        if (instrument.assetClass === "FOREX" || ["XAGUSD", "XAUUSD"].includes(instrument.symbol)) {
          const isMetal = ["XAGUSD", "XAUUSD"].includes(instrument.symbol);
          const shouldFetch = isMetal ? (bgTick % 3 === 0) : ((bgTick % 3 === 0) && (((bgTick / 3) % 36) === (callCount % 36)));
          callCount++;
          
          if (shouldFetch) {
            try {
              let tdSym = instrument.symbol;
              if (instrument.symbol.length === 6) tdSym = `${instrument.symbol.substring(0,3)}/${instrument.symbol.substring(3,6)}`;

              const res = await fetch(`https://api.twelvedata.com/price?symbol=${tdSym}&apikey=${TWELVEDATA_API_KEY}`);
              const data = await res.json() as any;
              if (data && data.price) {
                 let val = parseFloat(data.price);
                 priceData = { price: String(val), changeAbs: "0.01", changePct: "0.01" };
              }
            } catch (err) {}
          }
        }

        if (!priceData && ["US_STOCK", "ETF", "MUTUAL_FUND"].includes(instrument.assetClass)) {
          // Priority 0: Finnhub Quote API (Primary Institutional Feed)
          try {
            const fhRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${instrument.symbol}&token=${FINNHUB_API_KEY}`);
            const fhData = await fhRes.json() as any;
            if (fhData && fhData.c && fhData.c > 0 && !fhData.error) {
              priceData = {
                price: String(Number(fhData.c).toFixed(4)),
                changeAbs: String(Number(fhData.d || 0).toFixed(4)),
                changePct: String(Number(fhData.dp || 0).toFixed(2)),
              };
            }
          } catch {}

          // Priority 1: Alpha Vantage (Primary Stock Feed)
          try {
            const res = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${instrument.symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`);
            const data = await res.json() as any;
            if (data && data["Global Quote"] && data["Global Quote"]["05. price"]) {
              priceData = {
                price: String(data["Global Quote"]["05. price"]),
                changeAbs: String(data["Global Quote"]["09. change"]),
                changePct: String(data["Global Quote"]["10. change percent"].replace("%", "")),
              };
            }
          } catch {}

          // Priority 1: TwelveData Fallback
          if (!priceData) {
            try {
              const res = await fetch(`https://api.twelvedata.com/price?symbol=${instrument.symbol}&apikey=${TWELVEDATA_API_KEY}`);
              const data = await res.json() as any;
              if (data && data.price) {
                priceData = { price: String(data.price), changeAbs: "0.01", changePct: "0.01" };
              }
            } catch {}
          }
        }

        // Priority 2: Yahoo Finance Universal Live Proxy (Zero Rate Limit for Stocks & Forex)
        if (!priceData && instrument.assetClass !== "CRYPTO" && !["XAUUSD", "XAGUSD"].includes(instrument.symbol)) {
          try {
            let ySym = instrument.symbol;
            if (ySym === "WTIUSD") ySym = "CL=F";
            else if (instrument.assetClass === "FOREX") ySym = `${ySym}=X`;

            const yRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=15m&range=5d`, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
            });
            if (yRes.ok) {
              const yData = await yRes.json() as any;
              const result = yData.chart?.result?.[0];
              if (result) {
                const meta = result.meta;
                const closes = result.indicators?.quote?.[0]?.close?.filter((c: any) => c != null);
                const lastBarClose = (closes && closes.length > 0) ? parseFloat(closes[closes.length - 1]) : null;
                const px = lastBarClose || (meta ? parseFloat(meta.regularMarketPrice) : null);
                if (px && !isNaN(px)) {
                  const prev = meta ? parseFloat(meta.previousClose || px) : px;
                  const chg = px - prev;
                  const chgPct = prev > 0 ? (chg / prev) * 100 : 0;
                  priceData = {
                    price: String(px.toFixed(4)),
                    changeAbs: String(chg.toFixed(4)),
                    changePct: String(chgPct.toFixed(2))
                  };
                }
              }
            }
          } catch {}
        }

        // Fallback to existing database price if Yahoo query fails or returns null
        if (!priceData) {
          const [existing] = await db.select().from(latestPrices).where(eq(latestPrices.instrumentId, instrument.id));
          if (existing && existing.price) {
            priceData = {
              price: String(existing.price),
              changeAbs: String(existing.changeAbs || "0.0000"),
              changePct: String(existing.changePct || "0.00")
            };
          }
        }

        const isOpen = isGlobalMarketOpen(instrument.assetClass, instrument.symbol);

        // ── 24/7 CONTINUOUS LIQUIDITY & OTC SIMULATION ENGINE ──
        // Only when real-world spot exchanges are closed over the weekend or off-hours (`!isOpen`),
        // apply realistic institutional micro-liquidity so users can trade OTC 24/7. When `isOpen` is true, NEVER alter real prices!
        if (priceData && instrument.assetClass !== "CRYPTO" && !isOpen) {
          const now = new Date();
          const day = now.getUTCDay();
          const isWeekend = day === 0 || day === 6;
          if (isWeekend || Math.random() < 0.3) {
            const basePrice = parseFloat(priceData.price);
            const drift = (Math.random() - 0.50) * (basePrice * 0.00015); // unbiased micro-oscillation only during closed markets
            const simPrice = basePrice + drift;
            const prevPrice = parseFloat(priceData.price) - parseFloat(priceData.changeAbs || "0");
            const newChg = simPrice - (prevPrice || basePrice);
            const newChgPct = prevPrice > 0 ? (newChg / prevPrice) * 100 : 0;
            
            priceData = {
              price: String(simPrice.toFixed(4)),
              changeAbs: String(newChg.toFixed(4)),
              changePct: String(newChgPct.toFixed(2))
            };
          }
        }

        if (priceData) {
          const currentPrice = parseFloat(priceData.price);
          const changeAbs = parseFloat(priceData.changeAbs);
          const newSparkline = await updateCachedSparkline(instrument, currentPrice, changeAbs);

          console.log(`Updated ${instrument.symbol} to $${priceData.price} [Open: ${isOpen}]`);
          await db.update(latestPrices)
            .set({
              price: String(priceData.price),
              changeAbs: String(priceData.changeAbs),
              changePct: String(priceData.changePct),
              sparkline: newSparkline,
              asOf: new Date(),
              isOpen: true
            })
            .where(eq(latestPrices.instrumentId, instrument.id));
        } else {
            // Fallback safety
            const isOpen = isGlobalMarketOpen(instrument.assetClass, instrument.symbol);
            await db.update(latestPrices)
              .set({
                asOf: new Date(),
                isOpen: true
              })
              .where(eq(latestPrices.instrumentId, instrument.id));
        }

      }
    } catch (e) {
      console.error("Error fetching background info", e);
    }
  }, 5000); 

  setTimeout(() => {
    try {
      console.log("Running initial institutional background api fetch for stocks...");
      (async () => {
        const allInstruments = await db.select().from(instruments).where(eq(instruments.isActive, true));
        const stockInstruments = allInstruments.filter((i: any) => i.assetClass !== "CRYPTO");
        for (const instrument of stockInstruments) {
          let priceData = null;
          if (["US_STOCK", "ETF", "MUTUAL_FUND"].includes(instrument.assetClass)) {
            // Priority 0: Finnhub Quote API
            try {
              const fhRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${instrument.symbol}&token=${FINNHUB_API_KEY}`);
              const fhData = await fhRes.json() as any;
              if (fhData && fhData.c && fhData.c > 0 && !fhData.error) {
                priceData = {
                  price: String(Number(fhData.c).toFixed(4)),
                  changeAbs: String(Number(fhData.d || 0).toFixed(4)),
                  changePct: String(Number(fhData.dp || 0).toFixed(2)),
                };
              }
            } catch {}

            if (!priceData) {
              try {
                const res = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${instrument.symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`);
                const data = await res.json() as any;
                if (data && data["Global Quote"] && data["Global Quote"]["05. price"]) {
                  priceData = {
                    price: String(data["Global Quote"]["05. price"]),
                    changeAbs: String(data["Global Quote"]["09. change"]),
                    changePct: String(data["Global Quote"]["10. change percent"].replace("%", "")),
                  };
                }
              } catch {}
            }
          } else if (instrument.assetClass === "FOREX") {
            // Yahoo finance handles rapid queries fine, but we let background loop handle it
            continue;
          }
          if (priceData) {
            const currentPrice = parseFloat(priceData.price);
            const changeAbs = parseFloat(priceData.changeAbs);
            const newSparkline = await updateCachedSparkline(instrument, currentPrice, changeAbs);

            console.log(`Initial fetch: Updated ${instrument.symbol} to $${priceData.price}`);
            await db.update(latestPrices)
              .set({
                price: String(priceData.price),
                changeAbs: String(priceData.changeAbs),
                changePct: String(priceData.changePct) || "0",
                sparkline: newSparkline,
                asOf: new Date()
              })
              .where(eq(latestPrices.instrumentId, instrument.id));
          }
        }
      })();
    } catch (err) { }
  }, 5000);

  // 3. Time-Based Order Execution Engine
  // Checks every second for any expired ACTIVE time-based trades
  setInterval(async () => {
    try {
      const { storage } = await import("./storage");
      const activeTrades = await storage.getActiveTimeBasedOrders();
      if (!activeTrades || activeTrades.length === 0) return;

      const now = Date.now();
      console.log(`[Engine] Found ${activeTrades.length} active trades.`);
      for (const trade of activeTrades) {
        const tradeExpires = new Date(trade.expiresAt).getTime();
        console.log(`[Engine] Trade #${trade.id} expires at ${tradeExpires}, now is ${now}. Expired? ${now >= tradeExpires}`);
        if (now >= tradeExpires) {
          // Time expired, let's settle it!
          const [priceRow] = await db.select().from(latestPrices).where(eq(latestPrices.instrumentId, trade.instrumentId));
          if (!priceRow || !priceRow.price) continue;

          let currentPrice = parseFloat(priceRow.price as string);
          
          const { result, returnAmount } = getFinalResult(trade, currentPrice);

          await storage.updateTimeBasedOrder(trade.id, {
            status: result as any, // "WIN" | "LOSS"
            settlePrice: currentPrice.toString(),
          });
          
          if (result === "WIN" && returnAmount > 0) {
             try {
                // Determine which balance to credit: check the trade's deduction transaction for mode
                const txs = await storage.getWalletTransactions(trade.userId);
                const deductTx = txs.find(t => t.referenceId === String(trade.id) && t.type === "TRADE_DEDUCTION");
                const tradeMode = (deductTx as any)?.mode ?? "REAL";

                if (tradeMode === "DEMO") {
                  await storage.updateDemoBalance(trade.userId, returnAmount);
                } else {
                  await storage.updateWalletBalance(trade.userId, returnAmount);
                }

                await storage.createWalletTransaction({
                   userId: trade.userId, type: "TRADE_WIN", amount: String(returnAmount),
                   status: "SUCCESS", referenceId: String(trade.id), mode: tradeMode
                } as any);

                // Send SMS Win Notification
                try {
                  const user = await storage.getUser(trade.userId);
                  if (user && user.phoneNumber) {
                    await sendWinAlert(user.phoneNumber, returnAmount.toFixed(2));
                  }
                } catch (smsErr) {
                  console.error("SMS notification failed:", smsErr);
                }
             } catch(err) { console.error("Wallet payout failed for trade:", trade.id, err); }
          }

          // ── AI ROUND PROFIT/LOSS TRACKING (NON-ADMINS) ──
          try {
            const user = await storage.getUser(trade.userId);
            const isAdmin = ["saran123@gmail.com", "htctrade123@gmail.com"].includes((user?.email || "").toLowerCase());
            
            if (user && !isAdmin && trade.placedBy === "AI_BOT") {
               const isWin = result === "WIN";
               const profit = isWin 
                  ? (returnAmount - parseFloat(trade.amount as string)) 
                  : -parseFloat(trade.amount as string);
               
               let currentPnl = parseFloat(user.autoInvestRoundPnl as string) + profit;
               let currentRound = user.autoInvestRound;
               
               let roundProfitLimit = 50.00;
               let roundLossLimit = 20.00;

               if (currentRound === 2) {
                  roundProfitLimit = 45.00;
                  roundLossLimit = 20.00;
               } else if (currentRound >= 3) {
                  roundProfitLimit = 35.00;
                  roundLossLimit = 15.00;
               }

               let autoTradeEnabled = user.autoTradeEnabled;

               // Target Reached -> Next Round
               if (currentPnl >= roundProfitLimit) {
                  currentRound++;
                  currentPnl = 0; // Reset for next tier
               }

               // Loss Limit Breach -> STOP
               if (currentPnl <= -roundLossLimit) {
                  autoTradeEnabled = false;
                  console.log(`[AI Protection] User ${user.email} Round ${currentRound} STOP LOSS BREACH (-$${Math.abs(currentPnl)})`);
               }

               await db.update(users).set({ 
                  autoInvestRound: currentRound,
                  autoInvestRoundPnl: String(currentPnl),
                  autoTradeEnabled
               }).where(eq(users.id, user.id));
            }
          } catch (pnlErr) {
            console.error("AI PnL Tracking Error:", pnlErr);
          }
          
          console.log(`Resolved Time Trade #${trade.id}: ${trade.side} @ ${trade.strikePrice} -> Settle ${currentPrice} = ${result}`);
        }
      }
    } catch (err) {
      console.error("Execution engine error:", err);
    }
  }, 1000);
}
