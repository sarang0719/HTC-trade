import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import Seo from "@/components/Seo";
import { useConversations, useConversation, useCreateConversation, useDeleteConversation, useStreamAssistantMessage } from "@/hooks/use-ai-chat";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { MessageSquare, Plus, Send, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { useLocation } from "wouter";
import StrategyPanel from "@/components/StrategyPanel";
import SmartAutoPilot from "@/components/SmartAutoPilot";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function niceTime(s: string) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AIInsights() {
  const { toast } = useToast();
  const [, setLoc] = useLocation();

  // Strategy scanner state
  const [scanInput,  setScanInput]    = useState("XAUUSD");
  const [scanTf,     setScanTf]       = useState("15m");
  const [activeSymbol, setActiveSymbol] = useState("XAUUSD");
  const [activeTf,     setActiveTf]     = useState("15m");

  const conversations = useConversations();
  const create = useCreateConversation();
  const del = useDeleteConversation();

  const [activeId, setActiveId] = useState<number | null>(null);
  const active = useConversation(activeId ?? undefined);

  const streamer = useStreamAssistantMessage();

  const [prompt, setPrompt] = useState("");
  const [assistantDraft, setAssistantDraft] = useState("");
  const [userSending, setUserSending] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeId && (conversations.data?.length ?? 0) > 0) {
      setActiveId(conversations.data![0].id);
    }
  }, [conversations.data, activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [active.data, assistantDraft]);

  const messageList = useMemo(() => {
    const conv = active.data as any;
    return (conv?.messages ?? []) as Array<any>;
  }, [active.data]);

  async function newThread() {
    try {
      const created = await create.mutateAsync("HTC AI");
      setActiveId(created.id);
      toast({ title: "New thread created", description: "Ask anything about risk, markets, or your plan." });
    } catch (e) {
      toast({ title: "Couldn’t create thread", description: (e as Error).message, variant: "destructive" as any });
    }
  }

  async function send() {
    if (!activeId) {
      await newThread();
      return;
    }
    const content = prompt.trim();
    if (!content) return;

    setUserSending(true);
    setAssistantDraft("");

    try {
      // optimistic: add draft message by navigating to same thread (backend stores user msg)
      setPrompt("");

      await streamer.mutateAsync({
        conversationId: activeId,
        content,
        onDelta: (d) => setAssistantDraft((prev) => `${prev}${d}`),
      });

      // refresh messages already handled by hook onSuccess
    } catch (e) {
      toast({ title: "Send failed", description: (e as Error).message, variant: "destructive" as any });
    } finally {
      setUserSending(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await del.mutateAsync(deleteTarget);
      toast({ title: "Thread deleted", description: "Conversation removed." });
      if (activeId === deleteTarget) {
        setActiveId(null);
        setLoc("/app/insights");
      }
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" as any });
    } finally {
      setConfirmOpen(false);
      setDeleteTarget(null);
    }
  }

  return (
    <AppShell title="AI Insights" subtitle="HTC AI: streaming answers that stay useful, not verbose.">
      <Seo title="AI Insights • HTC Trade" description="Streaming AI chat for market and portfolio insights." />

      <div className="space-y-6">
        <SmartAutoPilot />

        {/* ─── QUANTEDGE V12.1 · SMC Scanner ─── */}
        <div className="glass rounded-3xl border border-border/60 p-5 shadow-luxe">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base font-bold">⚡ QUANTEDGE V12.1 · SMC Scanner</span>
            <span className="text-[10px] uppercase tracking-widest bg-primary/20 text-primary px-2 py-0.5 rounded-full">AI Strategy</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <Input
              value={scanInput}
              onChange={e => setScanInput(e.target.value.toUpperCase())}
              placeholder="Symbol e.g. XAUUSD"
              className="rounded-2xl bg-background/50 font-mono"
              onKeyDown={e => { if (e.key === "Enter") { setActiveSymbol(scanInput); setActiveTf(scanTf); } }}
            />
            <Select value={scanTf} onValueChange={setScanTf}>
              <SelectTrigger className="rounded-2xl bg-background/50 w-36 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["1m","5m","15m","1h","4h","1d","1w"].map(tf => (
                  <SelectItem key={tf} value={tf}>{tf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => { setActiveSymbol(scanInput); setActiveTf(scanTf); }}
              className="rounded-2xl bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-md"
            >
              Scan
            </Button>
          </div>
          <StrategyPanel symbol={activeSymbol} interval={activeTf} />
        </div>

        {/* ─── Threads grid ─── */}
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5 lg:gap-7">
        <aside className="glass rounded-3xl border border-border/60 p-4 sm:p-5 shadow-luxe">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Threads</div>
            <Button
              type="button"
              size="sm"
              data-testid="ai-new-thread"
              onClick={newThread}
              className="
                rounded-2xl
                bg-gradient-to-r from-primary to-primary/85
                text-primary-foreground
                shadow-md shadow-primary/20
                hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5
                active:translate-y-0
                transition-all duration-300 ease-out
              "
            >
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>

          <div className="mt-4">
            {conversations.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-2xl" />
                ))}
              </div>
            ) : conversations.isError ? (
              <EmptyState
                data-testid="ai-conversations-error"
                icon={<TriangleAlert className="h-6 w-6 text-destructive" />}
                title="Couldn’t load threads"
                description="Check /api/conversations backend routes."
              />
            ) : (conversations.data ?? []).length === 0 ? (
              <EmptyState
                data-testid="ai-conversations-empty"
                icon={<Sparkles className="h-6 w-6 text-primary" />}
                title="No threads yet"
                description="Create your first insight thread and start asking."
                action={
                  <Button type="button" onClick={newThread} data-testid="ai-empty-create" className="rounded-2xl">
                    Create thread
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2">
                {(conversations.data ?? []).map((c) => {
                  const active = activeId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      data-testid={`ai-thread-${c.id}`}
                      onClick={() => setActiveId(c.id)}
                      className={cn(
                        "w-full text-left rounded-2xl border p-3 transition-all duration-300 ease-out",
                        "hover:-translate-y-0.5 hover:shadow-md",
                        active
                          ? "border-primary/30 bg-primary/10"
                          : "border-border/60 bg-background/40 hover:bg-background/55",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{c.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{niceTime(c.createdAt)}</div>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          data-testid={`ai-thread-delete-${c.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(c.id);
                            setConfirmOpen(true);
                          }}
                          className="rounded-xl bg-background/60 border border-border/60 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="glass rounded-3xl border border-border/60 shadow-luxe overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border/60 bg-background/30">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  {activeId ? `Thread #${activeId}` : "No thread selected"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Tip: ask for checklists, risk framing, or a brief summary.
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                data-testid="ai-suggest"
                onClick={() => setPrompt("Scan my portfolio for concentration risk and suggest 3 improvements. Keep it concise.")}
                className="rounded-2xl"
              >
                Suggest a prompt
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[56vh] md:h-[62vh]">
            <div className="p-4 sm:p-5 space-y-3">
              {active.isLoading && activeId ? (
                <div className="space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className={cn("h-12 rounded-2xl", i % 2 ? "w-2/3" : "w-4/5")} />
                  ))}
                </div>
              ) : active.isError ? (
                <EmptyState
                  data-testid="ai-thread-error"
                  icon={<TriangleAlert className="h-6 w-6 text-destructive" />}
                  title="Couldn’t load messages"
                  description="Check /api/conversations/:id backend route."
                />
              ) : !activeId ? (
                <EmptyState
                  data-testid="ai-thread-none"
                  icon={<Sparkles className="h-6 w-6 text-primary" />}
                  title="Pick a thread"
                  description="Create or select a thread to start asking questions."
                  action={
                    <Button type="button" onClick={newThread} data-testid="ai-thread-none-new" className="rounded-2xl">
                      Create thread
                    </Button>
                  }
                />
              ) : (
                <>
                  {messageList.map((m) => {
                    const isUser = m.role === "user";
                    return (
                      <div
                        key={m.id}
                        data-testid={`ai-msg-${m.id}`}
                        className={cn("flex", isUser ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[92%] sm:max-w-[78%] rounded-3xl border px-4 py-3 shadow-sm",
                            "transition-all duration-300 ease-out",
                            isUser
                              ? "bg-primary/12 border-primary/20"
                              : "bg-background/45 border-border/60",
                          )}
                        >
                          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                            {isUser ? "You" : "HTC AI"}
                          </div>
                          <div className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                            {m.content}
                          </div>
                          <div className="mt-2 text-[11px] text-muted-foreground">
                            {niceTime(m.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {assistantDraft ? (
                    <div data-testid="ai-assistant-draft" className="flex justify-start">
                      <div className="max-w-[92%] sm:max-w-[78%] rounded-3xl border border-border/60 bg-background/45 px-4 py-3 shadow-sm">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          HTC AI (streaming)
                        </div>
                        <div className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{assistantDraft}</div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          Generating…
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div ref={bottomRef} />
                </>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 sm:p-5 border-t border-border/60 bg-background/30">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                data-testid="ai-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask about risk, setups, market themes…"
                className="rounded-2xl bg-background/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
                }}
              />

              <Button
                type="button"
                data-testid="ai-send"
                onClick={send}
                disabled={userSending || streamer.isPending || prompt.trim().length === 0}
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
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              Tip: Press <span className="font-semibold">Ctrl/⌘ + Enter</span> to send.
            </div>
          </div>
        </section>
        </div>{/* end threads grid */}
      </div>{/* end space-y-6 */}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this thread?"
        description="This will delete the conversation and its messages."
        confirmText={del.isPending ? "Deleting…" : "Delete"}
        confirmVariant="destructive"
        onConfirm={confirmDelete}
        data-testid="ai-delete-confirm"
      />
    </AppShell>
  );
}
