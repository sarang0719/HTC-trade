import { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ConfirmDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "default" | "destructive";
  onConfirm: () => void;
  icon?: ReactNode;
  "data-testid"?: string;
}) {
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent data-testid={props["data-testid"]} className="rounded-3xl border-border/70">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">{props.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {props.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel className="rounded-2xl">{
            props.cancelText ?? "Cancel"
          }</AlertDialogCancel>
          <AlertDialogAction
            onClick={props.onConfirm}
            className={
              props.confirmVariant === "destructive"
                ? "rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
            }
          >
            {props.confirmText ?? "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
