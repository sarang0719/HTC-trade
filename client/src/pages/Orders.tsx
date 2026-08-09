import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Seo from "@/components/Seo";
import { useTimeTrades } from "@/hooks/use-time-trades";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/EmptyState";
import { Ban, Search, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(n: any) {
  if (n == null) return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 }).format(num);
}

export default function Orders() {
  const { toast } = useToast();
  const { trades, isLoading } = useTimeTrades();
  const [search, setSearch] = useState("");

  const list = useMemo(() => {
    const items = Array.isArray(trades) ? trades : [];
    // Sort so newest are first
    const sorted = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const s = search.trim().toLowerCase();
    if (!s) return sorted;
    return sorted.filter((o) => {
      const id = String(o.id);
      const side = String(o.side ?? "").toLowerCase();
      const status = String(o.status ?? "").toLowerCase();
      return id.includes(s) || side.includes(s) || status.includes(s);
    });
  }, [trades, search]);

  return (
    <AppShell noPadding title="Trading History" subtitle="Review your active and closed binary options trades.">
      <Seo title="Trading History • HTC Trade" description="Your full trading record." />

      <div className="flex-1 flex flex-col min-h-0 w-full p-4 lg:p-8 pb-24 lg:pb-8 relative">
        <div className="glass rounded-3xl border border-border/60 flex flex-col flex-1 min-h-0 shadow-luxe overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border/20 shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by id, status, side..."
                  className="pl-10 rounded-2xl bg-background/50 h-11 border-border/50"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <EmptyState
                icon={<Ban className="h-8 w-8 text-primary" />}
                title="No trades yet"
                description="You haven't placed any trades. Go to the Markets page to start trading."
              />
            ) : (
              <div className="space-y-3">
                {list.map((trade: any) => {
                  const isActive = trade.status === "ACTIVE";
                  const isWin = trade.status === "WIN";
                  const isLoss = trade.status === "LOSS";
                  const isTie = trade.status === "TIE";
                  const side = trade.side as "BUY" | "SELL";
                  const payoutRatio = parseFloat(trade.payoutRatio);
                  const amount = parseFloat(trade.amount);
                  
                  const profit = isWin ? amount * payoutRatio : (isLoss ? -amount : 0);
                  
                  return (
                    <div
                      key={trade.id}
                      className={cn(
                        "rounded-2xl border bg-background/40 p-4 transition-all duration-300 relative overflow-hidden",
                        isActive ? "border-primary/40 shadow-[0_0_15px_rgba(185,95,55,0.1)]" : "border-border/40"
                      )}
                    >
                      {isActive && (
                         <div className="absolute top-0 right-0 p-1.5 px-3 bg-primary/20 text-primary text-[9px] font-black uppercase tracking-widest rounded-bl-xl">
                            Live Order
                         </div>
                      )}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl grid place-items-center shadow-lg",
                            side === "BUY" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                          )}>
                            {side === "BUY" ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                               <span className="text-sm font-bold uppercase tracking-widest">{side} ORDER</span>
                               <span className="text-muted-foreground text-xs font-mono">#{trade.id}</span>
                            </div>
                            <div className="text-xs font-medium text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> 
                              {trade.durationSeconds}s Expiry • {new Date(trade.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 lg:flex items-center gap-4 lg:gap-12 text-sm">
                          <div className="flex flex-col">
                             <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Entry</span>
                             <span className="font-mono font-bold">{fmt(trade.strikePrice)}</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Close</span>
                             <span className="font-mono font-bold">{isActive ? "—" : fmt(trade.settlePrice)}</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Investment</span>
                             <span className="font-mono font-bold">${amount.toFixed(2)}</span>
                          </div>
                          
                          <div className="flex flex-col items-end min-w-[80px]">
                             <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Payout</span>
                             {isActive ? (
                               <span className="font-mono font-bold text-primary animate-pulse text-lg">PENDING</span>
                             ) : isTie ? (
                               <span className="font-mono font-bold text-muted-foreground text-lg">$0.00</span>
                             ) : (
                               <span className={cn(
                                 "font-mono font-bold text-lg",
                                 isWin ? "text-emerald-500" : "text-rose-500"
                               )}>
                                 {isWin ? "+" : "-"}${Math.abs(profit).toFixed(2)}
                               </span>
                             )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
