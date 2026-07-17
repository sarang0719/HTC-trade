import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function EmptyState(props: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  "data-testid"?: string;
}) {
  return (
    <div
      data-testid={props["data-testid"]}
      className={cn(
        "glass rounded-3xl p-8 sm:p-10 text-center shadow-luxe",
        "border border-border/60",
      )}
    >
      <div className="mx-auto grid place-items-center h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 border border-border/60 shadow-sm">
        {props.icon}
      </div>
      <h3 className="mt-4 text-xl sm:text-2xl">{props.title}</h3>
      <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-md mx-auto">{props.description}</p>
      {props.action ? <div className="mt-6 flex justify-center">{props.action}</div> : null}
    </div>
  );
}
