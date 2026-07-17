import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function GradientCard(props: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  tone?: "primary" | "accent" | "neutral";
  "data-testid"?: string;
}) {
  const tone = props.tone ?? "neutral";

  const grad =
    tone === "primary"
      ? "from-primary/18 via-primary/8 to-transparent"
      : tone === "accent"
        ? "from-accent/16 via-accent/8 to-transparent"
        : "from-foreground/6 via-foreground/3 to-transparent";

  return (
    <section
      data-testid={props["data-testid"]}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/60 shadow-luxe",
        "glass",
      )}
    >
      <div className={cn("absolute inset-0 opacity-90 bg-gradient-to-br", grad)} />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start gap-3">
          {props.icon ? (
            <div className="grid place-items-center h-10 w-10 rounded-2xl bg-background/60 border border-border/70 shadow-sm">
              {props.icon}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl">{props.title}</h2>
            {props.subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{props.subtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-5">{props.children}</div>
      </div>
    </section>
  );
}
