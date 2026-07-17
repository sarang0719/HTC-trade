import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import AppShell from "@/components/AppShell";
import Seo from "@/components/Seo";
import { useInstruments } from "@/hooks/use-instruments";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/EmptyState";
import { CandlestickChart, Search, TriangleAlert, Trophy, Star, Activity, LineChart, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import OrderTicketDialog from "@/components/OrderTicketDialog";

function MiniSparkline({ data, isUp }: { data: string[], isUp: boolean }) {
  if (!data || data.length < 2) return null;
  const nums = data.map(Number);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const w = 80, h = 32;
  const pts = nums.map((v, i) => `${(i / (nums.length - 1)) * w},${h - ((v - min) / range) * h}`);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="drop-shadow-sm">
      <polyline
        points={pts.join(' ')}
        stroke={isUp ? '#10b981' : '#f43f5e'}
        strokeWidth="1.8"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

const CATEGORIES = [
  { id: "ALL", label: "All Markets" },
  { id: "FOREX", label: "Forex" },
  { id: "CRYPTO", label: "Crypto" },
  { id: "COMMODITIES", label: "Commodities" },
  { id: "STOCKS", label: "Stocks" },
  { id: "OTC", label: "OTC Markets" },
];

export default function Markets() {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const instruments = useInstruments();
  const [starred, setStarred] = useState<Record<number, boolean>>({ 1: true, 3: true, 5: true });

  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketInstrument, setTicketInstrument] = useState<any>(null);

  // Local simulated live engine for real-time Quotex feel
  const [liveData, setLiveData] = useState<Record<number, any>>({});

  useEffect(() => {
    if (!instruments.data) return;
    const initial: Record<number, any> = {};
    instruments.data.forEach((i: any) => {
      // Setup initial data based on exact current values
      initial[i.id] = {
        price: Number(i.price?.price || (i.symbol.includes("BTC") ? 60000 : 100)),
        changePct: Number(i.price?.changePct || 0),
        sparkline: i.price?.sparkline && i.price.sparkline.length > 5 ? [...i.price.sparkline] : Array.from({length: 20}, () => '100')
      };
    });
    setLiveData(initial);
  }, [instruments.data]);

  useEffect(() => {
    // Highly active tick engine (Every 1.2s like a pro trading app)
    const int = setInterval(() => {
      setLiveData(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(idKey => {
          const id = Number(idKey);
          const item = { ...next[id] };
          
          // Only simulate OTC markets! Real markets use WebSockets now.
          const isOTC = instruments.data?.find((i: any) => i.id === id)?.exchange === "OTC";
          if (!isOTC) return; 

          const vol = 0.0005;
          const change = item.price * vol * (Math.random() - 0.45); // slight upward bias
          
          item.price = item.price + change;
          item.changePct = item.changePct + ((change / item.price) * 100);
          
          // Update sparkline
          item.sparkline = [...item.sparkline.slice(1), item.price.toString()];
          next[id] = item;
        });
        return next;
      });
    }, 1200);
    return () => clearInterval(int);
  }, [instruments.data]);

  // ── Live WebSocket feeds for Markets page (auto-reconnecting) ───────────
  useEffect(() => {
    if (!instruments.data) return;
    let isActive = true;
    let wsBinance: WebSocket | null = null;
    let wsTwelve: WebSocket | null = null;
    let binanceRecoTimer: ReturnType<typeof setTimeout> | null = null;
    let twelveRecoTimer:  ReturnType<typeof setTimeout> | null = null;
    let wsInitTimer:      ReturnType<typeof setTimeout> | null = null;
    let binanceDelay = 1000;
    let twelveDelay  = 1000;

    const binanceInsts = instruments.data.filter((i: any) => i.exchange === "BINANCE" && i.symbol !== "XAUUSD");
    const tdInsts      = instruments.data.filter((i: any) => i.exchange !== "BINANCE" && i.exchange !== "OTC");

    // ── Binance !miniTicker (all symbols at once) ──────────────────────────
    const connectBinance = () => {
      if (!isActive || binanceInsts.length === 0) return;
      try {
        wsBinance = new WebSocket("wss://stream.binance.com:9443/ws/!miniTicker@arr");

        wsBinance.onopen = () => { binanceDelay = 1000; };

        wsBinance.onmessage = (event) => {
          if (!isActive) return;
          try {
            const msg = JSON.parse(event.data);
            if (Array.isArray(msg)) {
              setLiveData(prev => {
                let updated = false;
                const next = { ...prev };
                msg.forEach((t: any) => {
                  const inst = binanceInsts.find((i: any) => i.symbol === t.s);
                  if (inst) {
                    updated = true;
                    const val = parseFloat(t.c);
                    const old = next[inst.id] || { price: val, changePct: 0, sparkline: Array(20).fill(val.toString()) };
                    const newSpark = [...old.sparkline, val.toString()];
                    if (newSpark.length > 20) newSpark.shift();
                    next[inst.id] = { ...old, price: val, changePct: parseFloat(t.P), sparkline: newSpark };
                  }
                });
                return updated ? next : prev;
              });
            }
          } catch {}
        };

        wsBinance.onclose = () => {
          if (!isActive) return;
          binanceRecoTimer = setTimeout(() => {
            binanceDelay = Math.min(binanceDelay * 2, 30000);
            connectBinance();
          }, binanceDelay);
        };

        wsBinance.onerror = () => {
          if (wsBinance) wsBinance.onclose = null;
          if (!isActive) return;
          binanceRecoTimer = setTimeout(() => { binanceDelay = Math.min(binanceDelay * 2, 30000); connectBinance(); }, binanceDelay);
        };
      } catch {}
    };

    // ── TwelveData (Forex / Metals / Stocks) ──────────────────────────────
    const connectTwelve = () => {
      if (!isActive || tdInsts.length === 0) return;
      const symbolsList = tdInsts.map((i: any) => {
        let sym = i.symbol;
        if ((i.assetClass === "FOREX" || ["XAUUSD","XAGUSD","WTIUSD"].includes(sym))
            && sym.length >= 6 && !sym.includes("/")) {
          sym = sym.substring(0, 3) + "/" + sym.substring(3);
        }
        return sym;
      }).join(",");

      try {
        wsTwelve = new WebSocket("wss://ws.twelvedata.com/v1/quotes/price?apikey=4a3bb708bb7247528d0efe958476bdaa");

        wsTwelve.onopen = () => {
          twelveDelay = 1000;
          wsTwelve?.send(JSON.stringify({ action: "subscribe", params: { symbols: symbolsList } }));
        };

        wsTwelve.onmessage = (event) => {
          if (!isActive) return;
          try {
            const data = JSON.parse(event.data);
            if (data.event === "price" && data.symbol) {
              const normalizedSym = data.symbol.replace("/", "");
              const inst = tdInsts.find((i: any) => i.symbol === normalizedSym || i.symbol === data.symbol);
              if (inst) {
                setLiveData(prev => {
                  const val = parseFloat(data.price);
                  const old = prev[inst.id] || { price: val, changePct: 0, sparkline: Array(20).fill(val.toString()) };
                  const newSpark = [...old.sparkline, val.toString()];
                  if (newSpark.length > 20) newSpark.shift();
                  return { ...prev, [inst.id]: { ...old, price: val, changePct: old.price ? ((val - old.price) / old.price) * 100 : 0, sparkline: newSpark } };
                });
              }
            }
          } catch {}
        };

        wsTwelve.onclose = () => {
          if (!isActive) return;
          twelveRecoTimer = setTimeout(() => {
            twelveDelay = Math.min(twelveDelay * 2, 30000);
            connectTwelve();
          }, twelveDelay);
        };

        wsTwelve.onerror = () => {
          if (wsTwelve) wsTwelve.onclose = null;
          if (!isActive) return;
          twelveRecoTimer = setTimeout(() => { twelveDelay = Math.min(twelveDelay * 2, 30000); connectTwelve(); }, twelveDelay);
        };
      } catch {}
    };

    // Delay by 150ms to let React StrictMode double-mount flush complete
    // before creating any WebSocket — eliminates "closed before established" warnings
    wsInitTimer = setTimeout(() => {
      if (!isActive) return;
      connectBinance();
      connectTwelve();
    }, 150);

    return () => {
      isActive = false;
      if (wsInitTimer)      clearTimeout(wsInitTimer);
      if (binanceRecoTimer) clearTimeout(binanceRecoTimer);
      if (twelveRecoTimer)  clearTimeout(twelveRecoTimer);
      if (wsBinance) {
        wsBinance.onclose = null;
        wsBinance.onerror = null;
        if (wsBinance.readyState !== WebSocket.CLOSED) {
          try {
            wsBinance.close();
          } catch {}
        }
      }
      if (wsTwelve) {
        wsTwelve.onclose = null;
        wsTwelve.onerror = null;
        if (wsTwelve.readyState !== WebSocket.CLOSED) {
          try {
            wsTwelve.close();
          } catch {}
        }
      }
    };
  }, [instruments.data]);

  const filtered = useMemo(() => {
    const seen = new Set<string>();
    return (instruments.data ?? []).filter((i: any) => {
      // Deduplicate by symbol (prevent double entries from multiple seed runs)
      if (seen.has(i.symbol)) return false;

      // Category filter
      if (q && !i.symbol.toLowerCase().includes(q.toLowerCase()) && !i.name.toLowerCase().includes(q.toLowerCase())) {
        return false;
      }
      if (activeCategory === "ALL") { seen.add(i.symbol); return true; }
      if (activeCategory === "CRYPTO"      && i.assetClass === "CRYPTO") { seen.add(i.symbol); return true; }
      if (activeCategory === "FOREX"       && i.assetClass === "FOREX"  && !["XAUUSD","XAGUSD","WTIUSD","BRENTUSD"].includes(i.symbol)) { seen.add(i.symbol); return true; }
      if (activeCategory === "OTC"         && i.exchange === "OTC") { seen.add(i.symbol); return true; }
      if (activeCategory === "COMMODITIES" && ["XAUUSD","XAGUSD","WTIUSD","BRENTUSD"].includes(i.symbol)) { seen.add(i.symbol); return true; }
      if (activeCategory === "STOCKS"      && ["AAPL","TSLA","AMZN","GOOGL","MSFT","NVDA","META","NFLX"].includes(i.symbol)) { seen.add(i.symbol); return true; }
      return false;
    });
  }, [instruments.data, activeCategory, q]);

  // Sort by name or top gainers
  const topGainers = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const gA = liveData[a.id]?.changePct || 0;
      const gB = liveData[b.id]?.changePct || 0;
      return gB - gA;
    }).slice(0, 3);
  }, [filtered, liveData]);

  return (
    <AppShell title="Live Markets" subtitle="Professional fast-execution trading environment">
      <Seo title="Markets • QUANTEDGE V12.1 · SMC" description="Trade real-time Forex, Crypto, Stocks, and OTC Markets." />

      {/* Top action bar */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search symbols or company names..."
            className="pl-11 h-12 rounded-2xl bg-card border-border/50 text-sm shadow-sm"
          />
        </div>
        
        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide shrink-0">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-5 h-12 rounded-2xl text-sm font-semibold transition-all duration-300 whitespace-nowrap shrink-0",
                activeCategory === cat.id 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                  : "bg-card border border-border/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Gainers Highlight */}
      {q === "" && activeCategory === "ALL" && !instruments.isLoading && topGainers.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-bold opacity-80 uppercase tracking-widest">Trending Top Gainers</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topGainers.map((i: any) => {
              const live = liveData[i.id];
              const isUp = live?.changePct >= 0;
              return (
                <div key={`trend-${i.id}`} className="glass bg-gradient-to-br from-card to-background/50 border border-primary/10 rounded-3xl p-4 flex items-center justify-between shadow-sm">
                   <div>
                     <div className="text-sm font-bold">{i.symbol}</div>
                     <div className={cn("text-lg font-black tracking-tight", isUp ? "text-emerald-400" : "text-rose-400")}>
                        {isUp ? "+" : ""}{live?.changePct?.toFixed(2)}%
                     </div>
                   </div>
                   <Activity className={cn("w-8 h-8 opacity-20", isUp ? "text-emerald-400" : "text-rose-400")} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="glass rounded-3xl border border-border/60 p-4 sm:p-5 shadow-luxe min-h-[500px]">
        {instruments.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] rounded-3xl" />
            ))}
          </div>
        ) : instruments.isError ? (
          <EmptyState
            icon={<TriangleAlert className="h-6 w-6 text-destructive" />}
            title="Market Data Offline"
            description="Unable to connect to live pricing engine."
            action={<Button onClick={() => instruments.refetch()}>Reconnect</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<CandlestickChart className="h-6 w-6 text-primary" />}
            title="No markets found"
            description="Try switching categories or searching for a different asset."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {filtered.map((i: any) => {
              const live = liveData[i.id];
              const price = live?.price ?? Number(i.price?.price ?? 0);
              const changePct = live?.changePct ?? 0;
              const isUp = changePct >= 0;
              
              // Formatting
              const decimals = price < 1 ? 5 : price > 1000 ? 2 : 3;
              const displayPrice = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: decimals }).format(price);

              return (
                <Link
                  key={i.id}
                  href={`/app/markets/${i.id}`}
                  className="
                    relative group bg-card border border-border/40 hover:border-primary/30 rounded-3xl p-4
                    transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5
                    overflow-hidden
                  "
                >
                  {/* Subtle Background gradient indicator */}
                  <div className={cn(
                    "absolute -right-12 -top-12 w-32 h-32 blur-[50px] opacity-20 transition-all duration-500",
                    isUp ? "bg-emerald-500 group-hover:opacity-40" : "bg-rose-500 group-hover:opacity-40"
                  )} />

                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0 pr-3 z-10">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base truncate tracking-tight">{i.symbol}</h3>
                        {i.exchange === "OTC" && (
                          <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest">OTC</span>
                        )}
                        {i.exchange === "FOREX" && !i.symbol.includes("OTC") && (
                          <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest">FX</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate opacity-80">{i.name}</p>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const isStarred = starred[i.id];
                        setStarred((prev) => ({ ...prev, [i.id]: !isStarred }));
                        toast({
                          title: isStarred ? "Removed from Watchlist" : "Added to Watchlist",
                          description: `${i.symbol} has been ${isStarred ? "removed from" : "added to"} your primary watchlist.`
                        });
                      }}
                      className={cn(
                        "transition-colors z-10 shrink-0 p-1 rounded-lg hover:bg-secondary/60",
                        starred[i.id] ? "text-yellow-400" : "text-muted-foreground/30 hover:text-yellow-400"
                      )}
                    >
                      <Star className={cn("w-4 h-4", starred[i.id] && "fill-yellow-400")} />
                    </button>
                  </div>

                  <div className="flex justify-between items-end z-10 relative">
                     <div className="flex flex-col gap-0.5">
                       <span className="font-mono text-sm font-semibold tracking-tight">{displayPrice}</span>
                       <span className={cn("text-xs font-bold", isUp ? "text-emerald-400" : "text-rose-400")}>
                         {isUp ? "+" : ""}{changePct.toFixed(2)}%
                       </span>
                     </div>
                     <div className="pb-1">
                       <MiniSparkline data={live?.sparkline || []} isUp={isUp} />
                     </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/30 flex gap-2 z-10 relative">
                    <Button 
                      variant="secondary" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTicketInstrument(i);
                        setTicketOpen(true);
                      }}
                      className="w-full rounded-xl bg-background hover:bg-muted text-xs h-9 font-semibold"
                    >
                      Quick Order
                    </Button>
                    <div className="w-full flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors font-semibold text-xs h-9">
                      <LineChart className="w-3.5 h-3.5 mr-1" />
                      Trade
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <OrderTicketDialog open={ticketOpen} onOpenChange={setTicketOpen} defaultPortfolioId={1} defaultInstrument={ticketInstrument ?? undefined} />
    </AppShell>
  );
}
