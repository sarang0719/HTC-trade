import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Zap,
  CheckCircle2,
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Shield,
  FlaskConical,
  CircleDollarSign,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface WalletInfo {
  realBalance: string;
  demoBalance: string;
  tradeMode: "DEMO" | "REAL";
}

interface Transaction {
  id: number;
  type: "DEPOSIT" | "WITHDRAW" | "TRADE_DEDUCTION" | "TRADE_WIN" | "DEMO_RESET";
  amount: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  mode?: string;
  createdAt: string;
  referenceId: string | null;
}

export default function WalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState("3000");
  const [withdrawAmount, setWithdrawAmount] = useState("3000");
  const [withdrawMethod, setWithdrawMethod] = useState<"UPI" | "BANK">("UPI");
  const [withdrawDetails, setWithdrawDetails] = useState("");
  const INR_TO_USD = 83.5; // Institutional conversion rate
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "deposit" | "withdraw" | "history">("overview");

  useEffect(() => {
    if (user?.phoneNumber) setPhoneNumber(user.phoneNumber);
  }, [user]);

  const { data: walletInfo, refetch: refetchWallet } = useQuery<WalletInfo>({
    queryKey: ["/api/wallet/info"],
    refetchInterval: 3000,
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/wallet/transactions"],
    refetchInterval: 3000,
  });

  const tradeMode = walletInfo?.tradeMode ?? "DEMO";
  const realBalance = parseFloat(walletInfo?.realBalance ?? "0");
  const demoBalance = parseFloat(walletInfo?.demoBalance ?? "10000");

  // Switch mode mutation
  const switchModeMutation = useMutation({
    mutationFn: async (mode: "DEMO" | "REAL") => {
      const res = await fetch("/api/wallet/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/info"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (e: any) => toast({ title: "Failed to switch mode", description: e.message, variant: "destructive" }),
  });

  // Reset demo mutation
  const resetDemoMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/wallet/demo/reset", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/info"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
      toast({ title: "✅ Demo Balance Reset!", description: "Your demo account has been topped up to $10,000." });
    },
    onError: (e: any) => toast({ title: "Reset failed", description: e.message, variant: "destructive" }),
  });

  // Settings mutation
  const settingsMutation = useMutation({
    mutationFn: async (phone: string) => {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "✅ Settings Saved", description: "Your phone number has been updated for SMS alerts." });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const { data: withdrawalRequests } = useQuery<any[]>({
    queryKey: ["/api/wallet/withdrawals"],
    refetchInterval: 10000,
  });


  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (amt < 3000) {
      toast({ title: "Minimum deposit is ₹3,000", variant: "destructive" });
      return;
    }
    setIsDepositing(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Razorpay SDK failed to load. Check your internet.");

      const createRes = await fetch("/api/wallet/deposit/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt }),
      });
      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.message || "Failed to create payment order");
      }
      const data = await createRes.json();

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "QUANTEDGE V12.1 · SMC",
        description: "Wallet Deposit",
        image: "/favicon.ico",
        order_id: data.orderId,
        handler: async (response: any) => {
          const verifyRes = await fetch("/api/wallet/deposit/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...response, amount: amt }),
          });
          if (verifyRes.ok) {
            const result = await verifyRes.json();
            toast({ title: `💰 Deposit Successful!`, description: `₹${amt} added to your wallet.` });
            queryClient.invalidateQueries({ queryKey: ["/api/wallet/info"] });
            queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          } else {
            const err = await verifyRes.json();
            toast({ title: "Deposit verification failed", description: err.message, variant: "destructive" });
          }
        },
        prefill: { email: user?.email ?? "" },
        theme: { color: "#f97316" },
        modal: { ondismiss: () => setIsDepositing(false) },
      };
      const pay = new (window as any).Razorpay(options);
      pay.open();
    } catch (e: any) {
      toast({ title: "Deposit Error", description: e.message, variant: "destructive" });
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (amt > realBalance) {
      toast({ title: "Insufficient balance", description: "You don't have enough funds.", variant: "destructive" });
      return;
    }
    if (!withdrawDetails || withdrawDetails.length < 5) {
      toast({ title: "Payment details required", description: "Please enter your UPI ID or Bank account details.", variant: "destructive" });
      return;
    }
    setIsWithdrawing(true);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: String(amt),
          method: withdrawMethod,
          details: withdrawDetails
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Withdrawal failed");
      }
      toast({ title: "✅ Withdrawal Requested", description: `₹${amt} is now pending admin approval.` });
      setWithdrawAmount("100");
      setWithdrawDetails("");
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/info"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (e: any) {
      toast({ title: "Withdrawal Error", description: e.message, variant: "destructive" });
    } finally {
      setIsWithdrawing(false);
    }
  };


  const txIcon = (tx: Transaction) => {
    if (tx.type === "DEPOSIT") return <ArrowDownCircle className="h-9 w-9 text-emerald-500" />;
    if (tx.type === "WITHDRAW") return <ArrowUpCircle className="h-9 w-9 text-sky-400" />;
    if (tx.type === "TRADE_WIN") return <TrendingUp className="h-9 w-9 text-emerald-500" />;
    if (tx.type === "DEMO_RESET") return <RefreshCw className="h-9 w-9 text-violet-400" />;
    return <TrendingDown className="h-9 w-9 text-rose-500" />;
  };

  const txLabel = (tx: Transaction) => {
    if (tx.type === "DEPOSIT") return "Wallet Deposit";
    if (tx.type === "WITHDRAW") return "Withdrawal";
    if (tx.type === "TRADE_WIN") return "Trade Profit";
    if (tx.type === "DEMO_RESET") return "Demo Reset";
    return "Trade Placed";
  };

  const txPositive = (tx: Transaction) => ["DEPOSIT", "TRADE_WIN", "DEMO_RESET"].includes(tx.type);

  const quickAmounts = ["3000", "5000", "10000", "25000"];

  return (
    <AppShell title="Wallet & Funds" subtitle="Manage your real and demo trading balances">
      <div className="space-y-6 max-w-5xl mx-auto">

        {/* ── Mode Toggle Banner ── */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-card/50 p-1 shadow-xl">
          <div className="flex gap-1">
            <button
              id="btn-demo-mode"
              onClick={() => tradeMode !== "DEMO" && switchModeMutation.mutate("DEMO")}
              disabled={switchModeMutation.isPending}
              className={cn(
                "flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-bold text-sm transition-all duration-300",
                tradeMode === "DEMO"
                  ? "bg-violet-600 text-white shadow-[0_0_24px_rgba(124,58,237,0.4)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <FlaskConical className="h-5 w-5" />
              <div className="text-left">
                <div className="font-black">DEMO</div>
                <div className="text-[11px] font-normal opacity-80">
                  ${parseFloat(walletInfo?.demoBalance ?? "10000").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </div>
              {tradeMode === "DEMO" && (
                <span className="ml-auto text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>
              )}
            </button>

            <button
              id="btn-real-mode"
              onClick={() => tradeMode !== "REAL" && switchModeMutation.mutate("REAL")}
              disabled={switchModeMutation.isPending}
              className={cn(
                "flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-bold text-sm transition-all duration-300",
                tradeMode === "REAL"
                  ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-[0_0_24px_rgba(249,115,22,0.4)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <CircleDollarSign className="h-5 w-5" />
              <div className="text-left">
                <div className="font-black">REAL</div>
                <div className="text-[11px] font-normal opacity-80">
                  ${parseFloat(walletInfo?.realBalance ?? "0").toLocaleString("en-US", { minimumFractionDigits: 2 })} · ₹{(parseFloat(walletInfo?.realBalance ?? "0") * INR_TO_USD).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </div>
              {tradeMode === "REAL" && (
                <span className="ml-auto text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>
              )}
            </button>
          </div>
        </div>

        {/* ── Balance Cards ── */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Demo Balance */}
          <div className={cn(
            "relative overflow-hidden rounded-2xl border p-6 transition-all duration-300",
            tradeMode === "DEMO"
              ? "border-violet-500/40 bg-gradient-to-br from-violet-950/30 to-card shadow-[0_0_30px_rgba(124,58,237,0.15)]"
              : "border-border/40 bg-card/60"
          )}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FlaskConical className="h-4 w-4 text-violet-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-violet-400">Demo Account</span>
                </div>
                <div className="text-3xl font-black text-foreground">
                  ${parseFloat(walletInfo?.demoBalance ?? "10000").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Practice without real risk</p>
              </div>
              {tradeMode === "DEMO" && (
                <span className="flex items-center gap-1 text-[10px] font-black bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-1 rounded-full">
                  <Zap className="h-3 w-3" /> TRADING
                </span>
              )}
            </div>
            <Button
              id="btn-reset-demo"
              onClick={() => resetDemoMutation.mutate()}
              disabled={resetDemoMutation.isPending}
              variant="outline"
              size="sm"
              className="w-full border-violet-500/30 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-2", resetDemoMutation.isPending && "animate-spin")} />
              Reset to $10,000
            </Button>
          </div>

          {/* Real Balance */}
          <div className={cn(
            "relative overflow-hidden rounded-2xl border p-6 transition-all duration-300",
            tradeMode === "REAL"
              ? "border-orange-500/40 bg-gradient-to-br from-orange-950/20 to-card shadow-[0_0_30px_rgba(249,115,22,0.15)]"
              : "border-border/40 bg-card/60"
          )}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-4 w-4 text-orange-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-orange-400">Real Wallet</span>
                </div>
                <div className="text-3xl font-black text-foreground">
                  ${parseFloat(walletInfo?.realBalance ?? "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs font-bold text-orange-400/80 mt-0.5">
                   ≈ ₹{(parseFloat(walletInfo?.realBalance ?? "0") * INR_TO_USD).toLocaleString("en-IN", { maximumFractionDigits: 0 })} INR
                </div>
              </div>
              {tradeMode === "REAL" && (
                <span className="flex items-center gap-1 text-[10px] font-black bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-1 rounded-full">
                  <Zap className="h-3 w-3" /> TRADING
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                id="btn-quick-deposit"
                onClick={() => setActiveTab("deposit")}
                size="sm"
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold"
              >
                <ArrowDownCircle className="h-3.5 w-3.5 mr-2" /> Deposit
              </Button>
              <Button
                id="btn-quick-withdraw"
                onClick={() => setActiveTab("withdraw")}
                size="sm"
                variant="outline"
                className="flex-1 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
              >
                <ArrowUpCircle className="h-3.5 w-3.5 mr-2" /> Withdraw
              </Button>
            </div>
          </div>
        </div>

        {/* ── Action Tabs ── */}
        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-lg">
          {/* Tab bar */}
          <div className="flex border-b border-border/40 bg-secondary/10">
            {(["deposit", "withdraw", "history"] as const).map((tab) => (
              <button
                key={tab}
                id={`wallet-tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-3.5 text-xs font-bold uppercase tracking-widest transition-all",
                  activeTab === tab
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "deposit" && "💳 Deposit"}
                {tab === "withdraw" && "📤 Withdraw"}
                {tab === "history" && "📋 History"}
              </button>
            ))}
          </div>

          {/* ── Deposit Panel ── */}
          {activeTab === "deposit" && (
            <div className="p-6 space-y-5">
              <div>
                <h3 className="font-bold text-base mb-1">Add Funds via Razorpay</h3>
                <p className="text-xs text-muted-foreground">Secure payment powered by Razorpay. UPI, Cards, Net Banking supported.</p>
              </div>

              {/* Quick amounts */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Quick Select</label>
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((a) => (
                    <button
                      key={a}
                      id={`quick-deposit-${a}`}
                      onClick={() => setDepositAmount(a)}
                      className={cn(
                        "py-2 text-sm font-bold rounded-xl border transition-all",
                        depositAmount === a
                          ? "bg-primary border-primary text-primary-foreground shadow-[0_0_12px_rgba(249,115,22,0.3)]"
                          : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      ₹{a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Custom Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground">₹</span>
                  <Input
                    id="deposit-amount-input"
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    min="3000"
                    className="pl-10 h-12 text-lg font-bold bg-background border-border/60 focus:border-primary/60"
                    placeholder="Enter amount"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-primary/10 rounded border border-primary/20">
                     <span className="text-[10px] font-black text-primary uppercase">≈ ${(parseFloat(depositAmount || "0") / INR_TO_USD).toFixed(2)} USD</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Minimum: ₹3,000 • Credited instantly after payment</p>
              </div>

              <Button
                id="btn-deposit-now"
                onClick={handleDeposit}
                disabled={isDepositing}
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-black text-base shadow-[0_4px_20px_rgba(249,115,22,0.3)] hover:shadow-[0_4px_30px_rgba(249,115,22,0.5)] transition-all"
              >
                {isDepositing ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Pay ₹{depositAmount} with Razorpay</>
                )}
              </Button>

              <div className="flex items-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
                <p className="text-xs text-emerald-400 font-medium">Your payment is 256-bit SSL encrypted & verified via Razorpay webhook</p>
              </div>
            </div>
          )}

          {/* ── Withdraw Panel ── */}
          {activeTab === "withdraw" && (
            <div className="p-6 space-y-5">
              <div>
                <h3 className="font-bold text-base mb-1">Withdraw Funds</h3>
                <p className="text-xs text-muted-foreground">Withdrawals are processed within 1-3 business days.</p>
              </div>

              <div className="p-4 bg-secondary/30 rounded-xl border border-border/40">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">Available Balance</span>
                  <span className="font-black text-lg text-foreground">
                    ${realBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} · ₹{(realBalance * INR_TO_USD).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Withdrawal Method</label>
                <div className="flex gap-2">
                  <Button 
                    variant={withdrawMethod === "UPI" ? "default" : "outline"} 
                    className="flex-1"
                    onClick={() => setWithdrawMethod("UPI")}
                  >
                    UPI Transfer
                  </Button>
                  <Button 
                    variant={withdrawMethod === "BANK" ? "default" : "outline"} 
                    className="flex-1"
                    onClick={() => setWithdrawMethod("BANK")}
                  >
                    Bank Account
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                  {withdrawMethod === "UPI" ? "UPI ID" : "Bank Details (A/C No, IFSC)"}
                </label>
                <Input
                  value={withdrawDetails}
                  onChange={(e) => setWithdrawDetails(e.target.value)}
                  placeholder={withdrawMethod === "UPI" ? "e.g. user@okicici" : "e.g. A/C 1234..., IFSC BKID..."}
                  className="bg-background"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Withdrawal Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground">₹</span>
                  <Input
                    id="withdraw-amount-input"
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    min="3000"
                    max={realBalance * INR_TO_USD}
                    className="pl-10 h-12 text-lg font-bold bg-background border-border/60 focus:border-primary/60"
                    placeholder="Enter amount"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-sky-500/10 rounded border border-sky-500/20">
                     <span className="text-[10px] font-black text-sky-400 uppercase">≈ ${(parseFloat(withdrawAmount || "0") / INR_TO_USD).toFixed(2)} USD</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Minimum: ₹3,000 • Current: ₹{(realBalance * INR_TO_USD).toLocaleString()}</p>
              </div>

              <Button
                id="btn-withdraw-now"
                onClick={handleWithdraw}
                disabled={isWithdrawing || realBalance < 100}
                variant="outline"
                className="w-full h-12 border-sky-500/50 text-sky-400 hover:bg-sky-500/10 font-black text-base"
              >
                {isWithdrawing ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><ArrowUpCircle className="h-4 w-4 mr-2" /> Request ₹{withdrawAmount} Withdrawal</>
                )}
              </Button>

              <div className="p-4 bg-muted/40 rounded-xl space-y-4">
                <div className="flex items-center gap-2">
                   <Zap className="h-4 w-4 text-primary" />
                   <h4 className="text-xs font-bold uppercase tracking-widest">Trade Win Alerts</h4>
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    placeholder="e.g. +91 99999 99999"
                    className="flex-1 bg-background"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => settingsMutation.mutate(phoneNumber)}
                    disabled={settingsMutation.isPending}
                  >
                    {settingsMutation.isPending ? "Saving..." : "Enable SMS Alerts"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Receive instant WIN notifications directly to your phone. (Indian formats supported)</p>
              </div>
            </div>
          )}


          {/* ── Transaction History ── */}
          {activeTab === "history" && (
            <div className="min-h-[300px]">
              {(!transactions || transactions.length === 0) && (!withdrawalRequests || withdrawalRequests.length === 0) ? (
                <div className="flex flex-col items-center justify-center p-16 text-center">
                  <History className="h-14 w-14 text-muted-foreground/20 mb-4" />
                  <h4 className="font-bold text-lg mb-1">No Transactions Yet</h4>
                  <p className="text-muted-foreground text-sm max-w-[240px]">
                    Deposit funds or place a trade to see your history here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {/* Withdrawal Requests first */}
                  {(withdrawalRequests ?? []).map((wr) => (
                     <div key={`wr-${wr.id}`} className="flex items-center justify-between px-6 py-4 bg-primary/5 hover:bg-primary/10 transition-colors">
                        <div className="flex items-center gap-4">
                           <div className="shrink-0"><ArrowUpCircle className="h-9 w-9 text-amber-400" /></div>
                           <div>
                              <div className="flex items-center gap-2">
                                 <p className="font-bold text-sm text-foreground">Withdrawal Request</p>
                                 <Badge variant="outline" className={cn(
                                    "text-[9px] font-black uppercase tracking-widest",
                                    wr.status === "PENDING" ? "border-amber-500 text-amber-500" :
                                    wr.status === "APPROVED" ? "border-emerald-500 text-emerald-500" : "border-rose-500 text-rose-500"
                                 )}>
                                    {wr.status}
                                 </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                 {wr.method} · {wr.details} · {new Date(wr.createdAt).toLocaleDateString()}
                              </p>
                           </div>
                        </div>
                        <div className="text-right shrink-0">
                           <div className="font-black text-base text-amber-400">-₹{parseFloat(wr.amount).toLocaleString()}</div>
                           <div className="text-[10px] font-bold text-muted-foreground uppercase">{wr.status === "PENDING" ? "Waiting for Admin" : wr.status}</div>
                        </div>
                     </div>
                  ))}

                  {/* Normal Transactions */}
                  {(transactions ?? []).map((tx) => (

                    <div
                      key={tx.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="shrink-0">{txIcon(tx)}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-foreground">{txLabel(tx)}</p>
                            {tx.mode && (
                              <span className={cn(
                                "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest",
                                tx.mode === "DEMO"
                                  ? "bg-violet-500/20 text-violet-300"
                                  : "bg-orange-500/20 text-orange-300"
                              )}>
                                {tx.mode}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(tx.createdAt).toLocaleString()}
                            {tx.referenceId ? ` · ${tx.referenceId.slice(0, 16)}...` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={cn(
                          "font-black text-base",
                          txPositive(tx) ? "text-emerald-400" : "text-foreground"
                        )}>
                          {txPositive(tx) ? "+" : "-"}${parseFloat(tx.amount).toFixed(2)}
                        </div>
                        <div className={cn(
                          "text-[10px] font-bold uppercase",
                          tx.status === "SUCCESS" ? "text-emerald-500/70" : tx.status === "FAILED" ? "text-rose-500/70" : "text-amber-500/70"
                        )}>
                          {tx.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Total Deposits",
              value: `$${(transactions ?? []).filter(t => t.type === "DEPOSIT").reduce((a, t) => a + parseFloat(t.amount), 0).toFixed(2)}`,
              icon: <ArrowDownCircle className="h-4 w-4 text-emerald-400" />,
              color: "text-emerald-400",
            },
            {
              label: "Trade Profits",
              value: `$${(transactions ?? []).filter(t => t.type === "TRADE_WIN").reduce((a, t) => a + parseFloat(t.amount), 0).toFixed(2)}`,
              icon: <TrendingUp className="h-4 w-4 text-primary" />,
              color: "text-primary",
            },
            {
              label: "Total Withdrawn",
              value: `$${(transactions ?? []).filter(t => t.type === "WITHDRAW").reduce((a, t) => a + parseFloat(t.amount), 0).toFixed(2)}`,
              icon: <ArrowUpCircle className="h-4 w-4 text-sky-400" />,
              color: "text-sky-400",
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-card/60 border border-border/40 rounded-xl p-4 text-center">
              <div className="flex justify-center mb-2">{stat.icon}</div>
              <div className={cn("font-black text-lg", stat.color)}>{stat.value}</div>
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
