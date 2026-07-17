import { Link, useRoute } from "wouter";
import AppShell from "@/components/AppShell";
import Seo from "@/components/Seo";
import { useLearnDetail } from "@/hooks/use-learn";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/EmptyState";
import { ArrowLeft, BookOpen, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

function renderMarkdownish(content: string) {
  // Lightweight formatting: preserve paragraphs + lists.
  const lines = content.split("\n");
  const blocks: Array<{ type: "p" | "li" | "h"; text: string }> = [];

  for (const raw of lines) {
    const t = raw.trim();
    if (!t) continue;
    if (t.startsWith("#")) blocks.push({ type: "h", text: t.replace(/^#+\s*/, "") });
    else if (t.startsWith("- ")) blocks.push({ type: "li", text: t.slice(2) });
    else blocks.push({ type: "p", text: t });
  }

  return blocks;
}

export default function LearnDetail() {
  const [, params] = useRoute("/app/learn/:id");
  const id = params?.id ? Number(params.id) : undefined;
  const q = useLearnDetail(id);

  const a: any = q.data;

  return (
    <AppShell
      title={a?.title ?? "Learn"}
      subtitle="A quiet reading space for fundamentals and frameworks."
    >
      <Seo
        title={`${a?.title ?? "Learn"} • HTC Trade`}
        description={a?.title ? `Learn: ${a.title}` : "Learn article"}
      />

      <div className="mb-4">
        <Link
          href="/app/learn"
          data-testid="learn-detail-back"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline underline-offset-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Learn
        </Link>
      </div>

      {q.isLoading ? (
        <div className="glass rounded-3xl border border-border/60 p-6 sm:p-8 shadow-luxe">
          <Skeleton className="h-10 w-2/3 rounded-2xl" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
          <div className="mt-8 space-y-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-5 rounded-xl" />
            ))}
          </div>
        </div>
      ) : q.isError ? (
        <EmptyState
          data-testid="learn-detail-error"
          icon={<TriangleAlert className="h-6 w-6 text-destructive" />}
          title="Couldn’t load article"
          description="The article may not exist yet."
        />
      ) : q.data == null ? (
        <EmptyState
          data-testid="learn-detail-notfound"
          icon={<TriangleAlert className="h-6 w-6 text-destructive" />}
          title="Article not found"
          description="Return to the list and choose a different article."
          action={
            <Link
              href="/app/learn"
              data-testid="learn-detail-notfound-back"
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
      ) : (
        <article className="glass rounded-3xl border border-border/60 p-6 sm:p-8 shadow-luxe">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl leading-tight">{a.title}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-border/60 bg-background/50 px-3 py-1.5 font-semibold text-muted-foreground">
                  {a.level}
                </span>
                <span className="rounded-full border border-border/60 bg-background/50 px-3 py-1.5 font-semibold text-muted-foreground">
                  {a.category}
                </span>
              </div>
            </div>

            <div className="hidden sm:grid place-items-center h-12 w-12 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/15 to-accent/10 shadow-sm">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
          </div>

          <div className="mt-8 prose prose-slate dark:prose-invert max-w-none">
            {(() => {
              const blocks = renderMarkdownish(a.content);
              const hasList = blocks.some((b) => b.type === "li");
              return (
                <>
                  {blocks.map((b, idx) => {
                    if (b.type === "h") return <h3 key={idx}>{b.text}</h3>;
                    if (b.type === "p") return <p key={idx}>{b.text}</p>;
                    return null;
                  })}

                  {hasList ? (
                    <div className="mt-6 rounded-2xl border border-border/60 bg-background/40 p-4">
                      <div className="text-sm font-semibold mb-2">Key takeaways</div>
                      <ul className={cn("list-disc pl-5 space-y-1 text-sm text-muted-foreground")}>
                        {blocks
                          .filter((b) => b.type === "li")
                          .map((b, idx) => (
                            <li key={idx}>{b.text}</li>
                          ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </div>
        </article>
      )}
    </AppShell>
  );
}
