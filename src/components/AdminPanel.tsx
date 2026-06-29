import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Shield, User, Check, X, RefreshCw, Trash2, AlertTriangle } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url: string | null;
  joined_date: string;
  last_active: string;
}

interface AdminPanelProps {
  currentUser: { id: string; name: string; email: string; role: string };
  onBack: () => void;
}

const ROLES = ["ADMIN", "STAFF", "OWNER VIEW"];

const roleColors: Record<string, string> = {
  "ADMIN": "bg-emerald-100 text-emerald-800 border-emerald-300",
  "STAFF": "bg-blue-100 text-blue-800 border-blue-300",
  "OWNER VIEW": "bg-purple-100 text-purple-800 border-purple-300",
};

export default function AdminPanel({ currentUser, onBack }: AdminPanelProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  useEffect(() => { loadProfiles(); }, []);

  const startEdit = (profile: Profile) => {
    setEditingId(profile.id);
    setEditRole(profile.role);
    setEditName(profile.name);
    setSuccess("");
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRole("");
    setEditName("");
  };

  const saveProfile = async (profileId: string) => {
    setSavingId(profileId);
    setError("");
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: editName.trim(),
          role: editRole,
          last_active: new Date().toISOString()
        })
        .eq("id", profileId);

      if (error) throw error;

      setSuccess(`Profile updated successfully.`);
      setEditingId(null);
      await loadProfiles();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError("Failed to update profile: " + err.message);
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
    setSavingId(profileId);
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", profileId);
      if (error) throw error;
      setDeleteConfirmId(null);
      setSuccess("Team member removed.");
      await loadProfiles();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError("Failed to remove profile: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-[#1c1a18] text-white rounded-lg p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#3b5249] flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold tracking-tight">Admin Control Panel</h2>
            <p className="text-[11px] font-mono text-gray-400 mt-0.5">Manage team roles and access levels</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadProfiles}
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
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs font-mono flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* Warning */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs font-sans flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
        <span>Changes to roles take effect immediately. ADMIN role grants full access including delete and team management.</span>
      </div>

      {/* Team Members Table */}
      {isLoading ? (
        <div className="bg-white border border-[#dcd6c8] rounded-lg p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#3b5249] border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-xs font-mono text-gray-500">Loading team members...</p>
        </div>
      ) : (
        <div className="bg-white border border-[#dcd6c8] rounded-lg shadow-sm overflow-hidden">
          <div className="border-b border-[#ece6da] px-5 py-3 bg-[#fdfcf7]">
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

              return (
                <div key={profile.id}
                  className={`p-4 sm:p-5 ${isEditing ? "bg-[#f4faf3]" : "hover:bg-[#fdfcf7]"} transition-all`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                    {/* Avatar + Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#eae5d9] border border-[#d3cdc0] flex items-center justify-center shrink-0 overflow-hidden">
                        {profile.avatar_url && profile.avatar_url.length > 4 ? (
                          <img src={profile.avatar_url} alt={profile.name}
                            className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-lg">{profile.avatar_url || "🧑"}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        {isEditing ? (
                          <input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="font-bold text-sm text-[#1c1a18] border border-[#3b5249] rounded px-2 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-[#3b5249]"
                          />
                        ) : (
                          <p className="font-bold text-sm text-[#1c1a18] truncate">
                            {profile.name}
                            {isCurrentUser && (
                              <span className="ml-2 text-[10px] font-mono text-[#3b5249] bg-[#eaf4ea] px-1.5 py-0.5 rounded">YOU</span>
                            )}
                          </p>
                        )}
                        <p className="text-xs text-[#6e645a] truncate mt-0.5">{profile.email}</p>
                        <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                          Joined {formatDate(profile.joined_date)} · Last active {formatDate(profile.last_active)}
                        </p>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="flex items-center gap-3">
                      {isEditing ? (
                        <select
                          value={editRole}
                          onChange={e => setEditRole(e.target.value)}
                          className="text-xs font-mono font-bold border border-[#3b5249] rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#3b5249] bg-white cursor-pointer"
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded border ${roleColors[profile.role] || "bg-gray-100 text-gray-700 border-gray-300"}`}>
                          {profile.role}
                        </span>
                      )}

                      {/* Action buttons */}
                      {isDeleteConfirm ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-700 font-mono">Confirm delete?</span>
                          <button onClick={() => deleteProfile(profile.id)} disabled={isSaving}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-mono rounded cursor-pointer transition-all">
                            Yes
                          </button>
                          <button onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-mono rounded cursor-pointer transition-all">
                            No
                          </button>
                        </div>
                      ) : isEditing ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => saveProfile(profile.id)} disabled={isSaving || !editName.trim()}
                            className="px-3 py-1.5 bg-[#3b5249] hover:bg-[#2c3d36] text-white text-xs font-mono font-bold rounded cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1">
                            {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Save
                          </button>
                          <button onClick={cancelEdit}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-mono rounded cursor-pointer transition-all flex items-center gap-1">
                            <X className="w-3 h-3" /> Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(profile)}
                            className="px-3 py-1.5 bg-[#eae5d9] hover:bg-[#d3cdc0] text-[#3b5249] text-xs font-mono font-bold rounded cursor-pointer transition-all border border-[#d3cdc0]">
                            Edit
                          </button>
                          {!isCurrentUser && (
                            <button onClick={() => setDeleteConfirmId(profile.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded cursor-pointer transition-all border border-red-200">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Role Legend */}
      <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded-lg p-4">
        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#3b5249] mb-3">Role Permissions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
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
