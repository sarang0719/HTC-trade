import AppShell from "@/components/AppShell";
import Seo from "@/components/Seo";
import { usePortfolioSummary } from "@/hooks/use-portfolio";
import { useMarketNews } from "@/hooks/use-market";
import { useWatchlists } from "@/hooks/use-watchlists";
import { useInstruments } from "@/hooks/use-instruments";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError, redirectToLogin } from "@/lib/auth-utils";
import StatPill from "@/components/StatPill";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, BarChart3, Newspaper, Plus, Sparkles, TriangleAlert, TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip as ReTooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

function fmtUsd(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { 
    style: "currency", 
    currency: "USD", 
    maximumFractionDigits: n < 1 ? 4 : 2 
  }).format(n);
}

function fmtPct(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export default function Dashboard() {
  const { toast } = useToast();
  const portfolio = usePortfolioSummary();
  const news = useMarketNews();
  const watchlists = useWatchlists();
  const markets = useInstruments();

  const p = portfolio.data as any;
  const totals = p?.totals;
  const holdings = p?.holdings ?? [];
  const overviewItems = holdings.length > 0 ? holdings : (markets.data ?? []).slice(0, 4).map((inst: any) => ({ instrument: inst, price: inst.price }));

  function handle401(err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    if (isUnauthorizedError(e)) return redirectToLogin(toast as any);
  }

  const loading = portfolio.isLoading;

  return (
    <AppShell
      title="Dashboard"
      subtitle="Institutional-grade market tracking and paper portfolio management."
    >
      <Seo title="Dashboard • HTC Trade" description="Crypto-first fintech dashboard." />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-6 lg:gap-8">
        <div className="space-y-6 lg:space-y-8">
          {/* Portfolio Header */}
          <section className="glass rounded-[2rem] p-6 lg:p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Portfolio Overview</div>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">
                    {fmtUsd(totals?.marketValue)}
                  </h2>
                  <div className={cn(
                    "flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded-full",
                    (totals?.dayPnl ?? 0) >= 0 ? "text-accent bg-accent/10" : "text-destructive bg-destructive/10"
                  )}>
                    {(totals?.dayPnl ?? 0) >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {fmtPct(totals?.dayPnlPct)}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                {holdings.slice(0, 3).map((h: any) => (
                  <div key={h.instrument.id} className="flex items-center gap-3 bg-secondary/50 rounded-2xl px-4 py-2 border border-border/50">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={h.instrument.imageUrl} />
                      <AvatarFallback className="text-[10px]">{h.instrument.symbol[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-sm font-bold">{h.holding.quantity} {h.instrument.symbol}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Market Overview */}
          <section className="glass rounded-[2rem] p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold font-sans">Market Overview</h3>
              <Link href="/app/markets" className="text-xs font-bold text-primary hover:underline">More &gt;</Link>
            </div>

            <div className="space-y-4">
              {overviewItems.map((h: any) => {
                const sparkData = (h.price?.sparkline ?? []).map((v: string, i: number) => ({ value: Number(v), time: i }));
                const isUp = (h.price?.changePct ?? 0) >= 0;

                return (
                  <Link key={h.instrument.id} href={`/app/markets/${h.instrument.id}`}>
                    <div className="group flex items-center justify-between p-4 rounded-2xl hover:bg-secondary/30 transition-colors border border-transparent hover:border-border/50 cursor-pointer">
                      <div className="flex items-center gap-4 min-w-[180px]">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={h.instrument.imageUrl} />
                          <AvatarFallback className="bg-primary/20">{h.instrument.symbol[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold flex items-center gap-2 text-foreground">
                            {h.instrument.symbol} <span className="text-[10px] text-muted-foreground uppercase tracking-widest px-1.5 py-0.5 bg-secondary rounded">{h.instrument.exchange}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{h.instrument.name}</div>
                        </div>
                      </div>

                      <div className="hidden md:block flex-1 max-w-[120px] h-10 mx-8">
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                          <AreaChart data={sparkData}>
                            <defs>
                              <linearGradient id={`grad-${h.instrument.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isUp ? "hsl(var(--accent))" : "hsl(var(--destructive))"} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={isUp ? "hsl(var(--accent))" : "hsl(var(--destructive))"} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke={isUp ? "hsl(var(--accent))" : "hsl(var(--destructive))"} 
                              fill={`url(#grad-${h.instrument.id})`}
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-foreground">{fmtUsd(Number(h.price?.price))}</div>
                        <div className={cn("text-xs font-bold", isUp ? "text-accent" : "text-destructive")}>
                          {isUp ? "+" : ""}{fmtPct(Number(h.price?.changePct))}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        {/* Sidebar content */}
        <div className="space-y-6 lg:space-y-8">
          <section className="glass rounded-[2rem] p-6 border border-border/50 shadow-xl hover:border-primary/20 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Watchlists</h3>
              <Link href="/app/watchlists" title="Create or manage watchlists">
                <Plus className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
              </Link>
            </div>
            
            <div className="space-y-3">
              {(Array.isArray(watchlists.data) ? watchlists.data : [])?.slice(0, 3)?.map((w: any) => (
                <Link
                  key={w.id}
                  href={`/app/watchlists/${w.id}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50 hover:-translate-y-0.5 transition-transform"
                >
                  <div className="font-bold text-sm">{w.name}</div>
                  <div className="text-[10px] font-bold text-muted-foreground">{w.itemCount} items</div>
                </Link>
              ))}
            </div>
          </section>

          <section className="glass rounded-[2rem] p-6 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary/20 grid place-items-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-bold">AI Predictions</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Stay ahead with institutional-grade insights driven by our neural prediction engine.</p>
            <Link href="/app/insights">
              <Button className="w-full rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90">
                View Analysis
              </Button>
            </Link>
          </section>

          <section className="glass rounded-[2rem] p-6">
             <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Market Insight</h3>
             <div className="space-y-4">
                {(Array.isArray(news.data) ? news.data : []).slice(0, 3).map((a: any) => (
                  <div key={a.id} className="group cursor-pointer">
                    <div className="text-[13px] font-bold line-clamp-2 group-hover:text-primary transition-colors">{a.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center justify-between">
                      <span>{a.source}</span>
                      <span>2h ago</span>
                    </div>
                  </div>
                ))}
             </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
