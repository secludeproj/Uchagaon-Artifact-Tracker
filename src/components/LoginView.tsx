import React, { useState } from "react";
import { 
  ShieldCheck, 
  Key, 
  Compass, 
  Mail, 
  Lock, 
  UserPlus, 
  LogIn, 
  AlertCircle,
  User,
  WifiOff,
  HelpCircle,
  ExternalLink
} from "lucide-react";
import { supabase } from "../lib/supabase";

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);
    setErrorCode(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      onLoginSuccess();
    } catch (err: any) {
      console.error("Supabase Google Auth error: ", err);
      setAuthError(err.message || "Google sign-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      localStorage.setItem("offline_bypass", "true");
      const simulatedProfile = {
        id: "guest-user",
        name: "Imperial Palace Custodian",
        email: "guest-custodian@secludehotels.com",
        role: "ADMIN",
        avatarUrl: "🧑‍💼"
      };
      localStorage.setItem("seclude_operator", JSON.stringify(simulatedProfile));
      onLoginSuccess();
      window.location.reload();
    } catch (err: any) {
      setAuthError("Guest access failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfflineBypass = () => {
    setIsLoading(true);
    try {
      localStorage.setItem("offline_bypass", "true");
      const simulatedProfile = {
        name: "Imperial Palace Custodian",
        email: "guest-custodian@secludehotels.com",
        role: "Chief Heritage Conservator",
        avatarUrl: "🧑‍💼"
      };
      localStorage.setItem("seclude_operator", JSON.stringify(simulatedProfile));
      onLoginSuccess();
      window.location.reload();
    } catch (err) {
      console.error("Offline bypass failed: ", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setAuthError("Please fill in both email and password fields.");
      return;
    }
    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    setAuthError(null);
    setErrorCode(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error("Supabase Email Auth error: ", err);
      const friendlyMessage = err.message || "Authentication failed. Please verify your credentials.";
      setAuthError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f2eb] ledger-grid p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#fdfcf7] border-2 border-[#d3cdc0] rounded-lg shadow-xl overflow-hidden relative">
        {/* Archival border aesthetics */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#3b5249]"></div>
        
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#eae5d9] border border-[#d2cca0] mb-3 text-[#3b5249]">
              <Compass className="w-8 h-8 animate-spin-slow" />
            </div>
            <h1 className="font-serif text-2xl tracking-tight text-[#1c1a18] font-bold uppercase">
              SECLUDE HOTELS
            </h1>
            <p className="font-mono text-[10px] tracking-widest text-[#5c544d] uppercase font-bold mt-1">
              PALACE HERITAGE INVENTORY
            </p>
            <div className="h-px bg-gradient-to-r from-transparent via-[#c4bcae] to-transparent my-4"></div>
            <p className="text-xs text-[#6e645a] font-serif italic">
              15-Year Lease Custody & Chain-of-Custody Registry Ledger
            </p>
          </div>

          {/* Error and Diagnostic Cards */}
          {authError && (
            <div className="space-y-4 mb-5">
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded font-sans flex gap-2.5 items-start animate-in slide-in-from-top-2 duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <strong className="font-semibold block">Authentication Issue</strong>
                  <span className="leading-relaxed text-[11px]">{authError}</span>
                </div>
              </div>

              {/* 1. Admin-restricted User Creation error Diagnostic Card */}
              {(errorCode === "auth/admin-restricted-operation" || authError.includes("admin-restricted-operation") || authError.includes("Prevent creation of new users")) && (
                <div className="p-4 bg-[#fffbeb] border border-[#f59e0b] rounded text-[#78350f] text-xs font-sans animate-in fade-in duration-300">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-[#b45309] mb-2 font-mono flex items-center gap-1.5">
                    ⚙️ Action Required: Enable User Creation
                  </h4>
                  <p className="leading-relaxed mb-3">
                    Your Supabase project is currently configured to <strong className="font-semibold">Prevent creation of new users</strong>. To allow operator sign-ins:
                  </p>
                  <ol className="list-decimal pl-4 space-y-2 text-[11px] leading-relaxed mb-3">
                    <li>
                      Go to your{" "}
                      <a 
                        href="https://supabase.com/dashboard/project/angular-bruin-lfjbn/authentication/settings" 
                        target="_blank" 
                        rel="noreferrer"
                        className="underline font-bold text-[#b45309] hover:text-[#92400e] inline-flex items-center gap-0.5"
                      >
                        Supabase Dashboard <ExternalLink className="w-3 h-3" />
                      </a>.
                    </li>
                    <li>Click the <strong className="font-semibold">"User sign-up"</strong> accordion or locate the "User creation" toggle.</li>
                    <li>Ensure <strong className="font-semibold">"Allow users to sign up"</strong> is enabled (unchecked for "Prevent creation").</li>
                    <li>Save settings and try again!</li>
                  </ol>
                  <div className="text-[10px] text-[#b45309] border-t border-[#fef3c7] pt-2">
                    💡 <strong>Instant Sandbox Option:</strong> Bypass all setup instantly! Click the gold <strong className="font-semibold">"Bypass Auth & Go Offline"</strong> button below to test all heritage features with local operators.
                  </div>
                </div>
              )}

              {/* 1. Google Auth Unauthorized Domain error Diagnostic card */}
              {(errorCode === "auth/unauthorized-domain" || authError.includes("unauthorized-domain") || authError.includes("not authorized")) && (
                <div className="p-4 bg-[#fffbeb] border border-[#f59e0b] rounded text-[#78350f] text-xs font-sans animate-in fade-in duration-300">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-[#b45309] mb-2 font-mono flex items-center gap-1.5">
                    ⚙️ Action Required: Authorize Iframe Domain
                  </h4>
                  <p className="leading-relaxed mb-3">
                    Google Sign-In requires your current sandboxed preview domain to be authorized in your Supabase console. Follow these steps:
                  </p>
                  <ol className="list-decimal pl-4 space-y-2 text-[11px] leading-relaxed mb-3">
                    <li>
                      Open your{" "}
                      <a 
                        href="https://supabase.com/dashboard/project/angular-bruin-lfjbn/authentication/settings" 
                        target="_blank" 
                        rel="noreferrer"
                        className="underline font-bold text-[#b45309] hover:text-[#92400e] inline-flex items-center gap-0.5"
                      >
                        Supabase Dashboard <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>Scroll down to the <strong className="font-semibold">"Authorized domains"</strong> card.</li>
                    <li>Click the <strong className="font-semibold">"Add domain"</strong> button.</li>
                    <li>
                      Copy and paste this exact domain: <br />
                      <code className="bg-[#fef3c7] px-1.5 py-0.5 rounded font-mono font-bold select-all text-[#92400e] border border-[#f59e0b] break-all inline-block mt-1">
                        {window.location.hostname}
                      </code>
                    </li>
                    <li>Click <strong className="font-semibold">"Add"</strong>, then refresh this page to sign in!</li>
                  </ol>
                  <div className="text-[10px] text-[#b45309] border-t border-[#fef3c7] pt-2">
                    
                  </div>
                </div>
              )}

              {/* 2. Anonymous Auth not enabled Diagnostic Card */}
              {errorCode === "auth/operation-not-allowed" && authError.includes("Anonymous") && (
                <div className="p-4 bg-[#fffbeb] border border-[#f59e0b] rounded text-[#78350f] text-xs font-sans animate-in fade-in duration-300">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-[#b45309] mb-2 font-mono flex items-center gap-1.5">
                    ⚙️ Action Required: Enable Anonymous Sign-In
                  </h4>
                  <p className="leading-relaxed mb-2">
                    To use Instant Guest Access, please enable the Anonymous sign-in provider in your Supabase project:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-relaxed mb-3">
                    <li>
                      Go to your{" "}
                      <a 
                        href="https://supabase.com/dashboard/project/angular-bruin-lfjbn/authentication/providers" 
                        target="_blank" 
                        rel="noreferrer"
                        className="underline font-bold text-[#b45309] hover:text-[#92400e]"
                      >
                        Supabase Auth Providers
                      </a>.
                    </li>
                    <li>Click <strong className="font-semibold">"Add new provider"</strong>.</li>
                    <li>Select <strong className="font-semibold">"Anonymous"</strong> from the options.</li>
                    <li>Enable the toggle switch and click <strong className="font-semibold">"Save"</strong>.</li>
                  </ol>
                  <div className="text-[10px] text-[#b45309] border-t border-[#fef3c7] pt-2">
                    💡 Or use the <strong>"Bypass Auth & Go Offline"</strong> button below to launch the sandbox instantly with mock records!
                  </div>
                </div>
              )}

              {/* 3. Email Auth not enabled Diagnostic Card */}
              {errorCode === "auth/operation-not-allowed" && !authError.includes("Anonymous") && (
                <div className="p-4 bg-[#fffbeb] border border-[#f59e0b] rounded text-[#78350f] text-xs font-sans animate-in fade-in duration-300">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-[#b45309] mb-2 font-mono flex items-center gap-1.5">
                    ⚙️ Action Required: Enable Email/Password Provider
                  </h4>
                  <p className="leading-relaxed mb-3">
                    Please follow these simple steps to enable the Email & Password authentication provider:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-relaxed mb-3">
                    <li>
                      Open your{" "}
                      <a 
                        href="https://supabase.com/dashboard/project/angular-bruin-lfjbn/authentication/providers" 
                        target="_blank" 
                        rel="noreferrer"
                        className="underline font-bold text-[#b45309] hover:text-[#92400e]"
                      >
                        Supabase Dashboard
                      </a>.
                    </li>
                    <li>Click the <strong className="font-semibold">"Add new provider"</strong> button under the "Sign-in method" tab.</li>
                    <li>Select <strong className="font-semibold">"Email/Password"</strong> from the list.</li>
                    <li>Toggle the first switch to <strong className="font-semibold">"Enable"</strong> and click <strong className="font-semibold">"Save"</strong>.</li>
                  </ol>
                  <div className="text-[10px] text-[#b45309] italic font-serif border-t border-[#fef3c7] pt-2">
                    Tip: Once saved, refresh this page and you will be able to create account & sign in immediately!
                  </div>
                </div>
              )}

              {/* 4. Iframe storage partitioning (web-storage-unsupported) Diagnostic card */}
              {errorCode === "auth/web-storage-unsupported" && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs font-sans animate-in fade-in duration-300">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-amber-700 mb-2 font-mono flex items-center gap-1.5">
                    🛡️ Action Required: Cookie & Storage Restrictions
                  </h4>
                  <p className="leading-relaxed mb-2">
                    Your browser's privacy sandbox or Incognito mode is preventing Supabase from initializing third-party auth state in this preview pane.
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed mb-2">
                    <li>Allow third-party cookies for this site, or turn off "Block third-party cookies" in your browser settings.</li>
                    <li>Avoid using Private/Incognito windows for testing Google Auth inside iframe environments.</li>
                  </ul>
                  <p className="text-[10px] text-amber-700 font-serif border-t border-amber-200 pt-2 italic">
                    Alternative: Click <strong>"Instant Guest Access"</strong> or <strong>"Bypass Auth & Go Offline"</strong> to load the app immediately inside the iframe without storage limits!
                  </p>
                </div>
              )}

              {/* 5. Popup Closed or Cancelled Diagnostic Card */}
              {(errorCode === "auth/popup-closed-by-user" || errorCode === "auth/cancelled-popup-request") && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs font-sans animate-in fade-in duration-300">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-amber-700 mb-2 font-mono flex items-center gap-1.5">
                    💡 Hint: Popup Closed or Cancelled
                  </h4>
                  <p className="leading-relaxed mb-2">
                    It looks like the authentication pop-up was closed or cancelled before it could complete.
                  </p>
                  <p className="leading-relaxed mb-3">
                    If you closed the window intentionally, you can log in instantly or work with offline records:
                  </p>
                  <ul className="list-disc pl-4 space-y-1.5 text-[11px] leading-relaxed mb-3">
                    <li>Click <strong className="font-semibold">"Instant Guest Access"</strong> below to create a quick, temporary cloud profile.</li>
                    <li>Click <strong className="font-semibold">"Bypass Auth & Go Offline"</strong> to load the sandbox with pre-configured mock data instantly.</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-b-0 border-[#3b5249] mb-4"></div>
              <p className="font-mono text-xs text-[#5c544d]">Authorizing signature keys...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Primary Authentication Actions Stack */}
              <div className="space-y-3">
                {/* 1. Recommended: Google Sign In */}
                <button
                  id="google-signin-btn"
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-3 px-4 border border-[#c5beaf] bg-white hover:bg-[#faf9f6] text-[#332f2b] active:scale-[0.98] transition-all rounded font-medium text-xs flex items-center justify-center gap-3 shadow-sm font-sans cursor-pointer hover:border-[#3b5249] focus:outline-none"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.58-4.53-5.84-2.63z"
                    ></path>
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    ></path>
                  </svg>
                  Sign in with Google Account
                </button>


              </div>



              {/* Form Tab Toggles */}
              <div className="flex bg-[#f2ede4] p-1 rounded border border-[#dfdcd0] gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setAuthError(null);
                    setErrorCode(null);
                  }}
                  className={`flex-1 py-1.5 text-center text-xs font-mono font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                    !isSignUp
                      ? "bg-[#3b5249] text-white shadow-sm"
                      : "text-[#6e645a] hover:text-[#1c1a18]"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setAuthError(null);
                    setErrorCode(null);
                  }}
                  className={`flex-1 py-1.5 text-center text-xs font-mono font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                    isSignUp
                      ? "bg-[#3b5249] text-white shadow-sm"
                      : "text-[#6e645a] hover:text-[#1c1a18]"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Real Supabase Email/Password Form */}
              <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <Mail className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="curator@secludehotels.com"
                      className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1">
                    Signature Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-sans"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#3b5249] text-[#fdfcf7] hover:bg-[#2e3f38] font-mono uppercase tracking-wider font-bold text-xs rounded transition-all shadow active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSignUp ? (
                      <>
                        <UserPlus className="w-3.5 h-3.5" /> Register Heritage Account
                      </>
                    ) : (
                      <>
                        <LogIn className="w-3.5 h-3.5" /> Authenticate & Open Ledger
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Palace Lease Legal Compliance Notice */}
          <div className="mt-6 pt-4 border-t border-dashed border-[#dcd6c8] text-center">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#f5efe4] border border-[#dfd2be] text-[9px] font-mono text-[#5c544d]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#3b5249]" /> 15-Year Palace Lease Binding App
            </span>
            <p className="text-[10px] text-[#8e847a] font-serif leading-relaxed mt-2 italic px-2">
              Warning: All movements, catalog acquisitions, and condition audits logged herein are legally binding under the Seclude Palace Royal Lease Agreement Section 9(b). Delete logs are archived permanently.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
