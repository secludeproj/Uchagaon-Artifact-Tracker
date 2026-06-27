import React, { useState } from "react";
import { User, Shield, Sparkles, X, Save, Image, Smile } from "lucide-react";
// Supabase - profile updates handled via db.ts
import { supabase } from "../lib/supabase";

interface EditProfileModalProps {
  currentUser: {
    name: string;
    email: string;
    role: string;
    avatarUrl: string;
  };
  onClose: () => void;
  onSave: (updatedProfile: { name: string; role: string; avatarUrl: string }) => void;
}

export default function EditProfileModal({ currentUser, onClose, onSave }: EditProfileModalProps) {
  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState(currentUser.avatarUrl || "🧑");
  const [role, setRole] = useState(currentUser.role || "Staff");
  const [useCustomUrl, setUseCustomUrl] = useState(!["🧑", "👨💼", "👩💼", "🧑🎨", "🧑🔬", "🧑💻", "👑", "🏛️", "⚔️", "📜", "🎭", "🦁"].includes(currentUser.avatarUrl));
  const [customUrl, setCustomUrl] = useState(!["🧑", "👨💼", "👩💼", "🧑🎨", "🧑🔬", "🧑💻", "👑", "🏛️", "⚔️", "📜", "🎭", "🦁"].includes(currentUser.avatarUrl) ? currentUser.avatarUrl : "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const avatarOptions = ["🧑", "👨💼", "👩💼", "🧑🎨", "🧑🔬", "🧑💻", "👑", "🏛️", "⚔️", "📜", "🎭", "🦁"];
  const roleOptions = [
    { value: "Admin", label: "Admin (Curation & Full Management)" },
    { value: "Staff", label: "Staff (Standard Custody Logins)" },
    { value: "Owner View", label: "Owner View (Royal Audit Oversight)" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Display name cannot be empty.");
      return;
    }

    setIsSaving(true);
    setError("");

    const finalAvatar = useCustomUrl ? customUrl.trim() || "🧑" : avatar;

    const updatedProfile = {
      name: name.trim(),
      role: role,
      avatarUrl: finalAvatar,
      email: currentUser.email
    };

    // Call onSave immediately — App.tsx handles Supabase save in background
    onSave(updatedProfile);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="edit-profile-card"
        className="relative w-full max-w-md bg-[#fdfcf7] border-2 border-[#d3cdc0] rounded-lg shadow-2xl overflow-hidden"
      >
        {/* Top Gold/Emerald Line */}
        <div className="h-1.5 bg-[#3b5249] w-full"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          id="close-profile-modal"
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-[#eae5d9] transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h3 className="font-serif text-lg tracking-tight text-[#1c1a18] font-bold uppercase">
              Edit Curator Profile
            </h3>
            <p className="font-mono text-[9px] tracking-widest text-[#8e847a] uppercase font-bold mt-1">
              Adjust Palace Authorization Keys
            </p>
            <div className="h-px bg-gradient-to-r from-transparent via-[#c4bcae] to-transparent my-2.5"></div>
            <p className="text-xs text-[#6e645a] font-serif italic">
              Updating key credentials for <span className="font-sans font-semibold not-italic text-[#3b5249]">{currentUser.email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div id="profile-edit-error" className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded font-sans">
                {error}
              </div>
            )}

            {/* Display Name Input */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  id="profile-name-input"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  className="w-full text-xs pl-9 p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-sans text-gray-900 font-medium"
                />
              </div>
            </div>

            {/* Avatar Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d]">
                  Pick Your Seal / Avatar
                </label>
                <button
                  type="button"
                  id="toggle-custom-avatar-url"
                  onClick={() => setUseCustomUrl(!useCustomUrl)}
                  className="text-[10px] font-mono font-bold text-[#3b5249] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {useCustomUrl ? (
                    <>
                      <Smile className="w-3 h-3" /> Use Classic Seals
                    </>
                  ) : (
                    <>
                      <Image className="w-3 h-3" /> Custom Photo URL
                    </>
                  )}
                </button>
              </div>

              {useCustomUrl ? (
                <div>
                  <input
                    type="url"
                    id="profile-custom-avatar-input"
                    value={customUrl}
                    onChange={(e) => {
                      setCustomUrl(e.target.value);
                      setError("");
                    }}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-mono text-gray-700"
                  />
                  <p className="text-[9px] text-[#8e847a] mt-1 font-serif italic">
                    Paste a secure absolute URL to a landscape or square portrait image.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-2 bg-[#f8f6f0] p-3 rounded border border-[#e5dfd3]">
                  {avatarOptions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      id={`seal-opt-${emoji}`}
                      onClick={() => setAvatar(emoji)}
                      className={`text-2xl p-1.5 rounded transition-all duration-150 flex items-center justify-center cursor-pointer ${avatar === emoji
                        ? "bg-[#3b5249] scale-110 shadow-md border border-[#3b5249]"
                        : "hover:bg-[#eae5d9] bg-transparent opacity-75 hover:opacity-100"
                        }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Role Options */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1.5">
                Assigned Royal Lease Role
              </label>
              <div className="space-y-1.5">
                {roleOptions.map((opt) => (
                  <label
                    key={opt.value}
                    id={`role-opt-label-${opt.value}`}
                    className={`flex items-center gap-3 p-2.5 rounded border transition-all cursor-pointer ${role === opt.value
                      ? "bg-[#f2efe6] border-[#3b5249] text-[#1c1a18]"
                      : "bg-white border-[#c8c2b5] hover:bg-[#faf9f6] text-[#5c544d]"
                      }`}
                  >
                    <input
                      type="radio"
                      name="assignedRole"
                      id={`role-radio-${opt.value}`}
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

            {/* Actions */}
            <div className="pt-3 flex gap-2">
              <button
                type="button"
                id="cancel-profile-edit"
                onClick={onClose}
                className="flex-1 py-2 border border-[#c8c2b5] text-center text-xs font-mono font-semibold text-[#6e645a] hover:bg-gray-100 rounded transition duration-150 cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                id="save-profile-edit"
                disabled={isSaving}
                className="flex-1 py-2 bg-[#3b5249] text-[#fdfcf7] hover:bg-[#2e3f38] disabled:opacity-50 font-mono uppercase tracking-wider font-bold text-xs rounded transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSaving ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
