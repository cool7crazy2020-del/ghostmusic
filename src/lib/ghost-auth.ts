export type GhostSession = { access_token: string; refresh_token?: string; expires_at?: number; user: { id: string; email?: string } };
const SESSION_KEY = "ghost-music:auth-session";
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const authConfigured = Boolean(supabaseUrl && supabaseKey);
export function getSession(): GhostSession | null {
  try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) as GhostSession : null; } catch { return null; }
}
function setSession(session: GhostSession | null) {
  try { if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session)); else localStorage.removeItem(SESSION_KEY); } catch {}
  window.dispatchEvent(new CustomEvent("ghost-auth-change", { detail: session }));
}
async function authRequest(path: string, body: Record<string, unknown>): Promise<GhostSession> {
  if (!authConfigured) throw new Error("Sign-in is not connected yet. The app owner needs to add Supabase URL and anon key in deployment settings.");
  const response = await fetch(supabaseUrl + "/auth/v1/" + path, {
    method: "POST", headers: { "Content-Type": "application/json", apikey: supabaseKey! }, body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof data.msg === "string" ? data.msg : typeof data.message === "string" ? data.message : typeof data.error_description === "string" ? data.error_description : typeof data.error === "string" ? data.error : "Could not sign in. Check your email and password.");
  const user = data.user as GhostSession["user"] | undefined;
  if (!user?.id || typeof data.access_token !== "string") throw new Error("Sign-in response was incomplete. Check Supabase email confirmation settings.");
  const session: GhostSession = { access_token: data.access_token, refresh_token: typeof data.refresh_token === "string" ? data.refresh_token : undefined, expires_at: typeof data.expires_in === "number" ? Date.now() + data.expires_in * 1000 : undefined, user };
  setSession(session); return session;
}
export function signIn(email: string, password: string) { return authRequest("token?grant_type=password", { email, password }); }
export async function signUp(email: string, password: string): Promise<GhostSession | null> {
  if (!authConfigured) throw new Error("Sign-in is not connected yet. The app owner needs to add Supabase URL and anon key in deployment settings.");
  const response = await fetch(supabaseUrl + "/auth/v1/signup", {
    method: "POST", headers: { "Content-Type": "application/json", apikey: supabaseKey! }, body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof data.msg === "string" ? data.msg : typeof data.message === "string" ? data.message : typeof data.error_description === "string" ? data.error_description : "Could not create account. Check the email and password.");
  if (typeof data.access_token !== "string") return null;
  const user = data.user as GhostSession["user"] | undefined;
  if (!user?.id) throw new Error("Account created, but the sign-in response was incomplete.");
  const session: GhostSession = { access_token: data.access_token, refresh_token: typeof data.refresh_token === "string" ? data.refresh_token : undefined, expires_at: typeof data.expires_in === "number" ? Date.now() + data.expires_in * 1000 : undefined, user };
  setSession(session); return session;
}
export function signOut() { setSession(null); }
export async function cloudRequest(path: string, method: string, body?: unknown) {
  const session = getSession();
  if (!authConfigured || !session) return null;
  const response = await fetch(supabaseUrl + "/rest/v1/" + path, {
    method, headers: { apikey: supabaseKey!, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status === 204 || response.ok) return response;
  if (response.status === 401) { signOut(); throw new Error("Your session expired. Please sign in again."); }
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  throw new Error(typeof data.message === "string" ? data.message : "Cloud library sync failed. Check the Supabase table and permissions.");
}
