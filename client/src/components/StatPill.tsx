import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function StatPill(props: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "neutral" | "good" | "bad" | "primary";
  "data-testid"?: string;
}) {
  const tone = props.tone ?? "neutral";

  const toneCls =
    tone === "good"
      ? "bg-accent/12 text-accent border-accent/20"
      : tone === "bad"
        ? "bg-destructive/12 text-destructive border-destructive/20"
        : tone === "primary"
          ? "bg-primary/12 text-primary border-primary/20"
          : "bg-muted/60 text-foreground border-border/60";

  return (
    <div
      data-testid={props["data-testid"]}
      className={cn(
        "rounded-2xl border px-4 py-3 shadow-sm backdrop-blur",
        "transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md",
        toneCls,
      )}
    >
      <div className="text-[11px] uppercase tracking-[0.14em] opacity-80">{props.label}</div>
      <div className="mt-1.5 text-lg font-semibold leading-none">{props.value}</div>
      {props.hint ? <div className="mt-1 text-xs text-muted-foreground">{props.hint}</div> : null}
    </div>
  );
}
