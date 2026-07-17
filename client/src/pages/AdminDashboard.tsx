import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { 
  Users, 
  ShieldAlert, 
  Activity, 
  History, 
  CreditCard, 
  BarChart3, 
  Ban, 
  Unlock, 
  Lock,
  Cpu,
  Search,
  ChevronRight,
  ArrowLeft,
  Settings,
  Mail,
  Calendar,
  Globe,
  Monitor
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useMemo } from "react";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";


type AdminUserDetail = {
  user: any;
  loginHistory: any[];
  activities: any[];
  trades: {
    standard: any[];
    timeBased: any[];
  };
  transactions: any[];
};

export default function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeAdminTab, setActiveAdminTab] = useState<"users" | "withdrawals">("users");
  const [withdrawNotes, setWithdrawNotes] = useState("");

  // Redirect non-admins (Institutional Gatekeeper)
  const isMaster = currentUser?.email === "saran123@gmail.com";
  const isOperator = currentUser?.email === "htctrade123@gmail.com";

  if (currentUser && !isMaster && !isOperator) {
     setLocation("/app");
     return null;
  }

  // Force Admin 2 to withdrawals tab as they can't see users
  useMemo(() => {
    if (isOperator && activeAdminTab === "users") {
      setActiveAdminTab("withdrawals");
    }
  }, [isOperator]);

  const { data: users, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!currentUser,
  });

  const { data: detail, isLoading: isDetailLoading } = useQuery<AdminUserDetail>({
    queryKey: ["/api/admin/users", selectedUserId, "monitoring"],
    enabled: !!selectedUserId,
  });

  const controlMutation = useMutation({
    mutationFn: async (vars: any) => {
      const { userId, ...payload } = vars;
      const res = await fetch(`/api/admin/users/${userId}/control`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update user status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", selectedUserId, "monitoring"] });
    }
  });

  const { data: adminWithdrawals } = useQuery<any[]>({
    queryKey: ["/api/admin/withdrawals"],
    enabled: !!currentUser,
  });

  const withdrawMutation = useMutation({
    mutationFn: async ({ id, status, notes }: any) => {
      const res = await fetch(`/api/admin/withdrawals/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes: notes }),
      });
      if (!res.ok) throw new Error("Failed to update withdrawal status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setWithdrawNotes("");
    }
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => 
       u.email?.toLowerCase().includes(search.toLowerCase()) || 
       u.firstName?.toLowerCase().includes(search.toLowerCase()) || 
       u.lastName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  if (isLoading) return <div className="p-8">Loading dashboard...</div>;

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto p-6 space-y-8 animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight">
              <ShieldAlert className="h-8 w-8 text-primary" /> Admin Control Center
            </h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">Monitoring {users?.length} active traders</p>
          </div>
          
          <div className="flex bg-card/60 p-1 rounded-xl border border-border/40 gap-1 w-full md:w-fit self-end">
             {isMaster && (
               <Button 
                 variant={activeAdminTab === "users" ? "default" : "ghost"} 
                 size="sm" 
                 className="rounded-lg px-6"
                 onClick={() => setActiveAdminTab("users")}
               >
                 <Users className="h-4 w-4 mr-2" /> Traders
               </Button>
             )}
             <Button 
               variant={activeAdminTab === "withdrawals" ? "default" : "ghost"} 
               size="sm" 
               className={`rounded-lg px-6 ${adminWithdrawals?.some(w => w.status === 'PENDING') ? 'relative' : ''}`}
               onClick={() => setActiveAdminTab("withdrawals")}
             >
               <CreditCard className="h-4 w-4 mr-2" /> Payouts
               {adminWithdrawals?.filter(w => w.status === 'PENDING').length! > 0 && (
                 <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                    {adminWithdrawals?.filter(w => w.status === 'PENDING').length}
                 </span>
               )}
             </Button>
          </div>
        </div>

        {activeAdminTab === "users" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          
          {/* User List Panel */}
          <Card className="lg:col-span-5 border-border/40 shadow-sm bg-card/30 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Master User List</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/20 max-h-[700px] overflow-y-auto custom-scrollbar">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full group px-6 py-5 flex items-center justify-between hover:bg-primary/5 transition-all text-left ${selectedUserId === u.id ? 'bg-primary/5 border-l-4 border-primary' : 'border-l-4 border-transparent'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary font-bold shadow-inner">
                        {u.firstName?.[0] || u.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {u.firstName} {u.lastName}
                          {u.isBlocked && <Badge variant="destructive" className="text-[9px] h-4 uppercase">Blocked</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground/70 truncate w-[180px]">{u.email}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                       <span className="text-xs font-bold font-mono">₹{parseFloat(u.walletBalance || "0").toLocaleString()}</span>
                       <ChevronRight className={`h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-all ${selectedUserId === u.id ? 'translate-x-1 text-primary' : ''}`} />
                    </div>
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground text-sm">No users found matching your search.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User Detail Panel */}
          <div className="lg:col-span-7 space-y-6">
            {!selectedUserId ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-muted-foreground/50 border-2 border-dashed border-border/20 rounded-3xl">
                <Users className="h-16 w-16 mb-4 opacity-10" />
                <p className="text-sm font-medium">Select a user to view full telemetry</p>
              </div>
            ) : isDetailLoading ? (
              <div className="flex items-center justify-center h-full">Loading telemetry...</div>
            ) : detail && (
              <div className="space-y-6 animate-in zoom-in-95 duration-300">
                
                {/* Status & Control Card */}
                <Card className="border-border/40 shadow-sm border-t-4 border-t-primary overflow-hidden">
                   <div className="p-6 bg-primary/5 border-b border-border/20 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Users className="h-7 w-7" />
                         </div>
                         <div>
                            <h2 className="text-xl font-bold">{detail.user.firstName} {detail.user.lastName}</h2>
                            <p className="text-sm text-muted-foreground font-medium">{detail.user.email}</p>
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant={detail.user.isBlocked ? "outline" : "destructive"} 
                          size="sm"
                          className="rounded-lg h-9"
                          onClick={() => controlMutation.mutate({ userId: detail.user.id, isBlocked: !detail.user.isBlocked })}
                          disabled={controlMutation.isPending}
                        >
                          {detail.user.isBlocked ? <Unlock className="h-4 w-4 mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                          {detail.user.isBlocked ? "Unblock Account" : "Block Account"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className={`rounded-lg h-9 ${detail.user.isAIBlocked ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : ''}`}
                          onClick={() => controlMutation.mutate({ userId: detail.user.id, isAIBlocked: !detail.user.isAIBlocked })}
                          disabled={controlMutation.isPending}
                        >
                          <Cpu className="h-4 w-4 mr-2" />
                          {detail.user.isAIBlocked ? "Enable AI" : "Restrict AI"}
                        </Button>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-3 divide-x divide-border/20 border-b border-border/20">
                      <div className="p-4 text-center">
                         <div className="text-[10px] uppercase font-bold text-muted-foreground/60 mb-1">Real Wallet</div>
                         <div className="text-lg font-bold font-mono text-emerald-500">₹{parseFloat(detail.user.walletBalance).toLocaleString()}</div>
                      </div>
                      <div className="p-4 text-center">
                         <div className="text-[10px] uppercase font-bold text-muted-foreground/60 mb-1">Demo Wallet</div>
                         <div className="text-lg font-bold font-mono text-primary">₹{parseFloat(detail.user.demoBalance).toLocaleString()}</div>
                      </div>
                      <div className="p-4 text-center">
                         <div className="text-[10px] uppercase font-bold text-muted-foreground/60 mb-1">Last seen</div>
                         <div className="text-xs font-bold">{detail.loginHistory[0] ? format(new Date(detail.loginHistory[0].createdAt), "MMM d, HH:mm") : "Never"}</div>
                      </div>
                   </div>

                    {/* AI Governance Controls (v92.0) */}
                    <div className="p-6 bg-accent/5 border-t border-border/20">
                       <div className="flex items-center gap-2 mb-4">
                          <Cpu className="h-4 w-4 text-primary" />
                          <h3 className="text-xs uppercase font-black tracking-widest text-muted-foreground">AI Auto-Pilot Governance</h3>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-bold text-muted-foreground/80 uppercase">Bot Status</label>
                             <div className="flex items-center gap-3 h-10 px-3 bg-background/50 border border-border/40 rounded-xl">
                                <span className={`text-[10px] font-black uppercase ${detail.user.autoTradeEnabled ? 'text-primary' : 'text-muted-foreground'}`}>
                                   {detail.user.autoTradeEnabled ? 'Active' : 'Halted'}
                                </span>
                                <Button 
                                   variant="ghost" 
                                   size="sm" 
                                   className={`h-6 px-2 rounded-lg text-[9px] font-black ${detail.user.autoTradeEnabled ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                                   onClick={() => controlMutation.mutate({ userId: detail.user.id, autoTradeEnabled: !detail.user.autoTradeEnabled })}
                                >
                                   {detail.user.autoTradeEnabled ? 'STOP' : 'START'}
                                </Button>
                             </div>
                          </div>
                          
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-bold text-muted-foreground/80 uppercase">Trade Size (₹)</label>
                             <input 
                                type="text"
                                className="w-full h-10 px-3 bg-background/50 border border-border/40 rounded-xl text-xs font-bold focus:border-primary outline-none transition-all"
                                defaultValue={detail.user.autoTradeAmount || "5.00"}
                                onBlur={(e) => controlMutation.mutate({ userId: detail.user.id, autoTradeAmount: e.target.value })}
                             />
                          </div>

                          <div className="space-y-1.5">
                             <label className="text-[10px] font-bold text-muted-foreground/80 uppercase text-emerald-500">Profit Target (₹)</label>
                             <input 
                                type="text"
                                className="w-full h-10 px-3 bg-background/50 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-400 focus:border-emerald-500 outline-none transition-all"
                                defaultValue={detail.user.autoInvestProfitLimit || "100.00"}
                                onBlur={(e) => controlMutation.mutate({ userId: detail.user.id, autoInvestProfitLimit: e.target.value })}
                             />
                          </div>

                          <div className="space-y-1.5">
                             <label className="text-[10px] font-bold text-muted-foreground/80 uppercase text-rose-500">Loss Limit (₹)</label>
                             <input 
                                type="text"
                                className="w-full h-10 px-3 bg-background/50 border border-rose-500/20 rounded-xl text-xs font-bold text-rose-400 focus:border-rose-500 outline-none transition-all"
                                defaultValue={detail.user.autoInvestLossLimit || "50.00"}
                                onBlur={(e) => controlMutation.mutate({ userId: detail.user.id, autoInvestLossLimit: e.target.value })}
                             />
                          </div>
                       </div>
                       
                       <p className="mt-4 text-[10px] text-muted-foreground italic font-medium">
                          The QUANTEDGE V12.1 · SMC engine will automatically halt the bot for this user once their net P&L reaches the target profit or breaches the loss limit.
                       </p>
                    </div>
                 </Card>

                {/* Tabs / Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Activity Log */}
                  <Card className="border-border/40 shadow-sm h-[400px] flex flex-col">
                    <CardHeader className="py-4 border-b border-border/10">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" /> Comprehensive Log
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1">
                       <div className="divide-y divide-border/10">
                          {detail.activities.map((act, i) => (
                            <div key={i} className="px-5 py-3.5 flex items-start gap-4 hover:bg-muted/30 transition-all">
                               <div className="mt-1 h-2 w-2 rounded-full bg-primary/40 shrink-0" />
                               <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-0.5">
                                     <span className="text-[11px] font-bold uppercase tracking-wide text-foreground/80">{act.action}</span>
                                     <span className="text-[10px] text-muted-foreground font-medium">{format(new Date(act.createdAt), "HH:mm:ss")}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground/70 truncate">{act.details}</p>
                               </div>
                            </div>
                          ))}
                          {detail.activities.length === 0 && <div className="p-12 text-center text-muted-foreground text-xs">No recent activity detected.</div>}
                       </div>
                    </CardContent>
                  </Card>

                  {/* Device Tracking */}
                  <Card className="border-border/40 shadow-sm h-[400px] flex flex-col">
                    <CardHeader className="py-4 border-b border-border/10">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <History className="h-4 w-4 text-primary" /> Session Intelligence
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1">
                       <div className="divide-y divide-border/10">
                          {detail.loginHistory.map((log, i) => (
                            <div key={i} className="px-5 py-4 hover:bg-muted/30 transition-all space-y-2">
                               <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold flex items-center gap-1.5 uppercase text-foreground/80">
                                     <Globe className="h-3 w-3" /> {log.ip || "Unknown IP"}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-medium">{format(new Date(log.createdAt), "MMM d, HH:mm")}</span>
                               </div>
                               <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/60 rounded text-[10px] font-medium text-muted-foreground border border-border/20">
                                     <Monitor className="h-2.5 w-2.5" /> {log.device?.split(")")[0].split("(").pop()?.slice(0, 15) || "PC"}
                                  </div>
                                  <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/60 rounded text-[10px] font-medium text-muted-foreground border border-border/20">
                                     <Calendar className="h-2.5 w-2.5" /> ID: {log.id}
                                  </div>
                               </div>
                            </div>
                          ))}
                          {detail.loginHistory.length === 0 && <div className="p-12 text-center text-muted-foreground text-xs">No login history available.</div>}
                       </div>
                    </CardContent>
                  </Card>

                  {/* Trade Pulse */}
                  <Card className="md:col-span-2 border-border/40 shadow-sm flex flex-col h-[500px]">
                    <CardHeader className="py-4 border-b border-border/10 flex flex-row items-center justify-between shrink-0">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" /> Trading History
                      </CardTitle>
                      <div className="flex gap-2">
                         <Badge variant="outline" className="text-[9px] bg-primary/5">{detail.trades.standard.length} Fixed</Badge>
                         <Badge variant="outline" className="text-[9px] bg-accent/5">{detail.trades.timeBased.length} Binary Options</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                       <div className="w-full flex-1 overflow-y-auto custom-scrollbar">
                          <table className="w-full text-left border-collapse relative">
                             <thead className="sticky top-0 bg-card/95 backdrop-blur z-10 shadow-sm">
                                <tr className="text-[10px] uppercase tracking-tighter text-muted-foreground/80">
                                   <th className="px-6 py-3 font-bold">Market</th>
                                   <th className="px-6 py-3 font-bold">Type</th>
                                   <th className="px-6 py-3 font-bold">Duration</th>
                                   <th className="px-6 py-3 font-bold text-right">Investment</th>
                                   <th className="px-6 py-3 font-bold text-right">Result</th>
                                   <th className="px-6 py-3 font-bold text-right">Date</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-border/10">
                                {[...detail.trades.standard, ...detail.trades.timeBased].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((trade, i) => (
                                  <tr key={i} className="hover:bg-primary/5 transition-all">
                                     <td className="px-6 py-3.5 text-xs font-bold">{trade.instrumentSymbol || "GOLD"}</td>
                                     <td className="px-6 py-3.5">
                                        <Badge variant={trade.side === "BUY" ? "outline" : "destructive"} className="text-[9px] px-1.5 py-0">
                                           {trade.side}
                                        </Badge>
                                     </td>
                                     <td className="px-6 py-3.5 text-xs text-muted-foreground font-mono">
                                        {trade.durationSeconds ? `${trade.durationSeconds}s` : "—"}
                                     </td>
                                     <td className="px-6 py-3.5 text-xs text-right font-mono font-bold">₹{parseFloat(trade.amount || trade.quantity || "0").toLocaleString()}</td>
                                     <td className={`px-6 py-3.5 text-xs text-right font-bold ${trade.status === 'WIN' ? 'text-emerald-500' : trade.status === 'LOSS' ? 'text-rose-500' : 'text-primary animate-pulse'}`}>
                                        {trade.status}
                                     </td>
                                     <td className="px-6 py-3.5 text-[10px] text-right text-muted-foreground">{format(new Date(trade.createdAt), "MMM d, HH:mm")}</td>
                                  </tr>
                                ))}
                             </tbody>
                          </table>
                          {[...detail.trades.standard, ...detail.trades.timeBased].length === 0 && (
                            <div className="p-12 text-center text-muted-foreground text-xs">No trade history found.</div>
                          )}
                       </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
          </div>
        ) : (
          /* Withdrawal Management Tab */
          <div className="grid grid-cols-1 gap-6">
             <Card className="border-border/40 bg-card/30 backdrop-blur-md overflow-hidden">
                <CardHeader className="bg-primary/5 py-4">
                   <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" /> Pending Payout Queue
                   </CardTitle>
                </CardHeader>
                <div className="divide-y divide-border/20">
                   {(adminWithdrawals ?? []).length === 0 ? (
                      <div className="p-20 text-center text-muted-foreground">No withdrawal requests found.</div>
                   ) : (
                      (adminWithdrawals ?? []).map((wr) => (
                         <div key={wr.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-muted/10 transition-all">
                            <div className="space-y-4 flex-1">
                               <div className="flex items-center gap-4">
                                  <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold shrink-0">
                                     {wr.user.firstName?.[0] || wr.user.email[0].toUpperCase()}
                                  </div>
                                  <div>
                                     <h3 className="font-bold text-base">{wr.user.firstName} {wr.user.lastName}</h3>
                                     <p className="text-xs text-muted-foreground">{wr.user.email} · Phone: {wr.user.phoneNumber || "N/A"}</p>
                                  </div>
                               </div>
                               
                               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="bg-muted/40 p-2.5 rounded-lg border border-border/20">
                                     <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Amount</p>
                                     <p className="text-sm font-black text-emerald-500">₹{parseFloat(wr.amount).toLocaleString()}</p>
                                  </div>
                                  <div className="bg-muted/40 p-2.5 rounded-lg border border-border/20">
                                     <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Method</p>
                                     <p className="text-sm font-black text-foreground">{wr.method}</p>
                                  </div>
                                  <div className="bg-muted/40 p-2.5 rounded-lg border border-border/20 md:col-span-2">
                                     <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Details</p>
                                     <p className="text-sm font-medium text-foreground truncate">{wr.details}</p>
                                  </div>
                               </div>
                               
                               {wr.status === "PENDING" && (
                                 <input 
                                   type="text" 
                                   placeholder="Add admin notes (optional)..."
                                   className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary transition-all"
                                   value={withdrawNotes}
                                   onChange={(e) => setWithdrawNotes(e.target.value)}
                                 />
                               )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-3 shrink-0">
                               <div className="text-xs font-medium text-muted-foreground">{format(new Date(wr.createdAt), "MMM d, HH:mm")}</div>
                               <Badge className={cn(
                                 "uppercase tracking-widest text-[9px] font-black h-5",
                                 wr.status === "PENDING" ? "bg-amber-500/20 text-amber-500" :
                                 wr.status === "APPROVED" ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500"
                               )}>
                                 {wr.status}
                               </Badge>
                               
                               {wr.status === "PENDING" && (
                                 <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      className="bg-emerald-500 hover:bg-emerald-600 h-8"
                                      onClick={() => withdrawMutation.mutate({ id: wr.id, status: 'APPROVED', notes: withdrawNotes })}
                                      disabled={withdrawMutation.isPending}
                                    >
                                       Approve
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="destructive" 
                                      className="h-8"
                                      onClick={() => withdrawMutation.mutate({ id: wr.id, status: 'REJECTED', notes: withdrawNotes })}
                                      disabled={withdrawMutation.isPending}
                                    >
                                       Reject
                                    </Button>
                                 </div>
                               )}
                            </div>
                         </div>
                      ))
                   )}
                </div>
             </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}

