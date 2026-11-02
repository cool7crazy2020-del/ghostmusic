import { useEffect, useState, type FormEvent } from "react";
import { LogIn, LogOut, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authConfigured, getSession, signIn, signOut, signUp } from "@/lib/ghost-auth";

export function AccountButton() {
  const [session, setSession] = useState(getSession);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const sync = (event?: Event) => setSession(event ? (event as CustomEvent).detail : getSession());
    window.addEventListener("ghost-auth-change", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("ghost-auth-change", sync); window.removeEventListener("storage", sync); };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      if (mode === "signin") await signIn(email.trim(), password);
      else {
        await signUp(email.trim(), password);
        setMessage("Account created. If email confirmation is enabled, check your inbox before signing in.");
        setMode("signin"); setPassword("");
      }
      setSession(getSession());
      if (mode === "signin") setOpen(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Something went wrong."); }
    finally { setBusy(false); }
  }
  return <>
    {session ? <Button variant="outline" size="sm" onClick={() => { signOut(); setSession(null); setMessage("Signed out."); }}><LogOut className="size-4" /> Sign out</Button> : <Button variant="glow" size="sm" onClick={() => { setOpen(true); setMessage(""); }}><LogIn className="size-4" /> Sign in</Button>}
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-md" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }} role="dialog" aria-modal="true" aria-labelledby="ghost-account-title">
      <div className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-background p-5 shadow-2xl sm:p-6" onMouseDown={event => event.stopPropagation()}>
        <div className="flex items-start justify-between"><div><div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><UserRound /></div><h2 id="ghost-account-title" className="text-2xl font-bold">{mode === "signin" ? "Welcome back" : "Create your account"}</h2><p className="mt-1 text-sm text-muted-foreground">Save your playlists and liked songs across devices.</p></div><Button variant="ghost" size="icon" aria-label="Close" onClick={() => setOpen(false)}><X /></Button></div>
        <form className="mt-6 space-y-3" onSubmit={submit}>
          <label className="block text-sm font-medium">Email<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring" placeholder="you@example.com" /></label>
          <label className="block text-sm font-medium">Password<input required minLength={6} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring" placeholder="At least 6 characters" /></label>
          {!authConfigured && <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">Account service needs to be connected by the app owner before sign-in can work.</p>}
          {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
          <Button className="w-full" variant="glow" disabled={busy || !authConfigured}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">{mode === "signin" ? "New to GHOST? " : "Already have an account? "}<button className="font-semibold text-primary hover:underline" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>{mode === "signin" ? "Create account" : "Sign in"}</button></p>
      </div>
    </div>}
  </>;
}
