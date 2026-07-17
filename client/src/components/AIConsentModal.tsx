import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Bot, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AIConsentModal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Show modal if the user is authenticated but hasn't made a choice yet
    if (user && user.autoTradeEnabled === null) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("POST", "/api/settings/ai-trade", { enabled });
      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.setQueryData(["/api/user"], (old: any) => ({
        ...old,
        autoTradeEnabled: enabled,
      }));
      setOpen(false);
      toast({
         title: enabled ? "AI Auto-Pilot Enabled" : "AI Auto-Pilot Disabled",
         description: enabled ? "The QUANTEDGE V12.1 · SMC bot will now trade for you in the background." : "You can always enable it later from the AI Insights dashboard."
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(val) => {
       // Prevent closing by clicking outside if they haven't decided
       if (!val && user?.autoTradeEnabled === null) return;
       setOpen(val);
    }}>
      <DialogContent className="sm:max-w-xl glass rounded-3xl border-border/60 shadow-luxe p-6 sm:p-8">
        <DialogHeader className="mb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]">
            <Bot className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl text-center mb-2">QUANTEDGE V12.1 · SMC Institutional AI</DialogTitle>
          <DialogDescription className="text-center text-base">
            We have integrated a state-of-the-art algorithmic trading bot capable of placing high-probability <strong>Buy</strong> and <strong>Sell</strong> trades entirely in the background. 
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mb-8">
          <div className="bg-background/40 border border-border/50 rounded-2xl p-4 flex gap-4 items-start">
             <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
             <div className="text-sm text-muted-foreground">
               <strong className="text-foreground block mb-1">Fully Automated Execution</strong>
               If enabled, the AI engine scans major crypto pairs every 30 seconds for institutional confluences (such as Order Blocks, FVG, EMA crosses). Once a 9/10 signal is identified, it places an automatic 1-minute time-trade using a fixed $25 slice.
             </div>
          </div>
          
          <div className="bg-background/40 border border-border/50 rounded-2xl p-4 flex gap-4 items-start">
             <AlertTriangle className="w-6 h-6 text-orange-400 shrink-0 mt-0.5" />
             <div className="text-sm text-muted-foreground">
               <strong className="text-foreground block mb-1">Risk Management Protocols</strong>
               The bot is bound by a strict <strong>5-Loss Circuit Breaker</strong>. It will automatically halt trading if consecutive trades hit the daily limits, preserving capital during high-volatility events.
             </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-center">
          <Button 
             variant="outline" 
             disabled={mutation.isPending}
             onClick={() => mutation.mutate(false)}
             className="rounded-2xl h-12 px-6 flex-1 border-muted hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-all"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Deny Access
          </Button>
          <Button 
             disabled={mutation.isPending}
             onClick={() => mutation.mutate(true)}
             className="rounded-2xl h-12 px-6 flex-1 bg-gradient-to-r from-primary to-primary/80 shadow-lg hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
          >
             <Bot className="w-4 h-4 mr-2" />
             Allow Auto-Trade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
