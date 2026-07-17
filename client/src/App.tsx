import React, { Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import AIConsentModal from "@/components/AIConsentModal";
import { Loader2 } from "lucide-react";

// Code Splitting - Lazy Load Pages
const NotFound = React.lazy(() => import("@/pages/not-found"));
const HomeGate = React.lazy(() => import("@/pages/HomeGate"));
const AppIndex = React.lazy(() => import("@/pages/AppIndex"));
const Watchlists = React.lazy(() => import("@/pages/Watchlists"));
const WatchlistDetail = React.lazy(() => import("@/pages/WatchlistDetail"));
const Markets = React.lazy(() => import("@/pages/Markets"));
const Orders = React.lazy(() => import("@/pages/Orders"));
const PortfolioPage = React.lazy(() => import("@/pages/Portfolio"));
const NewOrder = React.lazy(() => import("@/pages/NewOrder"));
const WalletPage = React.lazy(() => import("@/pages/WalletPage"));
const Learn = React.lazy(() => import("@/pages/Learn"));
const LearnDetail = React.lazy(() => import("@/pages/LearnDetail"));
const AIInsights = React.lazy(() => import("@/pages/AIInsights"));
const MarketDetail = React.lazy(() => import("@/pages/MarketDetail"));
const Settings = React.lazy(() => import("@/pages/Settings"));
const NotFoundApp = React.lazy(() => import("@/pages/NotFoundApp"));
const Strategy = React.lazy(() => import("@/pages/Strategy"));
const Account = React.lazy(() => import("@/pages/Account"));
const AdminDashboard = React.lazy(() => import("@/pages/AdminDashboard"));
const ChartSandbox = React.lazy(() => import("@/pages/ChartSandbox"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#06080F]">
    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
  </div>
);

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        {/* Public root: Landing (logged out) / redirect to app (logged in) */}
        <Route path="/" component={HomeGate} />

        {/* App */}
        <Route path="/app" component={AppIndex} />
        <Route path="/app/portfolio" component={PortfolioPage} />
        <Route path="/app/wallet" component={WalletPage} />
        <Route path="/app/watchlists" component={Watchlists} />
        <Route path="/app/watchlists/:id" component={WatchlistDetail} />
        <Route path="/app/markets" component={Markets} />
        <Route path="/app/markets/:id" component={MarketDetail} />
        <Route path="/app/orders" component={Orders} />
        <Route path="/app/orders/new" component={NewOrder} />
        <Route path="/app/learn" component={Learn} />
        <Route path="/app/learn/:id" component={LearnDetail} />
        <Route path="/app/insights" component={AIInsights} />
        <Route path="/app/settings" component={Settings} />
        <Route path="/app/strategy" component={Strategy} />
        <Route path="/app/account" component={Account} />
        <Route path="/app/admin" component={AdminDashboard} />
        <Route path="/app/sandbox" component={ChartSandbox} />

        {/* Nice 404 for app routes */}
        <Route path="/app/:rest*" component={NotFoundApp as any} />

        {/* Fallback to existing 404 */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AIConsentModal />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
