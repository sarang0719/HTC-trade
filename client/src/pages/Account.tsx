import { useState } from "react";
import AppShell from "@/components/AppShell";
import Seo from "@/components/Seo";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Copy, ShieldAlert, CheckCircle2, Lock, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function Account() {
  const { user } = useAuth();
  
  const [nickname, setNickname] = useState("#85249049");
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [dob, setDob] = useState("03/31/2026");
  const [aadhaar, setAadhaar] = useState("");
  const [email, setEmail] = useState(user?.email || "user@example.com");
  const [country, setCountry] = useState("India");
  const [address, setAddress] = useState("");
  
  return (
    <AppShell title="My account">
      <Seo title="Profile • Account Settings" />
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8 text-foreground pb-20">
        
        {/* Left Side: Personal Data */}
        <div className="space-y-6">
          <h2 className="text-sm font-bold opacity-90">Personal data:</h2>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="relative">
              <Avatar className="h-[72px] w-[72px] bg-secondary/80 text-secondary-foreground text-2xl font-bold rounded-full items-center justify-center flex">
                <AvatarFallback className="bg-[#1f2937] text-primary">{user?.firstName?.[0]?.toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-card rounded-full flex items-center justify-center border border-border/50 cursor-pointer hover:bg-muted">
                 <CameraIcon className="w-3 h-3 text-muted-foreground" />
              </div>
            </div>
            <div>
              <div className="font-bold text-[15px]">{email}</div>
              <div className="text-xs text-muted-foreground mt-0.5 mb-1.5 flex items-center gap-2">
                 ID: 85249049 <Copy className="w-3 h-3 cursor-pointer hover:text-foreground" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase tracking-wide">
                 <ShieldAlert className="w-3 h-3" /> Not verified
              </div>
            </div>
          </div>

          <div className="space-y-4">
             {/* Nickname */}
             <div className="space-y-1.5">
               <label className="text-[11px] font-semibold text-muted-foreground ml-1">Nickname</label>
               <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} className="w-full bg-card/50 border border-border/60 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
             </div>
             
             {/* First / Last */}
             <div className="space-y-1.5">
               <label className="text-[11px] font-semibold text-muted-foreground ml-1">First Name</label>
               <input type="text" placeholder="Empty" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-card/50 border border-border/60 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
             </div>
             <div className="space-y-1.5">
               <label className="text-[11px] font-semibold text-muted-foreground ml-1">Last Name</label>
               <input type="text" placeholder="Empty" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-card/50 border border-border/60 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
             </div>

             {/* DOB & Aadhaar */}
             <div className="space-y-1.5">
               <label className="text-[11px] font-semibold text-muted-foreground ml-1">Date of birth</label>
               <input type="text" value={dob} onChange={e => setDob(e.target.value)} className="w-full bg-card/50 border border-border/60 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
             </div>
             <div className="space-y-1.5">
               <label className="text-[11px] font-semibold text-muted-foreground ml-1">Aadhaar</label>
               <input type="text" placeholder="Empty" value={aadhaar} onChange={e => setAadhaar(e.target.value)} className="w-full bg-card/50 border border-border/60 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
             </div>

             {/* Email with Resend */}
             <div className="space-y-1.5 relative">
               <label className="text-[11px] font-semibold text-muted-foreground ml-1">Email</label>
               <div className="absolute right-3 top-[5px] flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-rose-500">Unverified</span>
                  <button className="text-[10px] font-bold text-primary hover:underline">RESEND</button>
               </div>
               <input type="text" disabled value={email} className="w-full bg-card/30 border border-border/60 rounded-lg px-4 py-2.5 text-sm text-foreground/70 outline-none" />
             </div>

             {/* Country & Address */}
             <div className="space-y-1.5">
               <label className="text-[11px] font-semibold text-muted-foreground ml-1">Country</label>
               <select value={country} onChange={e => setCountry(e.target.value)} className="w-full bg-card/50 border border-border/60 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary/50 appearance-none">
                 <option>India</option>
                 <option>United States</option>
                 <option>United Kingdom</option>
               </select>
             </div>
             <div className="space-y-1.5">
               <label className="text-[11px] font-semibold text-muted-foreground ml-1">Address</label>
               <input type="text" placeholder="Empty" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-card/50 border border-border/60 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
             </div>

             <Button className="w-full py-6 mt-4 text-[15px] font-bold rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white">
               Save
             </Button>
          </div>
        </div>

        {/* Right Side */}
        <div className="space-y-8 lg:border-l lg:border-border/40 lg:pl-8">
           
           {/* Document Verification */}
           <div className="space-y-4">
               <h2 className="text-sm font-bold opacity-90">Documents verification:</h2>
               <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground/90 font-medium leading-relaxed">
                     You need fill identity information before verification your account.
                  </p>
               </div>
           </div>

           {/* Security */}
           <div className="space-y-6 pt-4 border-t border-border/40">
               <h2 className="text-sm font-bold opacity-90">Security:</h2>
               
               <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="font-bold text-sm">Two-step verification</span>
                    </div>
                    <div className="text-xs text-muted-foreground ml-6 flex items-center gap-1">
                      Receiving codes via Email <span className="text-primary hover:underline cursor-pointer">✎</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm font-bold opacity-90">To enter the platform</span>
                    <Switch checked={true} onCheckedChange={() => {}} />
                  </div>
               </div>

               <div className="pt-4 space-y-2">
                 <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold text-sm">Password</span>
                 </div>
                 <div className="text-xs text-muted-foreground">Change your account password</div>
                 <button className="text-primary text-sm font-bold hover:underline">Change</button>
               </div>
           </div>

           {/* Options */}
           <div className="space-y-6 pt-4 border-t border-border/40">
              <div className="space-y-1.5">
                 <label className="text-[11px] font-semibold text-muted-foreground ml-1">Language</label>
                 <select className="w-full bg-card/50 border border-border/60 rounded-lg px-4 py-2.5 text-sm outline-none">
                   <option>English</option>
                 </select>
              </div>

              <div className="space-y-1.5">
                 <label className="text-[11px] font-semibold text-muted-foreground ml-1">Timezone</label>
                 <select className="w-full bg-card/50 border border-border/60 rounded-lg px-4 py-2.5 text-sm outline-none">
                   <option>(UTC+00:00)</option>
                 </select>
              </div>

              <div className="pt-4">
                <button className="flex items-center gap-2 text-rose-500 hover:text-rose-400 font-bold text-sm transition-colors">
                  <X className="w-4 h-4" /> Delete My account
                </button>
              </div>
           </div>

        </div>
      </div>
    </AppShell>
  );
}

// Inline Camera Icon component
function CameraIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3"/>
    </svg>
  );
}
