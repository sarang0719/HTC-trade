import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Seo from "@/components/Seo";
import { useInstruments } from "@/hooks/use-instruments";
import { useCreateOrder } from "@/hooks/use-orders";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError, redirectToLogin } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import type { CreateOrderInput } from "@shared/routes";
import { z } from "zod";

const schema = z.object({
  portfolioId: z.coerce.number().int().positive(),
  instrumentId: z.coerce.number().int().positive(),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["MARKET", "LIMIT", "STOP_LOSS"]),
  quantity: z.coerce.number().positive(),
  limitPrice: z.coerce.number().optional(),
  stopPrice: z.coerce.number().optional(),
});

function toInput(v: z.infer<typeof schema>): CreateOrderInput {
  const base: any = {
    userId: "me",
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

export default function NewOrder() {
  const { toast } = useToast();
  const [, setLoc] = useLocation();

  const instruments = useInstruments({ q: "" });
  const create = useCreateOrder();

  const [portfolioId, setPortfolioId] = useState("1");
  const [instrumentId, setInstrumentId] = useState("");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [type, setType] = useState<"MARKET" | "LIMIT" | "STOP_LOSS">("MARKET");
  const [quantity, setQuantity] = useState("1");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");

  const selected = useMemo(() => {
    const id = Number(instrumentId);
    if (!id) return null;
    return (instruments.data ?? []).find((x: any) => x.id === id) ?? null;
  }, [instrumentId, instruments.data]);

  useEffect(() => {
    if (type !== "LIMIT") setLimitPrice("");
    if (type !== "STOP_LOSS") setStopPrice("");
  }, [type]);

  async function submit() {
    try {
      const parsed = schema.parse({
        portfolioId,
        instrumentId,
        side,
        type,
        quantity,
        limitPrice: limitPrice ? Number(limitPrice) : undefined,
        stopPrice: stopPrice ? Number(stopPrice) : undefined,
      });

      await create.mutateAsync(toInput(parsed));
      toast({ title: "Order placed", description: "Your order is now pending." });
      setLoc("/app/orders");
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (isUnauthorizedError(err)) return redirectToLogin(toast as any);
      toast({ title: "Couldn’t place order", description: err.message, variant: "destructive" as any });
    }
  }

  return (
    <AppShell title="New Order" subtitle="A clean ticket for fast paper execution.">
      <Seo title="New Order • HTC Trade" description="Create a new paper trading order." />

      <div className="mb-4">
        <Link
          href="/app/orders"
          data-testid="neworder-back"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline underline-offset-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to orders
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5 lg:gap-7">
        <section className="glass rounded-3xl border border-border/60 p-5 sm:p-6 shadow-luxe">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl">Ticket</h2>
              <p className="mt-1 text-sm text-muted-foreground">Market, Limit or Stop Loss. Crisp validation.</p>
            </div>
            <Link
              href="/app/insights"
              data-testid="neworder-ai"
              className="
                hidden sm:inline-flex items-center gap-2
                rounded-2xl px-4 py-2.5 text-sm font-semibold
                bg-background/50 border border-border/70
                hover:bg-background/70 hover:-translate-y-0.5
                active:translate-y-0
                transition-all duration-300 ease-out
              "
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Ask AI
            </Link>
          </div>

          <Separator className="my-5 opacity-70" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="portfolioId">Portfolio ID</Label>
              <Input
                id="portfolioId"
                data-testid="neworder-portfolio"
                value={portfolioId}
                onChange={(e) => setPortfolioId(e.target.value)}
                className="mt-2 rounded-2xl"
                inputMode="numeric"
              />
            </div>

            <div>
              <Label>Instrument</Label>
              <Select value={instrumentId} onValueChange={setInstrumentId}>
                <SelectTrigger data-testid="neworder-instrument" className="mt-2 rounded-2xl">
                  <SelectValue placeholder={instruments.isLoading ? "Loading…" : "Select an instrument"} />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {(instruments.data ?? []).map((i: any) => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.symbol} • {i.exchange} — {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {instruments.isError ? <div className="mt-1 text-xs text-destructive">Failed to load instruments</div> : null}
            </div>

            <div>
              <Label>Side</Label>
              <Select value={side} onValueChange={(v) => setSide(v as any)}>
                <SelectTrigger data-testid="neworder-side" className="mt-2 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="BUY">Buy</SelectItem>
                  <SelectItem value="SELL">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Order type</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger data-testid="neworder-type" className="mt-2 rounded-2xl">
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
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                data-testid="neworder-qty"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-2 rounded-2xl"
                inputMode="decimal"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2">
              <div className={type === "LIMIT" ? "" : "opacity-60"}>
                <Label htmlFor="limit">Limit price</Label>
                <Input
                  id="limit"
                  data-testid="neworder-limit"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="mt-2 rounded-2xl"
                  inputMode="decimal"
                  disabled={type !== "LIMIT"}
                  placeholder={type === "LIMIT" ? "e.g., 123.45" : "Enabled for Limit"}
                />
              </div>

              <div className={type === "STOP_LOSS" ? "" : "opacity-60"}>
                <Label htmlFor="stop">Stop price</Label>
                <Input
                  id="stop"
                  data-testid="neworder-stop"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                  className="mt-2 rounded-2xl"
                  inputMode="decimal"
                  disabled={type !== "STOP_LOSS"}
                  placeholder={type === "STOP_LOSS" ? "e.g., 120.00" : "Enabled for SL"}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              data-testid="neworder-cancel"
              onClick={() => setLoc("/app/orders")}
              className="rounded-2xl"
            >
              Cancel
            </Button>

            <Button
              type="button"
              data-testid="neworder-submit"
              onClick={submit}
              disabled={create.isPending || !instrumentId}
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
              {create.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Placing…
                </span>
              ) : (
                "Place order"
              )}
            </Button>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="glass rounded-3xl border border-border/60 p-5 sm:p-6 shadow-luxe">
            <div className="text-sm font-semibold">Preview</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Confirm the essentials before you send.
            </div>

            {selected ? (
              <div className="mt-4 rounded-2xl border border-border/60 bg-background/45 p-4">
                <div className="text-sm font-semibold">
                  {selected.symbol} <span className="text-muted-foreground font-normal">• {selected.exchange}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{selected.name}</div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-border/60 bg-background/55 p-2.5">
                    <div className="text-muted-foreground">Side</div>
                    <div className="mt-1 font-semibold">{side}</div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/55 p-2.5">
                    <div className="text-muted-foreground">Type</div>
                    <div className="mt-1 font-semibold">{type}</div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/55 p-2.5">
                    <div className="text-muted-foreground">Qty</div>
                    <div className="mt-1 font-semibold">{quantity}</div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/55 p-2.5">
                    <div className="text-muted-foreground">Portfolio</div>
                    <div className="mt-1 font-semibold">{portfolioId}</div>
                  </div>
                </div>
              </div>
            ) : instruments.isLoading ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </div>
            ) : instruments.isError ? (
              <EmptyState
                data-testid="neworder-preview-error"
                icon={<TriangleAlert className="h-6 w-6 text-destructive" />}
                title="Preview unavailable"
                description="Instruments list failed to load."
              />
            ) : (
              <div className="mt-4 rounded-2xl border border-border/60 bg-background/45 p-4 text-sm text-muted-foreground">
                Select an instrument to see a preview.
              </div>
            )}

            <div className="mt-4 text-xs text-muted-foreground">
              Note: If your backend enforces userId, it should override any client value.
            </div>
          </section>

          <section className="glass rounded-3xl border border-border/60 p-5 sm:p-6 shadow-luxe">
            <div className="text-sm font-semibold">Validation rules</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Quantity must be positive. Limit/stop fields apply only to the selected order type.
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
