import { Link } from "wouter";
import Seo from "@/components/Seo";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Landing() {
  return (
    <div className="min-h-screen bg-mesh grain">
      <Seo
        title="HTC Trade — Premium paper trading, simplified"
        description="A premium fintech-inspired paper trading MVP: watchlists, paper portfolio, orders, news, and AI insights."
      />

      <div className="relative z-10">
        <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div
            className={cn(
              "glass rounded-3xl px-4 sm:px-6 py-4 shadow-luxe",
              "flex items-center justify-between gap-3",
            )}
          >
            <div className="flex items-center gap-3">
              <div className="grid place-items-center h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/18 via-primary/10 to-accent/10 border border-border/60 shadow-sm">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-tight">HTC Trade</div>
                <div className="text-xs text-muted-foreground">Paper trading MVP</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <a
                href="/"
                data-testid="landing-login"
                className="
                  inline-flex items-center justify-center
                  rounded-2xl px-4 py-2.5 text-sm font-semibold
                  bg-gradient-to-r from-primary to-primary/85
                  text-primary-foreground
                  shadow-lg shadow-primary/20
                  border border-primary/30
                  hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5
                  active:translate-y-0
                  transition-all duration-300 ease-out
                  focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20
                "
              >
                Login
              </a>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center">
            <div className="animate-in-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Premium fintech UI • Glass accents • Light & dark
              </div>

              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl leading-[1.02]">
                Paper trade with{" "}
                <span className="text-primary">clarity</span>, not clutter.
              </h1>

              <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl">
                Build watchlists, place paper orders, track P&amp;L, and scan curated news—then ask AI for
                crisp, context-aware insights.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <a
                  href="/"
                  data-testid="landing-cta"
                  className="
                    inline-flex items-center justify-center
                    rounded-2xl px-6 py-3 text-sm font-semibold
                    bg-gradient-to-r from-primary to-primary/85
                    text-primary-foreground
                    shadow-lg shadow-primary/25
                    hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5
                    active:translate-y-0
                    transition-all duration-300 ease-out
                    focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20
                  "
                >
                  Get started (free)
                </a>

                <Link
                  href="/app"
                  data-testid="landing-demo"
                  className="
                    inline-flex items-center justify-center
                    rounded-2xl px-6 py-3 text-sm font-semibold
                    bg-background/50 border border-border/70
                    hover:bg-background/70 hover:-translate-y-0.5
                    active:translate-y-0
                    transition-all duration-300 ease-out
                    focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15
                  "
                >
                  View app shell
                </Link>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: <ShieldCheck className="h-4 w-4 text-accent" />, title: "No real money", desc: "Paper-only execution" },
                  { icon: <TrendingUp className="h-4 w-4 text-primary" />, title: "Fast workflows", desc: "Order ticket + lists" },
                  { icon: <Sparkles className="h-4 w-4 text-chart-4" />, title: "AI insights", desc: "Streaming responses" },
                ].map((f, idx) => (
                  <div
                    key={idx}
                    className="
                      glass rounded-2xl border border-border/60 p-4 shadow-sm
                      transition-all duration-300 ease-out
                      hover:-translate-y-0.5 hover:shadow-md
                    "
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {f.icon}
                      {f.title}
                    </div>
                    <div className="mt-1.5 text-xs text-muted-foreground">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="animate-in-up" style={{ animationDelay: "90ms" }}>
              <div className="glass-strong rounded-[2rem] border border-border/60 shadow-luxe overflow-hidden">
                <div className="p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold tracking-tight">Today</div>
                      <div className="mt-1 text-xs text-muted-foreground">A snapshot of your paper portfolio</div>
                    </div>
                    <span className="rounded-full bg-accent/12 text-accent border border-accent/20 px-3 py-1 text-xs font-semibold">
                      Market open*
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {[
                      { k: "Market value", v: "₹ 12,48,320", tone: "primary" },
                      { k: "Day P&L", v: "+ ₹ 3,240", tone: "good" },
                      { k: "Total P&L", v: "+ ₹ 41,890", tone: "good" },
                      { k: "Cash", v: "₹ 2,10,000", tone: "neutral" },
                    ].map((s) => (
                      <div
                        key={s.k}
                        className={cn(
                           "rounded-2xl border px-4 py-3 shadow-sm bg-background/40 backdrop-blur",
                           "transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md",
                           s.tone === "good"
                             ? "border-accent/20"
                             : s.tone === "primary"
                               ? "border-primary/20"
                               : "border-border/60",
                        )}
                      >
                        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{s.k}</div>
                        <div className="mt-1.5 text-lg font-semibold">{s.v}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-background/30 to-accent/10 p-4">
                    <div className="text-sm font-semibold">HTC AI</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Ask AI for “risk check”, “what moved today?”, or “draft an entry plan”.
                    </div>
                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                      <Link
                        href="/app/insights"
                        data-testid="landing-ai"
                        className="
                          inline-flex items-center justify-center gap-2
                          rounded-2xl px-4 py-2.5 text-sm font-semibold
                          bg-background/60 border border-border/70
                          hover:bg-background/75 hover:-translate-y-0.5
                          active:translate-y-0
                          transition-all duration-300 ease-out
                          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15
                        "
                      >
                        <Sparkles className="h-4 w-4 text-primary" />
                        Open AI Insights
                      </Link>
                      <a
                        href="/"
                        data-testid="landing-login-2"
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
                        Login to start
                      </a>
                    </div>
                  </div>

                  <p className="mt-6 text-xs text-muted-foreground">
                    * Demo indicator. Real market status depends on your backend data source.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="glass rounded-3xl border border-border/60 p-5 shadow-sm animate-float">
                  <div className="text-sm font-semibold">“Less noise, more signal.”</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Designed like a premium fintech—glass, depth, and crisp hierarchy.
                  </div>
                </div>
                <div className="glass rounded-3xl border border-border/60 p-5 shadow-sm">
                  <div className="text-sm font-semibold">Built for MVP speed</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Watchlists • Orders • Learn • News • AI
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="glass rounded-3xl border border-border/60 p-6 sm:p-8 shadow-luxe">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h2 className="text-2xl">Everything you need to practice</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  A tight loop: research → watch → trade → reflect.
                </p>
              </div>
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { t: "Watchlists", d: "Track symbols and price changes." },
                  { t: "Paper portfolio", d: "Allocation + P&L at a glance." },
                  { t: "Orders", d: "Market/Limit/SL, cancel flows." },
                  { t: "Learn", d: "Bite-sized articles for fundamentals." },
                ].map((x) => (
                  <div
                    key={x.t}
                    className="
                      rounded-2xl border border-border/60 bg-background/50 p-4
                      transition-all duration-300 ease-out
                      hover:-translate-y-0.5 hover:shadow-md
                    "
                  >
                    <div className="text-sm font-semibold">{x.t}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{x.d}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                No credit card required • Local Auth • Cookies-based sessions
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  data-testid="landing-github"
                  onClick={() => window.open("https://github.com", "_blank")}
                  className="rounded-2xl"
                >
                  View on GitHub
                </Button>
                <a
                  href="/"
                  data-testid="landing-bottom-login"
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
                  Login
                </a>
              </div>
            </div>
          </div>
        </section>

        <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <div className="text-xs text-muted-foreground/80">
            © {new Date().getFullYear()} HTC Trade. For educational purposes only.
          </div>
        </footer>
      </div>
    </div>
  );
}
