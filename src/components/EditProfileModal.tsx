import React, { useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { X, User, Camera, Image, Upload, Check } from "lucide-react";

interface EditProfileModalProps {
  currentUser: {
    id?: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
  };
  onClose: () => void;
  onSave: (updated: { name: string; role: string; avatarUrl: string; email: string }) => void;
}

const EMOJI_LIST = [
  "🧑","👨‍💼","👩‍💼","🧑‍🎨","🧑‍🔬","🧑‍💻","👑","🏛️","⚔️","📜","🎭","🦁",
  "🌿","🔑","🛡️","✨","🦅","🌺","🏺","🗝️","🦚","🎯"
];

const isEmoji = (val: string | undefined) => !val || val.length <= 4;

export default function EditProfileModal({ currentUser, onClose, onSave }: EditProfileModalProps) {
  const [name, setName] = useState(currentUser.name || "");
  const [avatarMode, setAvatarMode] = useState<"emoji" | "upload" | "url">(
    isEmoji(currentUser.avatarUrl) ? "emoji" : "url"
  );
  const [selectedEmoji, setSelectedEmoji] = useState(
    isEmoji(currentUser.avatarUrl) ? (currentUser.avatarUrl || "🧑") : "🧑"
  );
  const [photoUrl, setPhotoUrl] = useState(
    !isEmoji(currentUser.avatarUrl) ? (currentUser.avatarUrl || "") : ""
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Current preview value
  const currentAvatar = avatarMode === "emoji" ? selectedEmoji : (photoUrl || selectedEmoji);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      // Convert to base64 data URL — works without Supabase Storage bucket
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoUrl(reader.result as string);
        setAvatarMode("upload");
        setUploading(false);
      };
      reader.onerror = () => {
        setError("Failed to read image file.");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError("Upload failed: " + err.message);
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    setIsSaving(true);
    setError("");

    const finalAvatar = avatarMode === "emoji" ? selectedEmoji : (photoUrl || selectedEmoji);

    const updatedProfile = {
      name: name.trim(),
      role: currentUser.role,
      avatarUrl: finalAvatar,
      email: currentUser.email,
    };

    onSave(updatedProfile);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#fdfcf7] border-2 border-[#d3cdc0] rounded-lg shadow-2xl overflow-hidden">
        <div className="h-1.5 bg-[#3b5249] w-full"></div>

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-[#eae5d9] transition-all cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="font-serif text-lg font-bold text-[#1c1a18] tracking-tight">EDIT PROFILE</h2>
            <p className="text-[10px] font-mono text-[#8e847a] uppercase tracking-widest mt-0.5">{currentUser.email}</p>
          </div>

          {error && (
            <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs font-sans">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Avatar preview */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-[#3b5249] bg-[#eae5d9] flex items-center justify-center overflow-hidden shadow-md">
                  {(avatarMode === "emoji") ? (
                    <span className="text-4xl leading-none">{selectedEmoji}</span>
                  ) : photoUrl ? (
                    <img src={photoUrl} alt="avatar" className="w-full h-full object-cover"
                      onError={() => { setPhotoUrl(""); setAvatarMode("emoji"); }} />
                  ) : (
                    <span className="text-4xl leading-none">{selectedEmoji}</span>
                  )}
                </div>
                {uploading && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Avatar mode tabs */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-2">
                Profile Photo / Avatar
              </label>
              <div className="flex rounded overflow-hidden border border-[#d3cdc0] mb-3">
                {[
                  { mode: "emoji" as const, label: "Emoji", icon: "😊" },
                  { mode: "upload" as const, label: "Photo", icon: null },
                  { mode: "url" as const, label: "URL", icon: null },
                ].map(({ mode, label, icon }) => (
                  <button key={mode} type="button"
                    onClick={() => setAvatarMode(mode)}
                    className={`flex-1 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      avatarMode === mode ? "bg-[#3b5249] text-white" : "bg-white text-[#6e645a] hover:bg-[#f5f2eb]"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Emoji picker */}
              {avatarMode === "emoji" && (
                <div className="grid grid-cols-7 gap-1.5 bg-[#f8f6f0] p-3 rounded border border-[#e5dfd3]">
                  {EMOJI_LIST.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => setSelectedEmoji(emoji)}
                      className={`text-2xl p-1 rounded transition-all cursor-pointer flex items-center justify-center ${
                        selectedEmoji === emoji && avatarMode === "emoji"
                          ? "bg-[#3b5249] scale-110 shadow ring-2 ring-[#3b5249]"
                          : "hover:bg-[#eae5d9]"
                      }`}>
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Photo upload */}
              {avatarMode === "upload" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Gallery upload */}
                    <button type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 border-2 border-dashed border-[#c8c2b5] rounded hover:border-[#3b5249] hover:bg-[#f4faf3] transition-all cursor-pointer text-xs font-mono text-[#5c544d] disabled:opacity-50">
                      <Upload className="w-4 h-4" />
                      From Gallery
                    </button>
                    {/* Camera */}
                    <button type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 border-2 border-dashed border-[#c8c2b5] rounded hover:border-[#3b5249] hover:bg-[#f4faf3] transition-all cursor-pointer text-xs font-mono text-[#5c544d] disabled:opacity-50">
                      <Camera className="w-4 h-4" />
                      Camera
                    </button>
                  </div>
                  {/* Gallery input — accepts all images */}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                  {/* Camera input — capture from camera */}
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden"
                    onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                  {photoUrl && (
                    <p className="text-[10px] text-emerald-700 font-mono">✓ Photo uploaded — see preview above</p>
                  )}
                  {uploading && (
                    <p className="text-[10px] text-[#3b5249] font-mono animate-pulse">Processing image...</p>
                  )}
                </div>
              )}

              {/* URL input */}
              {avatarMode === "url" && (
                <div>
                  <input type="url" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)}
                    placeholder="https://example.com/your-photo.jpg"
                    className="w-full text-xs p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-mono text-gray-700" />
                  <p className="text-[9px] text-[#8e847a] mt-1 italic font-serif">
                    Paste a direct link to your photo (must start with https://)
                  </p>
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" required value={name} onChange={e => setName(e.target.value)}
                  className="w-full text-xs pl-9 p-2.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249] font-sans text-gray-900 font-medium" />
              </div>
            </div>

            {/* Role — read only */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#5c544d] mb-1.5">
                Role
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded border border-[#c8c2b5] bg-[#f7f5f0]">
                <span className="text-xs font-mono font-bold text-[#3b5249]">{currentUser.role}</span>
                <span className="text-[10px] text-[#8e847a]">— Contact a Super Admin to change your role</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 border border-[#c8c2b5] text-[#5c544d] rounded font-mono text-xs font-bold hover:bg-[#f5f2eb] transition-all cursor-pointer">
                Discard
              </button>
              <button type="submit" disabled={isSaving || !name.trim()}
                className="flex-1 py-2.5 bg-[#3b5249] hover:bg-[#2c3d36] text-white rounded font-mono text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-[0.98]">
                {isSaving ? "Saving..." : <><Check className="w-3.5 h-3.5" /> Save Profile</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
