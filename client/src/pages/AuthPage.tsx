import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Wallet, Sparkles, Chrome } from "lucide-react";
import Seo from "@/components/Seo";
import ThemeToggle from "@/components/ThemeToggle";
import { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { login, register, loginWithFirebase, isFirebaseWorking, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Form states
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(false);

  const isLoading = authLoading || isFirebaseLoading || isFirebaseWorking;

  const handleGoogleLogin = async () => {
    try {
      setIsFirebaseLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      await loginWithFirebase({ idToken });
      setLocation("/app");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Google Login Failed",
        description: err.message || "Failed to sign in with Google.",
      });
    } finally {
      setIsFirebaseLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsFirebaseLoading(true);
      
      // Smart Fallback: Check if Firebase is actually configured
      const isFirebaseConfigured = !(window as any).__FIREBASE_DISABLED__;

      if (!isFirebaseConfigured) {
        if (isLogin) {
          await login({ email, password });
        } else {
          await register({ email, password, firstName, lastName });
        }
        setLocation("/app");
        return;
      }

      let idToken: string | null = null;
      if (isLogin) {
        // --- HYBRID LOGIN FLOW (v88.0) ---
        try {
          // Priority 1: Firebase Cloud Auth
          const result = await signInWithEmailAndPassword(auth, email, password);
          idToken = await result.user.getIdToken();
        } catch (firebaseErr: any) {
          console.warn("[Auth] Firebase Cloud Login failed, attempting Institutional Local Fallback...", firebaseErr.code);
          
          // Institutional Fallback: If cloud fails for any common reason (Invalid, Not Found, OR Network), try local.
          const isFallbackError = ["auth/user-not-found", "auth/invalid-credential", "auth/invalid-email", "auth/network-request-failed"].includes(firebaseErr.code);
          
          if (isFallbackError) {
             try {
                await login({ email, password });
                toast({ title: "Institutional Sync Active", description: "Logged in via High-Fidelity Local Engine." });
                setLocation("/app");
                return;
             } catch (localErr: any) {
                // If local also fails, then it's a real invalid credential
                throw new Error("Invalid institutional credentials. Please verify your email and password.");
             }
          }
          throw firebaseErr; // Re-throw if it's some other structural firebase error
        }
      } else {
        // Firebase Sign Up
        const result = await createUserWithEmailAndPassword(auth, email, password);
        idToken = await result.user.getIdToken();
      }

      // Exchange Firebase token for local session
      if (idToken) {
        await loginWithFirebase(
          isLogin 
            ? { idToken } 
            : { idToken, firstName, lastName }
        );
      }
      
      if (!isLogin) {
        toast({ title: "Welcome!", description: "Cloud account created successfully." });
      }
      setLocation("/app");
    } catch (err: any) {
      console.error("[Auth] Fatal Authentication Failure:", err);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: err.message || "Could not verify your identity. Please try again.",
      });
    } finally {
      setIsFirebaseLoading(false);
    }
  };

  const handleGoogleFallback = () => {
    const isFirebaseConfigured = !(window as any).__FIREBASE_DISABLED__;
    if (!isFirebaseConfigured) {
      toast({
         title: "Firebase Required",
         description: "Google Login requires a valid Firebase configuration in lib/firebase.ts",
         variant: "destructive"
      });
      return;
    }
    handleGoogleLogin();
  };


  return (
    <div className="min-h-screen bg-mesh grain flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Seo title={isLogin ? "Login - HTC Trade" : "Register - HTC Trade"} />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 hidden sm:block">
         <div className="flex justify-center mb-6">
            <div className="grid place-items-center h-16 w-16 rounded-3xl bg-gradient-to-br from-primary/18 via-primary/10 to-accent/10 border border-border/60 shadow-lg shadow-primary/20">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
         </div>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
          {isLogin ? "Sign in to your account" : "Create an account"}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground mb-6">
          {isLogin ? "Welcome back to the trading platform" : "Join our trading platform today"}
        </p>
      </div>

      <div className="mt-4 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 relative">
        <div className="glass sm:shadow-luxe sm:rounded-3xl sm:px-10 px-6 py-8 sm:border border-border/60 backdrop-blur-2xl">
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">First Name</label>
                  <input
                    type="text"
                    required={!isLogin}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-input/40 border border-border/60 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/50"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">Last Name</label>
                  <input
                    type="text"
                    required={!isLogin}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-input/40 border border-border/60 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/50"
                    placeholder="Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-input/40 border border-border/60 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/50"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5 uppercase tracking-wide">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-input/40 border border-border/60 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/50"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full rounded-xl py-6 text-sm font-semibold bg-gradient-to-r from-primary to-primary/85 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
              </Button>
            </div>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/40"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background/90 px-2 text-muted-foreground font-bold">Or continue with</span></div>
          </div>

          <div className="grid grid-cols-1 gap-4">
             <Button 
                variant="outline" 
                onClick={handleGoogleFallback} 
                disabled={isLoading}
                className="rounded-xl py-5 border-border/60 hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
             >
                <Chrome className="h-4 w-4" /> Google Secure Login
             </Button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setEmail("");
                setPassword("");
                setFirstName("");
                setLastName("");
              }}
              type="button"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>

          <div className="mt-8 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80 font-bold uppercase tracking-tighter">
                  <span className={cn("w-2 h-2 rounded-full", (window as any).__FIREBASE_DISABLED__ ? "bg-primary" : "bg-emerald-500 animate-pulse")} />
                  {(window as any).__FIREBASE_DISABLED__ ? "Institutional Local Engine" : "Firebase Cloud Secured"}
              </span>
              <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
