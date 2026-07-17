import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Seo from "@/components/Seo";
import { useLearnList } from "@/hooks/use-learn";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/EmptyState";
import { BookOpen, Search, TriangleAlert } from "lucide-react";
import { Link } from "wouter";

export default function Learn() {
  const q = useLearnList();
  const [search, setSearch] = useState("");

  const items = useMemo(() => {
    const list = q.data ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter((a: any) => {
      const t = String(a.title ?? "").toLowerCase();
      const c = String(a.category ?? "").toLowerCase();
      const l = String(a.level ?? "").toLowerCase();
      return t.includes(s) || c.includes(s) || l.includes(s);
    });
  }, [q.data, search]);

  return (
    <AppShell title="Learn" subtitle="Concise, high-signal lessons—built like a premium reading experience.">
      <Seo title="Learn • HTC Trade" description="Learn articles list." />

      <div className="glass rounded-3xl border border-border/60 p-4 sm:p-5 shadow-luxe">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            data-testid="learn-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, category or level…"
            className="pl-10 rounded-2xl bg-background/50"
          />
        </div>

        <div className="mt-4">
          {q.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-[120px] rounded-3xl" />
              ))}
            </div>
          ) : q.isError ? (
            <EmptyState
              data-testid="learn-error"
              icon={<TriangleAlert className="h-6 w-6 text-destructive" />}
              title="Couldn’t load articles"
              description="Check backend routes for /api/learn."
            />
          ) : items.length === 0 ? (
            <EmptyState
              data-testid="learn-empty"
              icon={<BookOpen className="h-6 w-6 text-primary" />}
              title="No articles found"
              description="Try another search or seed the database with learn articles."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {items.map((a: any) => (
                <Link
                  key={a.id}
                  href={`/app/learn/${a.id}`}
                  data-testid={`learn-card-${a.id}`}
                  className="
                    group glass rounded-3xl border border-border/60 p-4 shadow-sm
                    transition-all duration-300 ease-out
                    hover:-translate-y-0.5 hover:shadow-md hover:bg-background/60
                    focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15
                  "
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold line-clamp-2">{a.title}</div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border border-border/60 bg-background/50 px-2.5 py-1 font-semibold">
                          {a.level}
                        </span>
                        <span className="rounded-full border border-border/60 bg-background/50 px-2.5 py-1 font-semibold">
                          {a.category}
                        </span>
                      </div>
                    </div>

                    <div className="h-10 w-10 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/15 to-accent/10 grid place-items-center shadow-sm">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-muted-foreground">
                    Open and read in a distraction-free layout.
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
