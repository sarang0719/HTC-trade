import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTimeTrades } from "@/hooks/use-time-trades";
import { useInstruments } from "@/hooks/use-instruments";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Bot, Power, PowerOff, Sparkles, Activity, Crosshair } from "lucide-react";
import { Switch } from "@/components/ui/switch"; 
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

function fmtUsd(val: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
}

export default function SmartAutoPilot() {
  const { user } = useAuth();
  const { trades } = useTimeTrades();
  const { data: instruments } = useInstruments();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isEnabled = user?.autoTradeEnabled === true;
  const dbAmount = user?.autoTradeAmount || "5.00";
  const [customAmount, setCustomAmount] = useState(dbAmount);

  // Sync state if user data updates from elsewhere
  useEffect(() => {
     if (user?.autoTradeAmount) setCustomAmount(user.autoTradeAmount);
  }, [user?.autoTradeAmount]);

  const mutation = useMutation({
    mutationFn: async (vars: { enabled: boolean, amount?: string }) => {
      await apiRequest("POST", "/api/settings/ai-trade", vars);
      return vars;
    },
    onSuccess: (vars) => {
      queryClient.setQueryData(["/api/user"], (old: any) => ({ 
         ...old, 
         autoTradeEnabled: vars.enabled,
         ...(vars.amount !== undefined ? { autoTradeAmount: vars.amount } : {})
      }));
      toast({ 
        title: vars.enabled ? "AI Auto-Pilot Activated" : "AI Settings Updated",
        description: vars.enabled ? `QUANTEDGE V12.1 · SMC is actively trading $${vars.amount || customAmount} sizes.` : "Background market scans have been halted."
      });
    },
  });

  const stats = useMemo(() => {
    if (!trades) return { active: [], won: 0, lost: 0, total: 0, winRate: 0, pnl: 0 };
    const aiTrades = trades.filter(t => t.placedBy === "AI_BOT");
    
    const active = aiTrades.filter(t => t.status === "ACTIVE");
    const won = aiTrades.filter(t => t.status === "WIN").length;
    const lost = aiTrades.filter(t => t.status === "LOSS").length;
    
    const totalFinished = won + lost;
    const winRate = totalFinished > 0 ? (won / totalFinished) * 100 : 0;
    
    let pnl = 0;
    for (const t of aiTrades) {
       const amount = parseFloat((t.amount as any) || "0");
       if (t.status === "WIN") {
          const payoutRatio = parseFloat((t.payoutRatio as any) || "0.85");
          pnl += amount * payoutRatio;
       } else if (t.status === "LOSS") {
          pnl -= amount;
       }
    }
    
    return { active, won, lost, totalFinished, total: aiTrades.length, winRate, pnl };
  }, [trades]);

  return (
    <div className="glass rounded-3xl border border-border/60 p-5 sm:p-7 shadow-luxe mb-6 overflow-hidden relative">
       {/* Background glow when enabled */}
       {isEnabled && (
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -mr-10 -mt-20 pointer-events-none" />
       )}

       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 relative z-10">
         <div>
            <div className="flex items-center gap-3 mb-1">
               <span className="text-lg font-black flex items-center gap-2 tracking-tighter">
                  <Bot className="w-5 h-5 text-primary" />
                  Smart Auto-Pilot (QUANTEDGE V12.1 · SMC)
               </span>
               <div className="flex gap-2">
                 <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full ${isEnabled ? 'bg-primary/20 text-primary animate-pulse border border-primary/20' : 'bg-muted text-muted-foreground'}`}>
                    {isEnabled ? "System Active" : "Standby"}
                 </span>
                 {["saran123@gmail.com", "htctrade123@gmail.com"].includes((user?.email || "").toLowerCase()) && (
                   <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/20">
                      Institutional Admin Mode
                   </span>
                 )}
               </div>
            </div>
            <p className="text-sm text-slate-400 font-medium">
              Institutional AI evaluates active markets to place high-confidence short-term trades with unlimited capacity.
            </p>
         </div>

         <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
             <div className="flex items-center gap-2 bg-background/50 border border-border/60 p-2 rounded-2xl shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Trade Size $</span>
                <Input 
                   type="number"
                   className="h-7 w-20 text-sm bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-center font-bold"
                   value={customAmount}
                   onChange={(e) => setCustomAmount(e.target.value)}
                   onBlur={() => {
                      if (customAmount !== dbAmount) {
                         mutation.mutate({ enabled: isEnabled, amount: customAmount });
                      }
                   }}
                />
             </div>
             
             <div className="flex items-center gap-3 bg-background/50 border border-border/60 p-2 rounded-2xl shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Toggle Bot</span>
                <Switch 
                   checked={isEnabled} 
                   onCheckedChange={(val) => mutation.mutate({ enabled: val, amount: customAmount })} 
                   disabled={mutation.isPending}
                />
             </div>
         </div>
       </div>
       
       {/* AI Profitability Dashboard */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 relative z-10">
          <div className="bg-background/40 border border-border/50 rounded-2xl p-4">
             <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Crosshair className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider font-semibold">Total Signals</span>
             </div>
             <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          
          <div className="bg-background/40 border border-border/50 rounded-2xl p-4">
             <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider font-semibold">Win Rate</span>
             </div>
             <div className={`text-2xl font-bold ${stats.winRate >= 70 ? 'text-primary' : stats.winRate > 0 ? 'text-emerald-400' : ''}`}>
                {(stats?.totalFinished ?? 0) > 0 ? `${stats?.winRate?.toFixed(1) ?? "0.0"}%` : "0.0%"}
             </div>
             <div className="text-[10px] text-muted-foreground">{stats.won} W / {stats.lost} L</div>
          </div>

          <div className="bg-background/40 border border-border/50 rounded-2xl p-4">
             <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Activity className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider font-semibold">Net P&L</span>
             </div>
             <div className={`text-2xl font-bold ${stats.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {stats.pnl >= 0 ? "+" : ""}{fmtUsd(stats.pnl)}
             </div>
          </div>

          <div className="bg-background/40 border border-border/50 rounded-2xl p-4">
             <div className="flex items-center gap-2 text-muted-foreground mb-1">
                {isEnabled ? <Power className="w-4 h-4 text-primary animate-pulse" /> : <PowerOff className="w-4 h-4 text-muted-foreground" />}
                <span className="text-xs uppercase tracking-wider font-semibold">Active Scans</span>
             </div>
             <div className="text-2xl font-bold text-foreground">
                {stats.active.length} <span className="text-sm font-normal text-muted-foreground">running</span>
             </div>
          </div>
       </div>

       {/* Active Trade Log Preview */}
       {stats.active.length > 0 && (
         <div className="bg-background/60 border border-border/50 rounded-2xl p-4 mt-2">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Live Bot Trades</h4>
            <div className="space-y-2">
               {stats.active.map(t => {
                  const inst = instruments?.find(i => i.id === t.instrumentId);
                  return (
                    <div key={t.id} className="flex items-center justify-between text-sm glass border border-border/30 px-3 py-2 rounded-xl">
                       <span className="font-semibold">{inst?.symbol || `ID: ${t.instrumentId}`}</span>
                       <span className={t.side === "BUY" ? "text-emerald-400 font-medium" : "text-rose-400 font-medium"}>{t.side}</span>
                       <span className="text-muted-foreground">{fmtUsd(parseFloat((t.amount as any) || "0"))}</span>
                    </div>
                  );
               })}
            </div>
         </div>
       )}
    </div>
  );
}
