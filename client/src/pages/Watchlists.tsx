import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Seo from "@/components/Seo";
import { useWatchlists, useCreateWatchlist } from "@/hooks/use-watchlists";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError, redirectToLogin } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Activity, ArrowRight, Plus, Search, TriangleAlert } from "lucide-react";
import EmptyState from "@/components/EmptyState";

export default function Watchlists() {
  const { toast } = useToast();
  const q = useWatchlists();
  const create = useCreateWatchlist();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");

  const items = useMemo(() => {
    const list = Array.isArray(q.data) ? q.data : [];
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter((w) => String(w.name).toLowerCase().includes(s));
  }, [q.data, search]);

  async function onCreate() {
    try {
      await create.mutateAsync({ userId: "me" as any, name } as any);
      toast({ title: "Watchlist created", description: `“${name}” is ready.` });
      setName("");
      setOpen(false);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (isUnauthorizedError(err)) return redirectToLogin(toast as any);
      toast({ title: "Couldn’t create watchlist", description: err.message, variant: "destructive" as any });
    }
  }

  return (
    <AppShell title="Watchlists" subtitle="Build focused lists and keep your best setups close.">
      <Seo title="Watchlists • HTC Trade" description="Create, browse and manage watchlists." />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start">
        <div className="glass rounded-3xl border border-border/60 p-4 sm:p-5 shadow-luxe">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="watchlists-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search watchlists…"
                className="pl-10 rounded-2xl bg-background/50"
              />
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  data-testid="watchlists-create-open"
                  className="
                    rounded-2xl
                    bg-gradient-to-r from-primary to-primary/85
                    text-primary-foreground
                    shadow-lg shadow-primary/20
                    hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5
                    active:translate-y-0
                    transition-all duration-300 ease-out
                  "
                  onClick={() => setOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl border-border/70 glass-strong shadow-luxe">
                <DialogHeader>
                  <DialogTitle className="text-2xl">New watchlist</DialogTitle>
                </DialogHeader>
                <div className="mt-2">
                  <Label htmlFor="wlName">Name</Label>
                  <Input
                    id="wlName"
                    data-testid="watchlists-create-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Breakouts, Long-term, Earnings"
                    className="mt-2 rounded-2xl"
                  />
                </div>
                <div className="mt-5 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    data-testid="watchlists-create-cancel"
                    onClick={() => setOpen(false)}
                    className="rounded-2xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    data-testid="watchlists-create-submit"
                    onClick={onCreate}
                    disabled={create.isPending || name.trim().length < 2}
                    className="
                      rounded-2xl
                      bg-gradient-to-r from-primary to-primary/85
                      text-primary-foreground
                      shadow-lg shadow-primary/20
                      hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5
                      active:translate-y-0
                      transition-all duration-300 ease-out
                      disabled:opacity-60 disabled:transform-none
                    "
                  >
                    {create.isPending ? "Creating…" : "Create watchlist"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mt-4">
            {q.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-2xl" />
                ))}
              </div>
            ) : q.isError ? (
              <EmptyState
                data-testid="watchlists-error"
                icon={<TriangleAlert className="h-6 w-6 text-destructive" />}
                title="Couldn’t load watchlists"
                description="Try again, or check if the backend routes are registered."
                action={
                  <Button type="button" onClick={() => q.refetch()} data-testid="watchlists-retry" className="rounded-2xl">
                    Retry
                  </Button>
                }
              />
            ) : items.length === 0 ? (
              <EmptyState
                data-testid="watchlists-empty"
                icon={<Activity className="h-6 w-6 text-primary" />}
                title="No watchlists yet"
                description="Create your first list and start curating symbols that match your strategy."
                action={
                  <Button
                    type="button"
                    onClick={() => setOpen(true)}
                    data-testid="watchlists-empty-create"
                    className="rounded-2xl"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create watchlist
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {items.map((w: any) => (
                  <Link
                    key={w.id}
                    href={`/app/watchlists/${w.id}`}
                    data-testid={`watchlists-card-${w.id}`}
                    className="
                      group glass rounded-3xl border border-border/60 p-4 shadow-sm
                      transition-all duration-300 ease-out
                      hover:-translate-y-0.5 hover:shadow-md hover:bg-background/60
                      focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15
                    "
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{w.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{w.itemCount} instruments</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5" />
                    </div>

                    <div className="mt-4 rounded-2xl border border-border/60 bg-background/35 px-3 py-2 text-xs text-muted-foreground">
                      Tip: add symbols from <span className="text-foreground font-medium">Markets</span>.
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="glass rounded-3xl border border-border/60 p-4 sm:p-5 shadow-luxe lg:w-[320px]">
          <div className="text-sm font-semibold">Workflow</div>
          <div className="mt-2 text-sm text-muted-foreground space-y-2">
            <div>1) Search instruments in Markets</div>
            <div>2) Add to a watchlist</div>
            <div>3) Place a paper order</div>
            <div>4) Review P&amp;L in Dashboard</div>
          </div>
          <div className="mt-4">
            <Link
              href="/app/markets"
              data-testid="watchlists-go-markets"
              className="
                inline-flex items-center justify-center w-full
                rounded-2xl px-4 py-2.5 text-sm font-semibold
                bg-background/50 border border-border/70
                hover:bg-background/70 hover:-translate-y-0.5
                active:translate-y-0
                transition-all duration-300 ease-out
              "
            >
              Go to Markets
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
