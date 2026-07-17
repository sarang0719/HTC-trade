import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import AuthPage from "@/pages/AuthPage";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeGate() {
  const { isLoading, isAuthenticated } = useAuth();
  const [, setLoc] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) setLoc("/app");
  }, [isLoading, isAuthenticated, setLoc]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mesh grain">
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="glass rounded-3xl border border-border/60 p-6 sm:p-10 shadow-luxe">
            <Skeleton className="h-10 w-1/2 rounded-2xl" />
            <Skeleton className="mt-4 h-6 w-2/3 rounded-xl" />
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
            <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-64 rounded-3xl" />
              <Skeleton className="h-64 rounded-3xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <AuthPage />;

  return null;
}
