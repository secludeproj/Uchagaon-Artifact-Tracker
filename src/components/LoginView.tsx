import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { Mail, Lock, Eye, EyeOff, AlertTriangle } from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || "Google sign-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setIsLoading(true);
    setAuthError(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        setAuthError("Account created! You can now sign in.");
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        onLoginSuccess();
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f2eb] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <img src="https://seclude.in/wp-content/themes/seclude/images/seclude-logo.png" alt="Seclude Hotels" className="h-16 w-auto mb-2 object-contain" />
          <h1 className="font-serif text-2xl font-bold text-[#1c1a18] tracking-tight">
            Heritage Registry
          </h1>
          <p className="text-xs font-mono text-[#8e847a] mt-1 uppercase tracking-widest">
            Heritage Custody & Preservation Console
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#fdfcf7] border-2 border-[#d3cdc0] rounded-lg shadow-xl overflow-hidden">
          <div className="h-1.5 bg-[#3b5249]"></div>

          <div className="p-8 space-y-5">

            {/* Error/Success */}
            {authError && (
              <div className={`p-3 rounded text-xs font-sans flex items-start gap-2 ${
                authError.includes("created") 
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3 px-4 border border-[#c5beaf] bg-white hover:bg-[#faf9f6] text-[#332f2b] transition-all rounded font-medium text-sm flex items-center justify-center gap-3 shadow-sm cursor-pointer disabled:opacity-50 hover:border-[#3b5249]"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-1.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Sign in with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#e2dcce]"></div>
              <span className="text-[10px] font-mono text-[#9c9388] uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-[#e2dcce]"></div>
            </div>

            {/* Tab switcher */}
            <div className="flex rounded overflow-hidden border border-[#d3cdc0]">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setAuthError(null); }}
                className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  !isSignUp ? "bg-[#3b5249] text-white" : "bg-white text-[#6e645a] hover:bg-[#f5f2eb]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setAuthError(null); }}
                className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isSignUp ? "bg-[#3b5249] text-white" : "bg-white text-[#6e645a] hover:bg-[#f5f2eb]"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e847a]" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full pl-9 pr-4 py-2.5 border border-[#c8c2b5] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#3b5249] focus:border-transparent bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e847a]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-10 py-2.5 border border-[#c8c2b5] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#3b5249] focus:border-transparent bg-white"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e847a] hover:text-[#3b5249] cursor-pointer">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email.trim() || !password.trim()}
                className="w-full py-3 bg-[#3b5249] hover:bg-[#2c3d36] text-white font-mono text-xs font-bold uppercase tracking-widest rounded shadow transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              >
                {isLoading ? "Authenticating..." : isSignUp ? "Create Account" : "Sign In"}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <p className="text-[10px] font-mono text-[#8e847a]">
              Seclude Hotels — Heritage Custody Registry
            </p>
            <p className="text-[9px] text-[#a8a09a] mt-0.5">
              All access is logged and audited
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
