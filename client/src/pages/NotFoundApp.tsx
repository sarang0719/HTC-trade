import { Link } from "wouter";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { FileX } from "lucide-react";

export default function NotFoundApp() {
  return (
    <div className="min-h-screen bg-mesh grain">
      <Seo title="404 • HTC Trade" description="Page not found." />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="glass-strong rounded-3xl border border-border/60 p-8 sm:p-10 shadow-luxe text-center">
          <div className="mx-auto grid place-items-center h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 border border-border/60 shadow-sm">
            <FileX className="h-6 w-6 text-primary" />
          </div>
          <h1 className="mt-5 text-3xl sm:text-4xl">Page not found</h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">
            The page you’re looking for doesn’t exist. Return to safety.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              data-testid="notfound-home"
              className="
                inline-flex items-center justify-center
                rounded-2xl px-5 py-3 text-sm font-semibold
                bg-gradient-to-r from-primary to-primary/85
                text-primary-foreground
                shadow-lg shadow-primary/20
                hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5
                active:translate-y-0
                transition-all duration-300 ease-out
              "
            >
              Go to Home
            </Link>

            <Button
              type="button"
              variant="secondary"
              data-testid="notfound-login"
              onClick={() => (window.location.href = "/")}
              className="rounded-2xl"
            >
              Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
