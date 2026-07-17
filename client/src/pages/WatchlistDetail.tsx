import { useMemo, useState } from "react";
import { useRoute, Link } from "wouter";
import AppShell from "@/components/AppShell";
import Seo from "@/components/Seo";
import { useWatchlist, useRemoveWatchlistItem, useAddWatchlistItem } from "@/hooks/use-watchlists";
import { useInstruments } from "@/hooks/use-instruments";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError, redirectToLogin } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import { ArrowLeft, Plus, Trash2, TriangleAlert } from "lucide-react";
import OrderTicketDialog from "@/components/OrderTicketDialog";

function fmt(n: any) {
  if (n == null) return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(num);
}

export default function WatchlistDetail() {
  const { toast } = useToast();
  const [, params] = useRoute("/app/watchlists/:id");
  const id = params?.id ? Number(params.id) : undefined;

  const wl = useWatchlist(id);
  const remove = useRemoveWatchlistItem();
  const add = useAddWatchlistItem();

  const instruments = useInstruments({ q: "" });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ itemId: number; symbol: string } | null>(null);

  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>("");
  const [filter, setFilter] = useState("");

  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketInstrument, setTicketInstrument] = useState<any>(null);

  const items = useMemo(() => {
    const data = wl.data as any;
    const list = data?.items ?? [];
    const s = filter.trim().toLowerCase();
    if (!s) return list;
    return list.filter((x: any) => {
      const sym = String(x?.instrument?.symbol ?? "").toLowerCase();
      const name = String(x?.instrument?.name ?? "").toLowerCase();
      return sym.includes(s) || name.includes(s);
    });
  }, [wl.data, filter]);

  async function onAdd() {
    if (!id) return;
    try {
      await add.mutateAsync({ watchlistId: id, instrumentId: Number(selectedInstrumentId) } as any);
      toast({ title: "Added", description: "Instrument added to watchlist." });
      setSelectedInstrumentId("");
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (isUnauthorizedError(err)) return redirectToLogin(toast as any);
      toast({ title: "Couldn’t add item", description: err.message, variant: "destructive" as any });
    }
  }

  async function onRemoveConfirm() {
    if (!id || !removeTarget) return;
    try {
      await remove.mutateAsync({ watchlistId: id, itemId: removeTarget.itemId });
      toast({ title: "Removed", description: `${removeTarget.symbol} removed.` });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (isUnauthorizedError(err)) return redirectToLogin(toast as any);
      toast({ title: "Couldn’t remove item", description: err.message, variant: "destructive" as any });
    } finally {
      setConfirmOpen(false);
      setRemoveTarget(null);
    }
  }

  const title = (wl.data as any)?.name ?? "Watchlist";

  return (
    <AppShell
      title={title}
      subtitle="Add instruments, track price moves, and fire a paper order in one motion."
    >
      <Seo title={`${title} • Watchlists • HTC Trade`} description="Watchlist details and items." />

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/app/watchlists"
          data-testid="watchlist-back"
          className="
            inline-flex items-center gap-2 text-sm font-semibold text-primary
            hover:underline underline-offset-4
          "
        >
          <ArrowLeft className="h-4 w-4" />
          Back to watchlists
        </Link>

        <Link
          href="/app/orders/new"
          data-testid="watchlist-new-order"
          className="
            inline-flex items-center justify-center
            rounded-2xl px-4 py-2.5 text-sm font-semibold
            bg-gradient-to-r from-primary to-primary/85
            text-primary-foreground
            shadow-lg shadow-primary/20
            hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5
            active:translate-y-0
            transition-all duration-300 ease-out
          "
        >
          Place order
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-5 lg:gap-7">
        <section className="glass rounded-3xl border border-border/60 p-4 sm:p-5 shadow-luxe">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Input
                data-testid="watchlist-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by symbol or name…"
                className="rounded-2xl bg-background/50"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {(wl.data as any)?.items?.length ?? 0} items
            </div>
          </div>

          <div className="mt-4">
            {wl.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-2xl" />
                ))}
              </div>
            ) : wl.isError ? (
              <EmptyState
                data-testid="watchlist-error"
                icon={<TriangleAlert className="h-6 w-6 text-destructive" />}
                title="Couldn’t load watchlist"
                description="The watchlist may not exist yet, or the backend route isn’t wired."
                action={
                  <Button type="button" onClick={() => wl.refetch()} data-testid="watchlist-retry" className="rounded-2xl">
                    Retry
                  </Button>
                }
              />
            ) : wl.data == null ? (
              <EmptyState
                data-testid="watchlist-notfound"
                icon={<TriangleAlert className="h-6 w-6 text-destructive" />}
                title="Watchlist not found"
                description="Double-check the URL or return to the list."
                action={
                  <Link
                    href="/app/watchlists"
                    data-testid="watchlist-notfound-back"
                    className="
                      inline-flex items-center justify-center
                      rounded-2xl px-4 py-2.5 text-sm font-semibold
                      bg-background/50 border border-border/70
                      hover:bg-background/70 hover:-translate-y-0.5
                      active:translate-y-0
                      transition-all duration-300 ease-out
                    "
                  >
                    Back
                  </Link>
                }
              />
            ) : items.length === 0 ? (
              <EmptyState
                data-testid="watchlist-empty"
                icon={<Plus className="h-6 w-6 text-primary" />}
                title="No instruments here"
                description="Add a symbol from the panel on the right."
              />
            ) : (
              <div className="space-y-2">
                {items.map((it: any) => {
                  const instrument = it.instrument;
                  const price = it.price;
                  const ch = price?.changeAbs != null ? Number(price.changeAbs) : null;
                  const chPct = price?.changePct != null ? Number(price.changePct) : null;
                  const tone = ch != null ? (ch > 0 ? "text-accent" : ch < 0 ? "text-destructive" : "text-muted-foreground") : "text-muted-foreground";

                  return (
                    <div
                      key={it.id}
                      data-testid={`watchlist-item-${it.id}`}
                      className="
                        group rounded-2xl border border-border/60 bg-background/40 p-3
                        transition-all duration-300 ease-out
                        hover:-translate-y-0.5 hover:shadow-md hover:bg-background/55
                      "
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {instrument?.symbol}{" "}
                            <span className="text-muted-foreground font-normal">• {instrument?.exchange}</span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{instrument?.name}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right mr-2">
                            <div className="text-sm font-semibold">{price?.price != null ? fmt(price.price) : "—"}</div>
                            <div className={`text-xs font-medium ${tone}`}>
                              {ch != null ? `${ch > 0 ? "+" : ""}${fmt(ch)}` : "—"}{" "}
                              <span className="opacity-80">{chPct != null ? `(${chPct > 0 ? "+" : ""}${fmt(chPct)}%)` : ""}</span>
                            </div>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            data-testid={`watchlist-item-trade-${it.id}`}
                            onClick={() => {
                              setTicketInstrument(instrument);
                              setTicketOpen(true);
                            }}
                            className="rounded-xl bg-background/60 border border-border/60 hover:bg-background/75"
                          >
                            Trade
                          </Button>

                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            data-testid={`watchlist-item-remove-${it.id}`}
                            onClick={() => {
                              setRemoveTarget({ itemId: it.id, symbol: instrument?.symbol ?? "Item" });
                              setConfirmOpen(true);
                            }}
                            className="rounded-xl bg-background/60 border border-border/60 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="glass rounded-3xl border border-border/60 p-4 sm:p-5 shadow-luxe">
            <div className="text-sm font-semibold">Add instrument</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Pick from Markets and pin it here.
            </div>

            <div className="mt-4 space-y-3">
              <Select value={selectedInstrumentId} onValueChange={setSelectedInstrumentId}>
                <SelectTrigger data-testid="watchlist-add-select" className="rounded-2xl bg-background/50">
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

              <Button
                type="button"
                data-testid="watchlist-add-submit"
                onClick={onAdd}
                disabled={!selectedInstrumentId || add.isPending}
                className="
                  w-full rounded-2xl
                  bg-gradient-to-r from-primary to-primary/85
                  text-primary-foreground
                  shadow-lg shadow-primary/20
                  hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5
                  active:translate-y-0
                  transition-all duration-300 ease-out
                  disabled:opacity-60 disabled:transform-none
                "
              >
                {add.isPending ? "Adding…" : "Add to watchlist"}
              </Button>

              <Link
                href="/app/markets"
                data-testid="watchlist-open-markets"
                className="
                  inline-flex items-center justify-center w-full
                  rounded-2xl px-4 py-2.5 text-sm font-semibold
                  bg-background/50 border border-border/70
                  hover:bg-background/70 hover:-translate-y-0.5
                  active:translate-y-0
                  transition-all duration-300 ease-out
                "
              >
                Browse markets
              </Link>
            </div>
          </section>

          <section className="glass rounded-3xl border border-border/60 p-4 sm:p-5 shadow-luxe">
            <div className="text-sm font-semibold">Quick notes</div>
            <div className="mt-2 text-sm text-muted-foreground">
              MVP tip: keep reasons for entry/exit next to each symbol (future feature).
            </div>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove from watchlist?"
        description={`This will remove ${removeTarget?.symbol ?? "the item"} from this watchlist.`}
        confirmText={remove.isPending ? "Removing…" : "Remove"}
        confirmVariant="destructive"
        onConfirm={onRemoveConfirm}
        data-testid="watchlist-remove-confirm"
      />

      <OrderTicketDialog
        open={ticketOpen}
        onOpenChange={setTicketOpen}
        defaultPortfolioId={1}
        defaultInstrument={ticketInstrument ?? undefined}
      />
    </AppShell>
  );
}
