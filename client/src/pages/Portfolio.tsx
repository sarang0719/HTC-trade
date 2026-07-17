import AppShell from "@/components/AppShell";
import Seo from "@/components/Seo";
import { usePortfolioSummary } from "@/hooks/use-portfolio";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip } from "recharts";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/EmptyState";
import { Link } from "wouter";

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

function fmtUsd(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtPct(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export default function Portfolio() {
  const pData = usePortfolioSummary();
  const summary = pData.data as any;
  const holdings = summary?.holdings || [];
  const totals = summary?.totals;

  // Pie chart data formatting
  const pieData = holdings.map((h: any) => ({
    name: h.instrument.symbol,
    value: Number(h.holding.quantity) * Number(h.price?.price || 0)
  }));

  if (pData.isLoading) {
    return (
      <AppShell title="Portfolio" subtitle="Loading your assets...">
         <div className="grid gap-6">
            <Skeleton className="h-64 w-full rounded-[2rem]" />
            <Skeleton className="h-[400px] w-full rounded-[2rem]" />
         </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Portfolio" subtitle="Deep-dive into your asset allocation.">
      <Seo title="Portfolio • HTC Trade" />

      <div className="flex flex-col gap-8">
        {/* TOP LEVEL METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="glass rounded-[2rem] p-6 lg:p-8 flex flex-col justify-center">
             <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Balance</div>
             <div className="text-4xl lg:text-5xl font-bold tracking-tighter">{fmtUsd(totals?.marketValue)}</div>
             <div className={cn("text-xs font-bold mt-2", (totals?.dayPnl ?? 0) >= 0 ? "text-accent" : "text-destructive")}>
                {fmtUsd(totals?.dayPnl)} ({fmtPct(totals?.dayPnlPct)}) Today
             </div>
           </div>

           <div className="glass rounded-[2rem] p-6 lg:p-8 flex flex-col justify-center md:col-span-2 relative overflow-hidden">
             {holdings.length > 0 ? (
               <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="h-[140px] w-[140px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ReTooltip formatter={(value: number) => fmtUsd(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {pieData.slice(0, 5).map((d: any, i: number) => (
                      <div key={d.name} className="flex items-center gap-2">
                         <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                         <div>
                           <div className="text-xs font-bold text-foreground">{d.name}</div>
                           <div className="text-[10px] text-muted-foreground">{((d.value / (totals?.marketValue || 1)) * 100).toFixed(1)}%</div>
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
             ) : (
               <div className="text-muted-foreground text-center flex flex-col items-center justify-center h-full">
                  <Wallet className="h-6 w-6 opacity-30 mb-2" />
                  <div className="text-xs font-bold uppercase">No allocation data</div>
               </div>
             )}
           </div>
        </div>

        {/* ASSETS TABLE */}
        <div className="glass rounded-[2rem] p-6 lg:p-8">
           <div className="flex items-center justify-between mb-6">
             <h3 className="text-xl font-bold font-sans">Your Assets</h3>
           </div>

           {holdings.length === 0 ? (
             <EmptyState 
               icon={<Wallet className="h-8 w-8 text-primary/50" />} 
               title="No assets yet" 
               description="You haven't bought any instruments yet." 
               action={<Link href="/app/markets"><div className="text-primary hover:underline font-bold text-sm cursor-pointer inline-flex">Explore Markets</div></Link>}
             />
           ) : (
             <div className="overflow-x-auto w-full scrollbar-none">
               <table className="w-full text-left whitespace-nowrap min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border/50 text-[11px] uppercase tracking-widest text-muted-foreground">
                       <th className="pb-3 px-2 font-bold">Asset</th>
                       <th className="pb-3 px-2 font-bold text-right">Balance</th>
                       <th className="pb-3 px-2 font-bold text-right">Avg Price</th>
                       <th className="pb-3 px-2 font-bold text-right">Current Price</th>
                       <th className="pb-3 px-2 font-bold text-right">Total PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h: any) => {
                      const cv = Number(h.holding.quantity) * Number(h.price?.price);
                      const cost = Number(h.holding.quantity) * Number(h.holding.averagePrice);
                      const pnl = cv - cost;
                      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                      const isUp = pnl >= 0;

                      return (
                        <tr key={h.instrument.id} className="border-b border-border/20 last:border-0 hover:bg-secondary/20 transition-colors">
                          <td className="py-4 px-2">
                            <Link href={`/app/markets/${h.instrument.id}`}>
                              <div className="flex items-center gap-3 cursor-pointer group">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={h.instrument.imageUrl} />
                                  <AvatarFallback className="bg-primary/20">{h.instrument.symbol[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-bold text-sm group-hover:text-primary transition-colors text-foreground">{h.instrument.symbol}</div>
                                  <div className="text-xs text-muted-foreground">{h.instrument.name}</div>
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="py-4 px-2 text-right">
                             <div className="font-bold text-sm text-foreground">{fmtUsd(cv)}</div>
                             <div className="text-xs text-muted-foreground">{h.holding.quantity} {h.instrument.symbol}</div>
                          </td>
                          <td className="py-4 px-2 text-right font-medium text-sm text-muted-foreground">{fmtUsd(Number(h.holding.averagePrice))}</td>
                          <td className="py-4 px-2 text-right font-medium text-sm text-foreground">{fmtUsd(Number(h.price?.price))}</td>
                          <td className="py-4 px-2 text-right">
                             <div className={cn("font-bold text-sm", isUp ? "text-accent" : "text-destructive")}>{isUp ? "+" : ""}{fmtUsd(Math.abs(pnl))}</div>
                             <div className={cn("text-[11px] font-bold mt-0.5", isUp ? "text-accent" : "text-destructive")}>{fmtPct(pnlPct)}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
               </table>
             </div>
           )}
        </div>
      </div>
    </AppShell>
  );
}
