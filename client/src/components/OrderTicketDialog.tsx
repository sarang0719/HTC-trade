import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError, redirectToLogin } from "@/lib/auth-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCreateOrder } from "@/hooks/use-orders";
import { useInstruments } from "@/hooks/use-instruments";
import type { Instrument } from "@shared/schema";
import type { CreateOrderInput } from "@shared/routes";
import { Loader2 } from "lucide-react";

const ticketSchema = z.object({
  portfolioId: z.coerce.number().int().positive(),
  instrumentId: z.coerce.number().int().positive(),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["MARKET", "LIMIT", "STOP_LOSS"]),
  quantity: z.coerce.number().positive(),
  limitPrice: z.coerce.number().optional(),
  stopPrice: z.coerce.number().optional(),
});

function toCreateOrderInput(v: z.infer<typeof ticketSchema>): CreateOrderInput {
  const base: any = {
    userId: "me", // backend should override; kept to satisfy schema if required
    portfolioId: v.portfolioId,
    instrumentId: v.instrumentId,
    side: v.side,
    type: v.type,
    quantity: String(v.quantity),
  };

  if (v.type === "LIMIT") base.limitPrice = v.limitPrice != null ? String(v.limitPrice) : undefined;
  if (v.type === "STOP_LOSS") base.stopPrice = v.stopPrice != null ? String(v.stopPrice) : undefined;
  return base as CreateOrderInput;
}

export default function OrderTicketDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultPortfolioId?: number;
  defaultInstrument?: Pick<Instrument, "id" | "symbol" | "exchange" | "name">;
}) {
  const { toast } = useToast();
  const createOrder = useCreateOrder();
  const instrumentsQuery = useInstruments({ q: "" });

  const [portfolioId, setPortfolioId] = useState<number>(props.defaultPortfolioId ?? 1);
  const [instrumentId, setInstrumentId] = useState<number>(props.defaultInstrument?.id ?? 0);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [type, setType] = useState<"MARKET" | "LIMIT" | "STOP_LOSS">("MARKET");
  const [quantity, setQuantity] = useState<string>("1");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [stopPrice, setStopPrice] = useState<string>("");

  useEffect(() => {
    if (!props.open) return;
    setInstrumentId(props.defaultInstrument?.id ?? instrumentId);
    setPortfolioId(props.defaultPortfolioId ?? portfolioId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);

  const instrumentOptions = useMemo(() => {
    const list = instrumentsQuery.data ?? [];
    const active = list.filter((i) => (i as any).isActive !== false);
    return active;
  }, [instrumentsQuery.data]);

  async function submit() {
    try {
      const parsed = ticketSchema.parse({
        portfolioId,
        instrumentId,
        side,
        type,
        quantity,
        limitPrice: limitPrice ? Number(limitPrice) : undefined,
        stopPrice: stopPrice ? Number(stopPrice) : undefined,
      });

      await createOrder.mutateAsync(toCreateOrderInput(parsed));
      toast({ title: "Order placed", description: "Your paper order is now pending execution." });
      props.onOpenChange(false);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (isUnauthorizedError(err)) return redirectToLogin(toast as any);
      toast({ title: "Couldn’t place order", description: err.message, variant: "destructive" as any });
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        data-testid="order-ticket"
        className="rounded-3xl border-border/70 p-0 overflow-hidden glass-strong shadow-luxe"
      >
        <div className="p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">Order Ticket</DialogTitle>
          </DialogHeader>

          <p className="mt-2 text-sm text-muted-foreground">
            Paper trade with institutional-feeling controls. Validate before you send.
          </p>

          <Separator className="my-5 opacity-70" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="portfolioId">Portfolio ID</Label>
              <Input
                id="portfolioId"
                data-testid="order-portfolio-id"
                value={String(portfolioId)}
                onChange={(e) => setPortfolioId(Number(e.target.value))}
                className="mt-2 rounded-2xl"
                inputMode="numeric"
              />
              <div className="mt-1 text-xs text-muted-foreground">MVP: choose by numeric ID.</div>
            </div>

            <div>
              <Label>Instrument</Label>
              <Select
                value={instrumentId ? String(instrumentId) : ""}
                onValueChange={(v) => setInstrumentId(Number(v))}
              >
                <SelectTrigger data-testid="order-instrument" className="mt-2 rounded-2xl">
                  <SelectValue placeholder={instrumentsQuery.isLoading ? "Loading…" : "Select an instrument"} />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {instrumentOptions.map((i) => (
                    <SelectItem key={(i as any).id} value={String((i as any).id)}>
                      {(i as any).symbol} • {(i as any).exchange} — {(i as any).name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {instrumentsQuery.isError ? (
                <div className="mt-1 text-xs text-destructive">Failed to load instruments.</div>
              ) : null}
            </div>

            <div>
              <Label>Side</Label>
              <Select value={side} onValueChange={(v) => setSide(v as any)}>
                <SelectTrigger data-testid="order-side" className="mt-2 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="BUY">Buy</SelectItem>
                  <SelectItem value="SELL">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger data-testid="order-type" className="mt-2 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="MARKET">Market</SelectItem>
                  <SelectItem value="LIMIT">Limit</SelectItem>
                  <SelectItem value="STOP_LOSS">Stop Loss</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                data-testid="order-quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-2 rounded-2xl"
                inputMode="decimal"
              />
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={type === "LIMIT" ? "" : "opacity-60"}>
                <Label htmlFor="limitPrice">Limit price</Label>
                <Input
                  id="limitPrice"
                  data-testid="order-limit-price"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="mt-2 rounded-2xl"
                  inputMode="decimal"
                  disabled={type !== "LIMIT"}
                  placeholder={type === "LIMIT" ? "e.g., 2435.50" : "Enabled for Limit orders"}
                />
              </div>

              <div className={type === "STOP_LOSS" ? "" : "opacity-60"}>
                <Label htmlFor="stopPrice">Stop price</Label>
                <Input
                  id="stopPrice"
                  data-testid="order-stop-price"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                  className="mt-2 rounded-2xl"
                  inputMode="decimal"
                  disabled={type !== "STOP_LOSS"}
                  placeholder={type === "STOP_LOSS" ? "e.g., 2390.00" : "Enabled for Stop Loss orders"}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => props.onOpenChange(false)}
              data-testid="order-cancel"
              className="rounded-2xl"
            >
              Close
            </Button>

            <Button
              type="button"
              onClick={submit}
              disabled={createOrder.isPending}
              data-testid="order-submit"
              className="
                rounded-2xl px-6
                bg-gradient-to-r from-primary to-primary/85
                text-primary-foreground
                shadow-lg shadow-primary/20
                hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5
                active:translate-y-0
                transition-all duration-300 ease-out
                disabled:opacity-60 disabled:transform-none
              "
            >
              {createOrder.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </span>
              ) : (
                "Place order"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
