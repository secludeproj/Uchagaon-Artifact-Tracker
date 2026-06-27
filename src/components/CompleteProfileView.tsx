import React, { useState } from "react";
import { Compass, Sparkles } from "lucide-react";

interface CompleteProfileViewProps {
  email: string;
  onComplete: (profile: { name: string; avatar: string; role: string }) => void;
  onCancel: () => void;
}

export default function CompleteProfileView({ email, onComplete, onCancel }: CompleteProfileViewProps) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🧑");
  const [role, setRole] = useState("Staff");
  const [error, setError] = useState("");

  const avatarOptions = ["🧑", "👨💼", "👩💼", "🧑🎨", "🧑🔬", "🧑💻", "👑", "🏛️", "⚔️", "📜", "🎭", "🦁"];
  const roleOptions = [
    { value: "Admin", label: "Admin (Curation & Full Management)" },
    { value: "Staff", label: "Staff (Standard Custody Logins)" },
    { value: "Owner View", label: "Owner View (Royal Audit Oversight)" }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a custom display name.");
      return;
    }
    onComplete({
      name: name.trim(),
      avatar,
      role
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f2eb] ledger-grid p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#fdfcf7] border-2 border-[#d3cdc0] rounded-lg shadow-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#3b5249]"></div>
        
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#eae5d9] border border-[#d2cca0] mb-3 text-[#3b5249]">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <h2 className="font-serif text-xl tracking-tight text-[#1c1a18] font-bold">
              COMPLETE YOUR PROFILE
            </h2>
            <p className="font-mono text-[9px] tracking-widest text-[#5c544d] uppercase font-bold mt-1">
              Initialize Palace Curatorial Key
            </p>
            <div className="h-px bg-gradient-to-r from-transparent via-[#c4bcae] to-transparent my-3"></div>
            <p className="text-xs text-[#6e645a] font-serif italic">
              Logged in as <span className="font-sans font-semibold not-italic text-[#3b5249]">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded font-sans">
                {error}
              </div>
            )}

            {/* Custom Name */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1.5">
                Custom Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="e.g. Maharani Gayatri Devi"
                className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-sans"
              />
            </div>

            {/* Avatar Selector */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-2">
                Pick Your Avatar Seal
              </label>
              <div className="grid grid-cols-6 gap-2 bg-[#f8f6f0] p-3 rounded border border-[#e5dfd3]">
                {avatarOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatar(emoji)}
                    className={`text-2xl p-1.5 rounded transition-all duration-150 flex items-center justify-center cursor-pointer ${
                      avatar === emoji
                        ? "bg-[#3b5249] scale-110 shadow-md border border-[#3b5249]"
                        : "hover:bg-[#eae5d9] bg-transparent opacity-75 hover:opacity-100"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Assignment */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1.5">
                Assigned Royal Lease Role
              </label>
              <div className="space-y-2">
                {roleOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-2.5 rounded border transition-all cursor-pointer ${
                      role === opt.value
                        ? "bg-[#f2efe6] border-[#3b5249] text-[#1c1a18]"
                        : "bg-white border-[#c8c2b5] hover:bg-[#faf9f6] text-[#5c544d]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="assignedRole"
                      value={opt.value}
                      checked={role === opt.value}
                      onChange={() => setRole(opt.value)}
                      className="accent-[#3b5249] h-3.5 w-3.5 shrink-0"
                    />
                    <span className="text-xs font-sans font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-[#3b5249] text-[#fdfcf7] hover:bg-[#2e3f38] font-mono uppercase tracking-wider font-bold text-xs rounded transition-all shadow active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#e2dcce]" /> Initialize Curatorial Seal
              </button>
              
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2 border border-[#c8c2b5] text-center text-xs font-mono font-semibold text-[#6e645a] hover:bg-gray-100 rounded transition duration-150 cursor-pointer"
              >
                Cancel & Sign Out
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
