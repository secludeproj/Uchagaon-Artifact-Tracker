import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Shield, User, Check, X, RefreshCw, Trash2, AlertTriangle, Camera, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url: string | null;
  joined_date: string;
  last_active: string;
}

interface AuditLog {
  id: string;
  changed_by: string;
  changed_by_email: string;
  target_email: string;
  old_role: string;
  new_role: string;
  old_name: string;
  new_name: string;
  changed_at: string;
}

interface AdminPanelProps {
  currentUser: { id: string; name: string; email: string; role: string };
  onBack: () => void;
}

const ROLES = ["SUPER_ADMIN", "ADMIN", "STAFF", "OWNER VIEW"];

const roleColors: Record<string, string> = {
  "SUPER_ADMIN": "bg-red-100 text-red-800 border-red-400",
  "ADMIN": "bg-emerald-100 text-emerald-800 border-emerald-300",
  "STAFF": "bg-blue-100 text-blue-800 border-blue-300",
  "OWNER VIEW": "bg-purple-100 text-purple-800 border-purple-300",
};

export default function AdminPanel({ currentUser, onBack }: AdminPanelProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [editAvatar, setEditAvatar] = useState<string>("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const EMOJI_LIST = ["🧑", "👨‍💼", "👩‍💼", "🧑‍🎨", "🧑‍🔬", "🧑‍💻", "👑", "🏛️", "⚔️", "📜", "🎭", "🦁", "🌿", "🔑", "🛡️", "✨"];

  const loadProfiles = async () => {
    setIsLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("joined_date", { ascending: true });
      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) {
      setError("Failed to load team members: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const { data } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(50);
      setAuditLogs(data || []);
    } catch (err) {
      // Table may not exist yet — ignore
      setAuditLogs([]);
    }
  };

  useEffect(() => {
    loadProfiles();
    loadAuditLogs();
  }, []);

  const startEdit = (profile: Profile) => {
    setEditingId(profile.id);
    setEditRole(profile.role);
    setEditName(profile.name);
    setEditAvatar(profile.avatar_url || "🧑");
    setSuccess("");
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRole("");
    setEditName("");
    setEditAvatar("");
  };

  // Upload photo to Supabase Storage
  const handlePhotoUpload = async (file: File) => {
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `avatar-${editingId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setEditAvatar(data.publicUrl);
    } catch (err: any) {
      // Fallback: convert to base64 data URL
      const reader = new FileReader();
      reader.onload = () => setEditAvatar(reader.result as string);
      reader.readAsDataURL(file);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = async (profileId: string) => {
    const targetProfile = profiles.find(p => p.id === profileId);
    if (!targetProfile) return;

    setSavingId(profileId);
    setError("");
    try {
      // Use service-level update via RPC to bypass RLS for admin
      const { error } = await supabase.rpc("admin_update_profile", {
        target_id: profileId,
        new_name: editName.trim(),
        new_role: editRole,
        new_avatar: editAvatar || null,
      });

      if (error) {
        // RPC may not exist yet — fall back to direct update
        const { error: directError } = await supabase
          .from("profiles")
          .update({
            name: editName.trim(),
            role: editRole,
            avatar_url: editAvatar || null,
            last_active: new Date().toISOString()
          })
          .eq("id", profileId);

        if (directError) throw directError;
      }

      // Log the change to audit log (best effort)
      try {
        await supabase.from("admin_audit_logs").insert({
          changed_by: currentUser.name,
          changed_by_email: currentUser.email,
          target_email: targetProfile.email,
          old_role: targetProfile.role,
          new_role: editRole,
          old_name: targetProfile.name,
          new_name: editName.trim(),
          changed_at: new Date().toISOString(),
        });
      } catch (_) {}

      setSuccess(`✓ ${editName.trim()} updated successfully.`);
      setEditingId(null);
      await loadProfiles();
      await loadAuditLogs();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError("Save failed: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const deleteProfile = async (profileId: string) => {
    if (profileId === currentUser.id) {
      setError("You cannot delete your own profile.");
      setDeleteConfirmId(null);
      return;
    }
    const target = profiles.find(p => p.id === profileId);
    setSavingId(profileId);
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", profileId);
      if (error) throw error;

      // Audit log
      try {
        await supabase.from("admin_audit_logs").insert({
          changed_by: currentUser.name,
          changed_by_email: currentUser.email,
          target_email: target?.email || profileId,
          old_role: target?.role || "",
          new_role: "DELETED",
          old_name: target?.name || "",
          new_name: "DELETED",
          changed_at: new Date().toISOString(),
        });
      } catch (_) {}

      setDeleteConfirmId(null);
      setSuccess("✓ Team member removed.");
      await loadProfiles();
      await loadAuditLogs();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError("Failed to remove: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const isEmojiAvatar = (url: string | null) => !url || url.length <= 4;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-[#1c1a18] text-white rounded-lg p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#3b5249] flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="block text-[9px] font-mono uppercase tracking-widest text-[#a8baa2] font-bold mb-0.5">Seclude Fort Uchagaon</span>
            <h2 className="font-serif text-lg font-bold tracking-tight">Admin Control Panel</h2>
            <p className="text-[11px] font-mono text-gray-400 mt-0.5">Super Admin Panel — only SUPER_ADMIN can change roles. Logged by {currentUser.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { loadProfiles(); loadAuditLogs(); }}
            className="p-2 bg-[#2e2c2a] hover:bg-[#3b5249] rounded border border-[#3e3835] transition-all cursor-pointer">
            <RefreshCw className="w-4 h-4 text-gray-300" />
          </button>
          <button onClick={onBack}
            className="px-3 py-1.5 bg-[#2e2c2a] hover:bg-[#3e3835] text-gray-300 text-xs font-mono rounded border border-[#3e3835] transition-all cursor-pointer">
            ← Back
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-xs font-mono flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs font-mono flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* Team Members */}
      {isLoading ? (
        <div className="bg-white border border-[#dcd6c8] rounded-lg p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#3b5249] border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-xs font-mono text-gray-500">Loading team...</p>
        </div>
      ) : (
        <div className="bg-white border border-[#dcd6c8] rounded-lg shadow-sm overflow-hidden">
          <div className="border-b border-[#ece6da] px-5 py-3 bg-[#fdfcf7] flex items-center justify-between">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#3b5249]">
              Team Members — {profiles.length} registered
            </h3>
          </div>

          <div className="divide-y divide-[#f0ece4]">
            {profiles.map((profile) => {
              const isEditing = editingId === profile.id;
              const isSaving = savingId === profile.id;
              const isCurrentUser = profile.id === currentUser.id;
              const isDeleteConfirm = deleteConfirmId === profile.id;
              const avatarIsEmoji = isEmojiAvatar(profile.avatar_url);

              return (
                <div key={profile.id}
                  className={`p-4 sm:p-5 ${isEditing ? "bg-[#f4faf3] border-l-4 border-[#3b5249]" : "hover:bg-[#fdfcf7]"} transition-all`}>

                  {/* Main row */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-[#eae5d9] border-2 border-[#d3cdc0] flex items-center justify-center overflow-hidden">
                        {avatarIsEmoji ? (
                          <span className="text-2xl">{profile.avatar_url || "🧑"}</span>
                        ) : (
                          <img src={profile.avatar_url!} alt={profile.name}
                            className="w-full h-full object-cover" referrerPolicy="no-referrer"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                          className="font-bold text-sm text-[#1c1a18] border border-[#3b5249] rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-[#3b5249] mb-1" />
                      ) : (
                        <p className="font-bold text-sm text-[#1c1a18] truncate">
                          {profile.name}
                          {isCurrentUser && <span className="ml-2 text-[10px] font-mono text-[#3b5249] bg-[#eaf4ea] px-1.5 py-0.5 rounded">YOU</span>}
                        </p>
                      )}
                      <p className="text-xs text-[#6e645a] truncate">{profile.email}</p>
                      <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                        Joined {formatDate(profile.joined_date)} · Last active {formatDate(profile.last_active)}
                      </p>
                    </div>

                    {/* Role + Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {isEditing ? (
                        <select value={editRole} onChange={e => setEditRole(e.target.value)}
                          className="text-xs font-mono font-bold border border-[#3b5249] rounded px-2 py-1.5 focus:outline-none bg-white cursor-pointer">
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded border ${roleColors[profile.role] || "bg-gray-100 text-gray-700 border-gray-300"}`}>
                          {profile.role}
                        </span>
                      )}

                      {isDeleteConfirm ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-700 font-mono">Delete?</span>
                          <button onClick={() => deleteProfile(profile.id)} disabled={isSaving}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-mono rounded cursor-pointer">Yes</button>
                          <button onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-mono rounded cursor-pointer">No</button>
                        </div>
                      ) : isEditing ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => saveProfile(profile.id)} disabled={isSaving || !editName.trim()}
                            className="px-3 py-1.5 bg-[#3b5249] hover:bg-[#2c3d36] text-white text-xs font-mono font-bold rounded cursor-pointer disabled:opacity-50 flex items-center gap-1 transition-all">
                            {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                          </button>
                          <button onClick={cancelEdit}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-mono rounded cursor-pointer flex items-center gap-1">
                            <X className="w-3 h-3" /> Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(profile)}
                            className="px-3 py-1.5 bg-[#eae5d9] hover:bg-[#d3cdc0] text-[#3b5249] text-xs font-mono font-bold rounded cursor-pointer border border-[#d3cdc0] transition-all">
                            Edit
                          </button>
                          {!isCurrentUser && (
                            <button onClick={() => setDeleteConfirmId(profile.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded cursor-pointer border border-red-200 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Edit expanded — avatar + photo upload */}
                  {isEditing && (
                    <div className="mt-4 pt-4 border-t border-[#d4ecd4] space-y-3">
                      {/* Avatar preview */}
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-[#eae5d9] border-2 border-[#3b5249] flex items-center justify-center overflow-hidden shrink-0">
                          {isEmojiAvatar(editAvatar) ? (
                            <span className="text-3xl">{editAvatar || "🧑"}</span>
                          ) : (
                            <img src={editAvatar} alt="avatar" className="w-full h-full object-cover"
                              onError={() => setEditAvatar("🧑")} />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-mono font-bold text-[#3b5249] uppercase tracking-wider mb-1.5">Profile Photo / Avatar</p>
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                              className="px-2.5 py-1 bg-[#3b5249] text-white text-xs font-mono rounded cursor-pointer flex items-center gap-1 hover:bg-[#2c3d36] transition-all">
                              <Camera className="w-3 h-3" /> {uploadingAvatar ? "Uploading..." : "Upload Photo"}
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                              onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
                            <input value={isEmojiAvatar(editAvatar) ? "" : editAvatar}
                              onChange={e => setEditAvatar(e.target.value)}
                              placeholder="Or paste image URL..."
                              className="flex-1 text-xs border border-[#d3cdc0] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#3b5249] min-w-0" />
                          </div>
                        </div>
                      </div>

                      {/* Emoji picker */}
                      <div>
                        <p className="text-[10px] font-mono font-bold text-[#3b5249] uppercase tracking-wider mb-1.5">Or Choose Emoji Avatar</p>
                        <div className="flex flex-wrap gap-1.5">
                          {EMOJI_LIST.map(emoji => (
                            <button key={emoji} onClick={() => setEditAvatar(emoji)}
                              className={`w-8 h-8 rounded text-lg flex items-center justify-center transition-all cursor-pointer ${editAvatar === emoji ? "bg-[#3b5249] ring-2 ring-[#3b5249]" : "bg-[#f0ece4] hover:bg-[#e0dcd4]"}`}>
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Audit Log */}
      <div className="bg-white border border-[#dcd6c8] rounded-lg shadow-sm overflow-hidden">
        <button onClick={() => setShowAudit(!showAudit)}
          className="w-full border-b border-[#ece6da] px-5 py-3 bg-[#fdfcf7] flex items-center justify-between cursor-pointer hover:bg-[#f4f0e8] transition-all">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#3b5249]" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#3b5249]">
              Admin Audit Log — {auditLogs.length} changes recorded
            </h3>
          </div>
          {showAudit ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showAudit && (
          <div className="divide-y divide-[#f0ece4] max-h-80 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-gray-400">No role changes have been made yet.</div>
            ) : auditLogs.map((log) => (
              <div key={log.id} className="px-5 py-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-gray-400">{new Date(log.changed_at).toLocaleString("en-IN")}</span>
                  <span className="font-mono text-[#3b5249] font-bold">{log.changed_by}</span>
                </div>
                <p className="mt-1 text-[#1c1a18]">
                  Changed <strong>{log.target_email}</strong>:
                  {log.old_name !== log.new_name && <span className="ml-1">Name <span className="line-through text-gray-400">{log.old_name}</span> → <span className="font-bold">{log.new_name}</span></span>}
                  {log.old_role !== log.new_role && <span className="ml-1">Role <span className={`px-1 rounded ${roleColors[log.old_role] || "bg-gray-100"}`}>{log.old_role}</span> → <span className={`px-1 rounded ${roleColors[log.new_role] || "bg-gray-100"}`}>{log.new_role}</span></span>}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Role Legend */}
      <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded-lg p-4">
        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#3b5249] mb-3">Role Permissions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { role: "SUPER_ADMIN", desc: "Full system control — manage all roles including promoting other Super Admins. Only role that can access this panel." },
            { role: "ADMIN", desc: "Full access — add, edit, delete artifacts, manage team, view all reports" },
            { role: "STAFF", desc: "Add and edit artifacts, log movements and inspections, view all data" },
            { role: "OWNER VIEW", desc: "Read-only access — view artifacts, reports, and analytics only" },
          ].map(({ role, desc }) => (
            <div key={role} className="p-3 bg-white border border-[#ece6da] rounded">
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${roleColors[role]}`}>{role}</span>
              <p className="text-[11px] text-[#6e645a] mt-2 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
