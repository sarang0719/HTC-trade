import AppShell from "@/components/AppShell";
import Seo from "@/components/Seo";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { KeyRound, ShieldCheck } from "lucide-react";

export default function Settings() {
  const { user, logout, isLoggingOut } = useAuth();

  return (
    <AppShell title="Settings" subtitle="Account, sessions and interface preferences.">
      <Seo title="Settings • HTC Trade" description="Account settings and preferences." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7">
        <section className="glass rounded-3xl border border-border/60 p-5 sm:p-6 shadow-luxe">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" />
                Account
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Managed by Local Auth.
              </div>
            </div>

            <a
              href="/api/logout"
              data-testid="settings-logout-link"
              className="hidden"
            >
              Logout
            </a>
          </div>

          <Separator className="my-5 opacity-70" />

          <div className="text-sm">
            <div className="text-muted-foreground">Signed in as</div>
            <div className="mt-1 font-semibold">
              {(user?.firstName || user?.lastName)
                ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
                : "User"}
            </div>
            <div className="mt-1 text-muted-foreground">{user?.email ?? "—"}</div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              onClick={() => logout()}
              disabled={isLoggingOut}
              data-testid="settings-logout"
              className="rounded-2xl"
            >
              {isLoggingOut ? "Logging out…" : "Logout"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              data-testid="settings-login"
              onClick={() => (window.location.href = "/api/login")}
              className="rounded-2xl"
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Re-authenticate
            </Button>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            If you get a 401 on any page, you’ll be redirected to login automatically.
          </div>
        </section>

        <section className="glass rounded-3xl border border-border/60 p-5 sm:p-6 shadow-luxe">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Appearance</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Light and dark themes with glassmorphism.
              </div>
            </div>
            <ThemeToggle />
          </div>

          <Separator className="my-5 opacity-70" />

          <div className="text-sm text-muted-foreground">
            Tip: for best contrast, keep your OS theme synced and toggle here as needed.
          </div>

          <div className="mt-6">
            <Link
              href="/app"
              data-testid="settings-back"
              className="
                inline-flex items-center justify-center
                rounded-2xl px-4 py-2.5 text-sm font-semibold
                bg-background/50 border border-border/70
                hover:bg-background/70 hover:-translate-y-0.5
                active:translate-y-0
                transition-all duration-300 ease-out
              "
            >
              Back to Dashboard
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
