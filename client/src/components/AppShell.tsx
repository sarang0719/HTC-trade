import { ReactNode, useMemo, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  BookOpen,
  CandlestickChart,
  LayoutDashboard,
  ListChecks,
  Sparkles,
  Briefcase,
  LogOut,
  Zap,
  Wallet,
  Users,
  Check,
  CreditCard,
  ChevronDown,
  Search,
  Menu,
  Bell,
  Rocket,
  HelpCircle,
  User,
  Trophy,
  Store,
  MoreHorizontal,
  BarChart2
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import { useInstruments } from "@/hooks/use-instruments";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  testId: string;
};

export default function AppShell(props: { children: ReactNode; title?: string; subtitle?: string; noPadding?: boolean; hideMobileNav?: boolean }) {
  const { children, title, subtitle, noPadding, hideMobileNav } = props;
  const [loc, setLoc] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { data: searchResults } = useInstruments({ q: searchQuery });
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const adminEmails = ["saran123@gmail.com", "htctrade123@gmail.com"];
    return adminEmails.includes((user.email || "").toLowerCase()) || 
           user.role === "ADMIN_1" || 
           user.role === "ADMIN_2";
  }, [user]);

  const nav: NavItem[] = useMemo(
    () => {
      const allNav = [
        { href: "/app", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, testId: "nav-dashboard" },
        { href: "/app/portfolio", label: "Portfolio", icon: <Briefcase className="h-4 w-4" />, testId: "nav-portfolio" },
        { href: "/app/watchlists", label: "Watchlists", icon: <Activity className="h-4 w-4" />, testId: "nav-watchlists" },
        { href: "/app/markets", label: "Markets", icon: <CandlestickChart className="h-4 w-4" />, testId: "nav-markets" },
        { href: "/app/orders", label: "Orders", icon: <ListChecks className="h-4 w-4" />, testId: "nav-orders" },
        { href: "/app/learn", label: "Learn", icon: <BookOpen className="h-4 w-4" />, testId: "nav-learn" },
      ];

      if (isAdmin) {
        allNav.push({ href: "/app/admin", label: "Users / Admin", icon: <Users className="h-4 w-4" />, testId: "nav-admin" });
        allNav.push({ href: "/app/insights",  label: "AI Insights", icon: <Sparkles className="h-4 w-4" />, testId: "nav-insights" });
        allNav.push({ href: "/app/strategy",  label: "Strategy",    icon: <Zap      className="h-4 w-4" />, testId: "nav-strategy" });
      }

      return allNav;
    },
    [isAdmin],
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/20">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[260px] flex-col border-r border-border/40 bg-card/30 backdrop-blur-xl">
        <div className="p-5 flex items-center gap-3 border-b border-border/40">
          <div className="h-8 w-8 rounded-lg bg-primary shadow-[0_0_15px_rgba(185,95,55,0.4)] grid place-items-center">
            <Briefcase className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="font-bold text-lg tracking-tight">Ledgerly</div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 scrollbar-none">
          <div>
            <div className="px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">General</div>
            <nav className="space-y-1">
              {nav.slice(0, 1).map((item) => {
                const active = loc === item.href;
                return (
                  <Link key={item.href} href={item.href} className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    active ? "bg-primary/10 text-primary shadow-[0_0_10px_rgba(185,95,55,0.1)]" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}>
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div>
            <div className="px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">Trading & Portfolio</div>
            <nav className="space-y-1">
              {nav.slice(1, 5).map((item) => {
                const active = loc.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    active ? "bg-primary/10 text-primary shadow-[0_0_10px_rgba(185,95,55,0.1)]" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}>
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div>
            <div className="px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">Research</div>
            <nav className="space-y-1">
              {nav.slice(5).map((item) => {
                const active = loc.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    active ? "bg-primary/10 text-primary shadow-[0_0_10px_rgba(185,95,55,0.1)]" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}>
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-border/40 bg-card/20 pb-safe">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-9 w-9 ring-1 ring-border/60 shadow-sm">
              <AvatarImage src={user?.profileImageUrl ?? undefined} />
              <AvatarFallback className="bg-primary/20 text-primary font-bold">{(user?.firstName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <Link href="/app/account" className="block truncate text-sm font-bold hover:text-primary transition-colors cursor-pointer">
                 {user?.firstName || "Account"}
              </Link>
              <button onClick={() => logout()} disabled={isLoggingOut} className="text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 mt-0.5">
                 <LogOut className="h-3 w-3" /> Sign out
              </button>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        <header className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-8 border-b border-border/40 bg-background/80 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3">
              <div className="lg:hidden h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center">
                 <Briefcase className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-center gap-4">
                 <div>
                    <h1 className="text-lg lg:text-xl font-bold tracking-tight font-sans text-foreground flex items-center gap-2">
                       {title ?? "Dashboard"}
                    </h1>
                    {subtitle && <p className="text-[10px] lg:text-xs text-muted-foreground font-medium hidden sm:block">{subtitle}</p>}
                 </div>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
             <Popover>
               <PopoverTrigger asChild>
                 <div className={cn(
                   "flex items-center gap-2 border px-3 py-1.5 rounded-full cursor-pointer transition-all mr-2",
                   user?.tradeMode === "REAL" 
                     ? "bg-primary/10 border-primary/30 hover:bg-primary/20" 
                     : "bg-violet-500/10 border-violet-500/30 hover:bg-violet-500/20"
                 )}>
                   <Wallet className={cn("h-4 w-4", user?.tradeMode === "REAL" ? "text-primary" : "text-violet-400")} />
                   <span className={cn("text-[10px] font-black uppercase tracking-tighter mr-0.5 opacity-70", 
                     user?.tradeMode === "REAL" ? "text-primary" : "text-violet-400"
                   )}>
                     {user?.tradeMode ?? "DEMO"}
                   </span>
                   <span className={cn("text-sm font-bold", user?.tradeMode === "REAL" ? "text-primary" : "text-violet-400")}>
                     ${user?.tradeMode === "REAL" ? (user?.walletBalance || "0.00") : (user?.demoBalance || "10000.00")}
                   </span>
                   <ChevronDown className="w-3 h-3 opacity-50" />
                 </div>
               </PopoverTrigger>
               <PopoverContent className="w-64 p-2 bg-[#0f1420] border-border/40 shadow-2xl rounded-2xl z-[1001]" align="end">
                   <div className="px-2 py-2 mb-1 border-b border-border/10">
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Select Trading Mode</h4>
                   </div>
                   <div className="p-1 space-y-1">
                     <div 
                       onClick={async () => {
                          await fetch("/api/wallet/mode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "REAL" }) });
                          window.location.reload();
                       }}
                       className={cn(
                         "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all",
                         user?.tradeMode === "REAL" ? "bg-primary/10 border border-primary/20 shadow-sm" : "hover:bg-white/5 border border-transparent"
                       )}
                     >
                        <div className="flex items-center gap-3">
                           <div className={cn("w-8 h-8 rounded-lg grid place-items-center bg-primary/10", user?.tradeMode === "REAL" ? "text-primary" : "text-muted-foreground")}>
                              <CreditCard className="w-4 h-4" />
                           </div>
                           <div className="flex flex-col">
                              <span className="text-xs font-bold">Real Money</span>
                              <span className="text-[10px] font-mono text-muted-foreground">${user?.walletBalance || "0.00"}</span>
                           </div>
                        </div>
                        {user?.tradeMode === "REAL" && <Check className="w-4 h-4 text-primary" />}
                     </div>
                     
                     <div 
                       onClick={async () => {
                          await fetch("/api/wallet/mode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "DEMO" }) });
                          window.location.reload();
                       }}
                       className={cn(
                         "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all",
                         user?.tradeMode === "DEMO" ? "bg-violet-500/10 border border-violet-500/20 shadow-sm" : "hover:bg-white/5 border border-transparent"
                       )}
                     >
                        <div className="flex items-center gap-3">
                           <div className={cn("w-8 h-8 rounded-lg grid place-items-center bg-violet-500/10", user?.tradeMode === "DEMO" ? "text-violet-400" : "text-muted-foreground")}>
                              <Zap className="w-4 h-4" />
                           </div>
                           <div className="flex flex-col">
                              <span className="text-xs font-bold">Demo Practice</span>
                              <span className="text-[10px] font-mono text-muted-foreground">${user?.demoBalance || "10000.00"}</span>
                           </div>
                        </div>
                        {user?.tradeMode === "DEMO" && <Check className="w-4 h-4 text-violet-400" />}
                     </div>
                   </div>
                   
                   <div className="h-px bg-border/10 my-2 mx-2" />
                   <Link href="/app/wallet">
                      <Button variant="ghost" className="w-full h-10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl">
                         Access Wallet <ChevronDown className="w-3 h-3 ml-1.5 -rotate-90" />
                      </Button>
                   </Link>
               </PopoverContent>
             </Popover>

             {/* Interactive Symbol Search */}
             <div className="relative hidden lg:block ml-2" ref={searchRef}>
               <div className="relative flex items-center">
                 <Search className="w-3.5 h-3.5 absolute left-3 text-muted-foreground" />
                 <input
                   type="text"
                   value={searchQuery}
                   onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                   onFocus={() => setIsSearchOpen(true)}
                   placeholder="Symbol search..."
                   className="bg-secondary/30 border border-border/50 rounded-xl pl-9 pr-12 py-1.5 text-xs font-semibold w-60 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-inner"
                 />
                 <div
                   onClick={() => setIsSearchOpen(!isSearchOpen)}
                   className="absolute right-2 top-1.5 text-[9px] font-bold text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/30 cursor-pointer hover:border-primary/40 transition-colors"
                 >
                   ⌘ K
                 </div>
               </div>

               {isSearchOpen && (
                 <div className="absolute right-0 top-full mt-2 w-72 bg-[#0c101c]/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl z-[1002] overflow-hidden animate-in fade-in-0 zoom-in-95">
                   <div className="p-2 border-b border-border/20 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                     {searchQuery ? `Results for "${searchQuery}"` : "Quick Markets"}
                   </div>
                   <div className="max-h-64 overflow-y-auto p-1 space-y-1">
                     {(Array.isArray(searchResults) ? searchResults : []).slice(0, 6).map((inst: any) => (
                       <div
                         key={inst.id}
                         onClick={() => {
                           setLoc(`/app/markets/${inst.id}`);
                           setIsSearchOpen(false);
                           setSearchQuery("");
                         }}
                         className="flex items-center justify-between p-2 rounded-xl hover:bg-primary/15 cursor-pointer transition-all group"
                       >
                         <div className="flex items-center gap-2.5">
                           <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center font-bold text-xs text-primary group-hover:scale-105 transition-transform">
                             {inst.symbol.slice(0, 2)}
                           </div>
                           <div className="flex flex-col">
                             <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{inst.symbol}</span>
                             <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{inst.name}</span>
                           </div>
                         </div>
                         <div className="flex flex-col items-end">
                           <span className="text-xs font-mono font-bold">${inst.price || "0.00"}</span>
                           <span className={cn("text-[10px] font-bold", Number(inst.changePct || 0) >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]")}>
                             {Number(inst.changePct || 0) >= 0 ? "+" : ""}{Number(inst.changePct || 0).toFixed(2)}%
                           </span>
                         </div>
                       </div>
                     ))}
                     {(!searchResults || (Array.isArray(searchResults) && searchResults.length === 0)) && (
                       <div className="p-4 text-center text-xs text-muted-foreground">No matching markets found</div>
                     )}
                   </div>
                 </div>
               )}
             </div>
            <div className="lg:hidden"><ThemeToggle /></div>
          </div>
        </header>

        {noPadding ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full">
            {children}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto w-full p-4 lg:p-8 pb-24 lg:pb-8 relative">
            <div className="animate-in-up max-w-[1440px] mx-auto w-full h-full">
              {children}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Tab Bar */}
      {!hideMobileNav && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-xl border-t border-border/60 z-50 px-2 flex justify-around items-center pb-safe">
        {[nav[0], nav[3], nav[2], nav[4], nav[6]].filter(Boolean).map((item) => {
          // Select 5 key items for mobile nav: Dashboard, Markets, Watchlists, Orders, Insights
          const active = loc === item.href || (item.href !== "/app" && loc.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}>
              <div className={cn("p-1.5 rounded-xl transition-all", active && "bg-primary/15")}>
                 {item.icon}
              </div>
              <span className="text-[9px] font-bold tracking-tight truncate w-full text-center px-1">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      )}
    </div>
  );
}
