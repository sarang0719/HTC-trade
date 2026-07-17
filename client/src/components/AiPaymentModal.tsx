import { useState } from "react";
import { Zap, Lock, CheckCircle, X, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (creditsAdded: number) => void;
  freePredictionsUsed: number;
  freePredictionsLimit: number;
  paidCredits: number;
}

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "₹500",
    credits: 4,
    amountPaise: 50000,
    features: ["4 AI Predictions", "Next Candle Direction", "Success Rate %", "Signal Breakdown"],
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹1,000",
    credits: 10,
    amountPaise: 100000,
    features: ["10 AI Predictions", "Next Candle Direction", "Success Rate %", "Signal Breakdown", "Priority Support"],
    highlight: true,
  },
];

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function AiPaymentModal({ open, onClose, onSuccess, freePredictionsUsed, freePredictionsLimit, paidCredits }: AiPaymentModalProps) {
  const [paying, setPaying] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [error, setError] = useState("");

  if (!open) return null;

  const freeRemaining = Math.max(0, freePredictionsLimit - freePredictionsUsed);

  const handlePurchase = async (planId: string) => {
    setError("");
    setPaying(true);
    try {
      // Load Razorpay SDK
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load payment gateway. Check your internet connection.");

      // Create order on backend
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.message || "Failed to create order");
      }
      const order = await orderRes.json();

      // Open Razorpay Checkout
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "HTC Trade Trading",
          description: order.planLabel,
          order_id: order.orderId,
          theme: { color: "#6366f1" },
          handler: async (response: any) => {
            // Verify payment on backend
            try {
              const verifyRes = await fetch("/api/razorpay/verify", {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  planId,
                }),
              });
              const vData = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(vData.message);
              onSuccess(vData.creditsAdded);
              resolve();
            } catch (e: any) {
              reject(e);
            }
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
        });
        rzp.on("payment.failed", (r: any) => reject(new Error(r.error?.description || "Payment failed")));
        rzp.open();
      });
    } catch (e: any) {
      if (!e.message?.includes("cancelled")) {
        setError(e.message || "Payment failed. Please try again.");
      }
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#0f1420] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-white/5">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/30 to-purple-900/30" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-white">AI Predictions Locked</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                You've used all {freePredictionsLimit} free predictions. Upgrade to continue.
              </p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Credit status bar */}
        <div className="px-6 py-4 flex items-center gap-4 bg-white/5 border-b border-white/5">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Free predictions used</span>
              <span className="font-bold text-white">{freePredictionsUsed}/{freePredictionsLimit}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full"
                style={{ width: `${(freePredictionsUsed / freePredictionsLimit) * 100}%` }}
              />
            </div>
          </div>
          {paidCredits > 0 && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold text-sm">{paidCredits} paid</span>
            </div>
          )}
        </div>

        {/* Plans */}
        <div className="p-6 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Choose a Plan</p>
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={cn(
                "relative rounded-xl border p-4 cursor-pointer transition-all",
                selectedPlan === plan.id
                  ? plan.highlight
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-white/30 bg-white/5"
                  : "border-white/10 hover:border-white/20"
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-2.5 left-4">
                  <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-2.5 h-2.5" /> BEST VALUE
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-white">{plan.name}</p>
                  <p className="text-2xl font-black text-white mt-0.5">{plan.price}</p>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "text-2xl font-black",
                    plan.highlight ? "text-indigo-400" : "text-white"
                  )}>{plan.credits}</div>
                  <div className="text-xs text-muted-foreground">predictions</div>
                </div>
              </div>
              <ul className="space-y-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {error && (
          <div className="mx-6 mb-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
            {error}
          </div>
        )}

        {/* CTA */}
        <div className="px-6 pb-6">
          <button
            onClick={() => handlePurchase(selectedPlan)}
            disabled={paying}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {paying ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            ) : (
              <><Zap className="w-4 h-4" /> Buy {PLANS.find(p => p.id === selectedPlan)?.price} Plan</>
            )}
          </button>
          <p className="text-center text-[10px] text-muted-foreground mt-3">
            Secured by Razorpay · Instant credit delivery
          </p>
        </div>
      </div>
    </div>
  );
}
