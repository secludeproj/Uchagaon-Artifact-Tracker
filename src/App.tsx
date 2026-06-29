import React, { useState, useEffect, useRef } from "react";
import { Artifact, Staff, TeamActivity } from "./types";

// Supabase
import { supabase } from "./lib/supabase";
import {
  fetchAllArtifacts,
  insertArtifact,
  updateArtifact,
  deleteArtifact,
  logMovement,
  logInspection,
  logActivity,
  fetchTeamActivity,
  fetchAllStaff,
  upsertProfile,
  fetchProfile,
  bulkInsertArtifacts,
} from "./lib/db";
import { seedTestData } from "./lib/seedData";

// Components
import LoginView from "./components/LoginView";
import CompleteProfileView from "./components/CompleteProfileView";
import DashboardView from "./components/DashboardView";
import AllArtifactsView from "./components/AllArtifactsView";
import ByLocationView from "./components/ByLocationView";
import ItemDetailView from "./components/ItemDetailView";
import AddEditFormView from "./components/AddEditFormView";
import BulkImportView from "./components/BulkImportView";
import QRHubView from "./components/QRHubView";
import ReconciliationReportView from "./components/ReconciliationReportView";
import TeamView from "./components/TeamView";
import QRScannerModal from "./components/QRScannerModal";
import GuestStoryCardView from "./components/GuestStoryCardView";
import EditProfileModal from "./components/EditProfileModal";

import {
  Compass, Layers, MapPin, QrCode, FileText, Users,
  User as UserIcon, LogOut, Menu, X, Download, Sparkles,
  FileSpreadsheet, Camera, Trash2
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showBypassButton, setShowBypassButton] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Data state
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [activity, setActivity] = useState<TeamActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [isOnline, setIsOnline] = useState(true);

  // Navigation state
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [filteredStateMode, setFilteredStateMode] = useState<string | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isGlobalScannerOpen, setIsGlobalScannerOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

  // ── Auth: Listen to Supabase session ───────────────────────────────────────

  useEffect(() => {
    // Show bypass button after 5s
    const bypassTimer = setTimeout(() => setShowBypassButton(true), 5000);

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await handleUserSession(session.user.id, session.user.email || "", session.user.user_metadata?.full_name || "");
      } else {
        // No Supabase session — only allow offline bypass if explicitly set
        const bypass = localStorage.getItem("offline_bypass");
        if (bypass === "true") {
          const saved = localStorage.getItem("seclude_operator");
          if (saved) {
            try { setCurrentUser(JSON.parse(saved)); } catch { }
          }
        } else {
          // No session and no bypass — clear any stale localStorage and show login
          localStorage.removeItem("seclude_operator");
        }
        setIsAuthLoading(false);
      }
    });

    // Listen for auth changes (OAuth redirect back)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await handleUserSession(session.user.id, session.user.email || "", session.user.user_metadata?.full_name || "");
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        // Silent token refresh — don't reload data, just update session
        console.log("Token refreshed silently");
      } else if (event === "SIGNED_OUT") {
        // Clear everything
        localStorage.removeItem("seclude_operator");
        localStorage.removeItem("offline_bypass");
        setCurrentUser(null);
        setArtifacts([]);
        setStaff([]);
        setActivity([]);
        setIsAuthLoading(false);
      }
    });

    return () => {
      clearTimeout(bypassTimer);
      subscription.unsubscribe();
    };
  }, []);

  const handleUserSession = async (userId: string, email: string, name: string) => {
    setIsAuthLoading(true);
    // Always clear any guest/bypass data first — real auth takes priority
    localStorage.removeItem("offline_bypass");

    try {
      let profile = await fetchProfile(userId);
      if (!profile) {
        // New Google user — show profile setup
        setShowProfileSetup(true);
        setIsAuthLoading(false);
        return;
      }
      // ALWAYS use Supabase profile data — never localStorage for real users
      const user: CurrentUser = {
        id: userId,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        avatarUrl: profile.avatar_url || undefined,
      };
      setCurrentUser(user);
      // Store only as a convenience cache — will be overridden on next login
      localStorage.setItem("seclude_operator", JSON.stringify(user));
      setShowProfileSetup(false);
      await loadAllData();
    } catch (err) {
      console.warn("Session load error:", err);
      // Network error — show login rather than fall back to stale/guest cache
      setCurrentUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // ── Data Loading with Supabase Realtime ────────────────────────────────────

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [arts, stf, act] = await Promise.all([
        fetchAllArtifacts(),
        fetchAllStaff(),
        fetchTeamActivity(),
      ]);
      setArtifacts(arts);
      setStaff(stf);
      setActivity(act);
      setIsOnline(true);
      setInventoryError("");
    } catch (err: any) {
      console.warn("Data load error:", err);
      setInventoryError("Connection issue. Data may not be current.");
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up Supabase Realtime subscription for live updates
  useEffect(() => {
    if (!currentUser) return;

    loadAllData();

    // Subscribe to artifact changes — updates appear instantly for all users
    const channel = supabase
      .channel("artifacts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "artifacts" }, () => {
        loadAllData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "movement_logs" }, () => {
        loadAllData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "inspection_logs" }, () => {
        loadAllData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // ── Auth Handlers ──────────────────────────────────────────────────────────

  const handleBypassLoading = () => {
    const saved = localStorage.getItem("seclude_operator");
    const profile = saved ? JSON.parse(saved) : {
      id: "offline-user",
      name: "Imperial Palace Custodian",
      email: "guest-custodian@secludehotels.com",
      role: "ADMIN",
    };
    localStorage.setItem("offline_bypass", "true");
    localStorage.setItem("seclude_operator", JSON.stringify(profile));
    setCurrentUser(profile);
    setShowProfileSetup(false);
    setIsAuthLoading(false);
    setActiveView("dashboard");
  };

  const handleLoginSuccess = () => {
    // After Google OAuth, onAuthStateChange fires automatically
  };

  const handleCompleteProfile = async (profileData: { name: string; avatar: string; role: string }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    setIsAuthLoading(true);
    try {
      await upsertProfile(session.user.id, {
        name: profileData.name,
        email: session.user.email || "",
        role: profileData.role,
        avatar_url: profileData.avatar,
      });
      const user: CurrentUser = {
        id: session.user.id,
        name: profileData.name,
        email: session.user.email || "",
        role: profileData.role,
        avatarUrl: profileData.avatar,
      };
      setCurrentUser(user);
      localStorage.setItem("seclude_operator", JSON.stringify(user));
      setShowProfileSetup(false);
      await loadAllData();
      setActiveView("dashboard");
    } catch (err) {
      console.error("Profile save error:", err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    // Clear local state first
    localStorage.removeItem("seclude_operator");
    localStorage.removeItem("offline_bypass");
    setCurrentUser(null);
    setArtifacts([]);
    setStaff([]);
    setActivity([]);

    // Sign out from Supabase
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Supabase sign out error:", err);
    }

    // Force full page reload to login screen
    window.location.href = "/";
  };

  // ── Navigation ─────────────────────────────────────────────────────────────

  const navigateToView = (view: string, targetId?: string) => {
    setMobileMenuOpen(false);
    const userRole = currentUser?.role?.trim()?.toUpperCase() || "";
    const isAdmin = userRole === "ADMIN" || userRole.includes("CONSERVATOR") || userRole.includes("CHIEF");
    const isOwnerView = userRole === "OWNER VIEW" || userRole === "OWNER" || userRole === "READ-ONLY";

    let targetView = view;
    if ((view === "reconcile" || view === "team") && !isAdmin) targetView = "dashboard";
    if ((view === "add" || view === "edit" || view === "bulk") && isOwnerView) targetView = "dashboard";

    setActiveView(targetView);

    if (targetView === "all" && targetId) {
      setFilteredStateMode(targetId);
    } else {
      setFilteredStateMode(undefined);
    }

    if (targetId && targetView !== "all") {
      setSelectedItemId(targetId);
    }
  };

  // ── CRUD Operations ────────────────────────────────────────────────────────

  const handleSaveItem = async (payload: any) => {
    if (!currentUser) return;
    const user = { name: currentUser.name, email: currentUser.email };
    const isEdit = activeView === "edit" && selectedItemId;

    try {
      setIsLoading(true);
      if (isEdit) {
        await updateArtifact(selectedItemId!, payload, user);
        await logActivity("edit", payload.name, selectedItemId!, `Updated artifact details`, { id: currentUser.id, ...user });
        navigateToView("item-detail", selectedItemId!);
      } else {
        const saved = await insertArtifact(payload, user);
        await logActivity("add", saved.name, saved.id, `Added new artifact to registry`, { id: currentUser.id, ...user });
        navigateToView("item-detail", saved.id);
      }
      await loadAllData();
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Error saving artifact: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustodyMove = async (
    id: string,
    moveData: { newLocation: string; newStatus: string; note: string }
  ) => {
    if (!currentUser) return;
    const artifact = artifacts.find(a => a.id === id);
    if (!artifact) return;
    const user = { name: currentUser.name, email: currentUser.email };

    try {
      setIsLoading(true);
      await logMovement(id, moveData, artifact, user);
      await logActivity("move", artifact.name, id,
        `Moved from ${artifact.currentLocation} to ${moveData.newLocation}`,
        { id: currentUser.id, ...user }
      );
      await loadAllData();
    } catch (err: any) {
      console.error("Move error:", err);
      alert("Error recording custody transfer: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateItem = async (id: string, updatedFields: Partial<Artifact>) => {
    if (!currentUser) return;
    const user = { name: currentUser.name, email: currentUser.email };
    try {
      await updateArtifact(id, updatedFields, user);
      // Handle inspection log if present
      if (updatedFields.inspectionHistory && updatedFields.inspectionHistory.length > 0) {
        const latest = updatedFields.inspectionHistory[0];
        await logInspection(id, {
          notes: latest.notes,
          condition: latest.condition,
          photoUrl: latest.photoUrl,
        }, user);
        await logActivity("edit", updatedFields.name || id, id,
          `Logged inspection — condition: ${latest.condition}`,
          { id: currentUser.id, ...user }
        );
      }
      await loadAllData();
    } catch (err: any) {
      console.error("Update error:", err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setItemToDeleteId(itemId);
  };

  const confirmDelete = async () => {
    if (!itemToDeleteId || !currentUser) return;
    const artifact = artifacts.find(a => a.id === itemToDeleteId);
    try {
      setIsLoading(true);
      await deleteArtifact(itemToDeleteId);
      await logActivity("delete", artifact?.name || itemToDeleteId, itemToDeleteId,
        "Artifact withdrawn from registry",
        { id: currentUser.id, name: currentUser.name, email: currentUser.email }
      );
      setItemToDeleteId(null);
      navigateToView("all");
      await loadAllData();
    } catch (err: any) {
      console.error("Delete error:", err);
      alert("Error deleting artifact: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkImportSuccess = async (rows: any[]) => {
    if (!currentUser) return;
    try {
      setIsLoading(true);
      const count = await bulkInsertArtifacts(rows, { name: currentUser.name, email: currentUser.email });
      await logActivity("import", `Bulk import`, "bulk",
        `Imported ${count} artifacts`,
        { id: currentUser.id, name: currentUser.name, email: currentUser.email }
      );
      await loadAllData();
      navigateToView("all");
    } catch (err: any) {
      alert("Bulk import error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── CSV Export ─────────────────────────────────────────────────────────────

  const handleDownloadFullCSV = () => {
    try {
      if (artifacts.length === 0) return;
      const headers = ["id", "qrCode", "name", "category", "estimatedAge", "material", "dimensions",
        "condition", "estimatedValue", "originalLocation", "currentLocation", "status", "lastInspectedDate", "addedDate"];
      const csvRows = [
        headers.join(","),
        ...artifacts.map(a =>
          headers.map(h => {
            const v = (a as any)[h] || "";
            return `"${String(v).replace(/"/g, '""')}"`;
          }).join(",")
        )
      ];
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "SECLUDE_HERITAGE_PALACE_INVENTORY.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) { console.error(err); }
  };

  // ── Guest Story URL check ──────────────────────────────────────────────────

  let guestStoryId: string | null = null;
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of params.entries()) {
      if (key.toLowerCase() === "storyid" || key.toLowerCase() === "story") {
        guestStoryId = value;
        break;
      }
    }
  }
  if (guestStoryId) return <GuestStoryCardView itemId={guestStoryId} />;

  // ── Loading Screen ─────────────────────────────────────────────────────────

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f2eb] p-4">
        <div className="w-full max-w-sm bg-[#fdfcf7] border-2 border-[#d3cdc0] rounded-lg shadow-xl p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#3b5249]"></div>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#eae5d9] border border-[#d2cca0] mb-4 text-[#3b5249] animate-spin">
            <Compass className="w-8 h-8 text-[#3b5249]" />
          </div>
          <h3 className="font-serif text-lg font-bold tracking-tight text-[#1c1a18]">SECURE ACCESS CHECK</h3>
          <p className="font-mono text-[9px] tracking-widest text-[#5c544d] uppercase font-bold mt-1">VERIFYING CURATORIAL SIGNATURE</p>
          <div className="h-px bg-gradient-to-r from-transparent via-[#c4bcae] to-transparent my-4"></div>
          <p className="text-xs text-[#6e645a] font-serif italic">Connecting to Supabase Heritage Ledger...</p>
          {showBypassButton && (
            <div className="mt-5 pt-4 border-t border-[#eae5d9]">
              <p className="text-[11px] text-[#8e847a] mb-3 leading-relaxed">Taking longer than expected? Go offline with admin privileges.</p>
              <button onClick={handleBypassLoading}
                className="w-full py-2 px-4 bg-[#3b5249] hover:bg-[#2e3f38] text-white rounded text-xs font-mono font-bold tracking-tight shadow-sm transition-all active:scale-95 cursor-pointer">
                Bypass Check & Go Offline
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showProfileSetup) {
    return (
      <CompleteProfileView
        email={(async () => { const { data: { session } } = await supabase.auth.getSession(); return session?.user?.email || ""; })() as any}
        onComplete={handleCompleteProfile}
        onCancel={handleSignOut}
      />
    );
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const userRole = currentUser?.role?.trim()?.toUpperCase() || "";
  const isOwnerView = userRole === "OWNER VIEW" || userRole === "OWNER" || userRole === "READ-ONLY";

  return (
    <div className="min-h-screen bg-[#f7f5f0] flex flex-col justify-between">

      {/* Header */}
      <header className="no-print bg-[#1c1a18] text-[#fdfcf7] border-b border-[#2e2622] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigateToView("dashboard")}
              className="p-1.5 bg-[#3b5249] rounded-full border border-[#4a6358] hover:scale-105 transition-all text-white cursor-pointer">
              <Compass className="w-5 h-5 text-white" />
            </button>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#a8baa2] font-mono leading-none block font-bold">SECLUDE HOTELS</span>
              <h1 className="font-serif text-[15px] font-bold tracking-tight text-white leading-none mt-0.5 flex flex-wrap items-center gap-2">
                <span>SECLUDE INVENTORY MANAGER</span>
                {isOnline ? (
                  <span className="inline-flex items-center gap-1 text-[8px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-900 leading-none shadow-sm">
                    <span className="w-1 h-1 rounded-full bg-emerald-400"></span> LIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[8px] font-mono text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800 animate-pulse leading-none">
                    <span className="w-1 h-1 rounded-full bg-amber-400"></span> OFFLINE
                  </span>
                )}
                {isOwnerView && (
                  <span className="inline-flex items-center gap-1 text-[8.5px] font-mono text-purple-200 bg-purple-950 px-2 py-0.5 rounded border border-purple-900 leading-none shadow-md font-bold">
                    👑 Owner View — Read Only
                  </span>
                )}
              </h1>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => setIsEditProfileOpen(true)}
              className="flex items-center gap-2.5 bg-[#2c2725] hover:bg-[#342e2c] p-1.5 px-3 rounded border border-[#3e3835] transition-all cursor-pointer group">
              <img src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`}
                alt="curator" className="w-7 h-7 rounded-full bg-[#eae5d9] object-cover shrink-0" referrerPolicy="no-referrer" />
              <div className="leading-none">
                <span className="block text-[11px] font-bold font-sans text-[#eae5d9]">{currentUser.name}</span>
                <span className="block text-[9px] font-mono text-gray-400 mt-0.5">{currentUser.role}</span>
              </div>
            </button>
            <button onClick={() => setIsGlobalScannerOpen(true)}
              className="text-xs font-mono font-bold bg-[#3b5249] border border-[#4a6358] text-[#fdfcf7] hover:bg-[#4a6358] py-1.5 px-3.5 rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95">
              <Camera className="w-3.5 h-3.5" /> Scan QR
            </button>
            {!isOwnerView && (
              <button onClick={handleDownloadFullCSV}
                className="text-xs font-mono font-bold border border-[#eae2d0] text-[#eae2d0] hover:bg-[#eae2d0] hover:text-[#1c1a18] py-1.5 px-3 rounded flex items-center gap-1.5 transition-all cursor-pointer">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            )}
            <button onClick={handleSignOut}
              className="text-xs font-mono font-bold bg-red-950 border border-red-900 text-red-100 hover:bg-red-900 py-1.5 px-2.5 rounded flex items-center gap-1 transition-all cursor-pointer">
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white border border-[#3e3835] rounded cursor-pointer">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#1c1a18] border-t border-[#2e2622] p-4 space-y-2">
            {[
              { id: "dashboard", label: "Dashboard", icon: Compass },
              { id: "all", label: "All Artifacts", icon: Layers },
              { id: "location", label: "By Location", icon: MapPin },
              { id: "qrhub", label: "QR Hub", icon: QrCode },
            ].map(m => {
              const Icon = m.icon;
              return (
                <button key={m.id} onClick={() => navigateToView(m.id)}
                  className={`w-full p-2 rounded text-left flex items-center gap-2 text-xs font-mono font-bold ${activeView === m.id ? "bg-[#3b5249] text-white" : "text-[#eae5d9] hover:bg-[#2e2622]"}`}>
                  <Icon className="w-4 h-4" /> {m.label}
                </button>
              );
            })}
            <button onClick={handleSignOut}
              className="w-full p-2 rounded text-left flex items-center gap-2 text-xs font-mono font-bold text-red-300 hover:bg-[#2e2622]">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Main layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Sidebar */}
        <aside className="no-print hidden lg:block lg:col-span-3 space-y-4">
          <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded shadow-sm p-4 space-y-4">
            <span className="block text-[10px] font-mono font-bold uppercase tracking-widest text-[#8e847a] mb-2 px-2.5">Ledger Sub-Consoles</span>
            <nav className="space-y-1 text-xs font-serif italic text-[#34302c]">
              {[
                { id: "dashboard", label: "Dashboard", icon: Compass },
                { id: "all", label: "All Artifacts", icon: Layers },
                { id: "location", label: "By Location", icon: MapPin },
                { id: "qrhub", label: "QR Label Hub", icon: QrCode },
                { id: "reconcile", label: "Lease Reconcile", icon: FileText },
                { id: "team", label: "Team Activities", icon: Users },
              ].filter(m => {
                if (m.id === "reconcile" || m.id === "team") {
                  return userRole === "ADMIN" || userRole.includes("CONSERVATOR") || userRole.includes("CHIEF");
                }
                return true;
              }).map(m => {
                const Icon = m.icon;
                const active = activeView === m.id;
                return (
                  <button key={m.id} onClick={() => navigateToView(m.id)}
                    className={`w-full p-2.5 rounded text-left flex items-center justify-between transition-all cursor-pointer font-semibold ${active ? "bg-[#3b5249] text-white border-l-4 border-white font-bold" : "hover:bg-[#eae5d9] bg-transparent text-[#1c1a18]"}`}>
                    <span className="flex items-center gap-2.5 font-sans not-italic text-xs font-semibold">
                      <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-[#3b5249]"}`} />
                      {m.label}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono italic">↳</span>
                  </button>
                );
              })}
            </nav>
            <div className="pt-2.5 border-t border-[#eae5d9] space-y-1">
              {!isOwnerView && (
                <button onClick={() => navigateToView("add")}
                  className="w-full p-2.5 rounded text-left flex items-center gap-2.5 hover:bg-[#eae5d9] text-[#3b5249] transition-all cursor-pointer font-bold font-sans text-xs">
                  <FileSpreadsheet className="w-4 h-4 shrink-0" /> Add New Artifact
                </button>
              )}
              <button onClick={() => setIsEditProfileOpen(true)}
                className="w-full p-2.5 rounded text-left flex items-center gap-2.5 hover:bg-[#eae5d9] text-[#3b5249] transition-all cursor-pointer font-bold font-sans text-xs">
                <UserIcon className="w-4 h-4 shrink-0" /> Edit Profile Seal
              </button>
              <button onClick={handleSignOut}
                className="w-full p-2.5 rounded text-left flex items-center gap-2.5 hover:bg-red-50 text-red-800 transition-all cursor-pointer font-bold font-sans text-xs">
                <LogOut className="w-4 h-4 shrink-0 text-red-700" /> Sign Out Session
              </button>
            </div>
          </div>
          <div className="bg-[#eae5d9] border border-[#beb39e] p-4 rounded text-[11px] font-sans text-[#5c544d] space-y-1 leading-relaxed shadow-sm">
            <span className="font-mono text-[9px] uppercase tracking-wider font-bold text-[#3b5249] block">Supabase PostgreSQL</span>
            <p>Real-time heritage registry. Total assets: <strong>{artifacts.length}</strong>.</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="col-span-1 lg:col-span-9">
          {isLoading && (
            <div className="no-print flex flex-col items-center justify-center p-12 bg-white border rounded mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-b-0 border-[#3b5249] mb-3"></div>
              <p className="font-mono text-xs text-gray-500">Synchronizing palace records ledger...</p>
            </div>
          )}
          {inventoryError && (
            <div className="no-print p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded mb-4 text-xs font-mono font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-bounce shrink-0" />
              <span>{inventoryError}</span>
            </div>
          )}

          <div className="animate-in fade-in duration-200">
            {activeView === "dashboard" && (
              <DashboardView artifacts={artifacts} currentUser={currentUser}
                onNavigate={navigateToView}
                onScanClick={() => setIsGlobalScannerOpen(true)}
                onSeedData={async () => {
                  const result = await seedTestData();
                  if (result.success) await loadAllData();
                  else alert("Seed failed: " + result.error?.message);
                }} />
            )}
            {activeView === "all" && (
              <AllArtifactsView artifacts={artifacts} activeFilter={filteredStateMode} onNavigate={navigateToView} />
            )}
            {activeView === "location" && (
              <ByLocationView artifacts={artifacts} onNavigate={navigateToView} />
            )}
            {activeView === "qrhub" && (
              <QRHubView artifacts={artifacts} onBack={() => navigateToView("dashboard")} />
            )}
            {activeView === "reconcile" && (
              <ReconciliationReportView artifacts={artifacts} onBack={() => navigateToView("dashboard")} />
            )}
            {activeView === "team" && (
              <TeamView staff={staff} activity={activity} currentUser={currentUser}
                onBack={() => navigateToView("dashboard")} />
            )}
            {activeView === "item-detail" && selectedItemId && (
              <ItemDetailView itemId={selectedItemId} artifacts={artifacts} currentUser={currentUser}
                onBack={() => navigateToView("all")}
                onEdit={(id) => navigateToView("edit", id)}
                onMoveTransaction={handleCustodyMove}
                onDeleteTrigger={handleDeleteItem}
                onUpdateItem={handleUpdateItem} />
            )}
            {activeView === "add" && (
              <AddEditFormView artifacts={artifacts} currentUser={currentUser}
                onSave={handleSaveItem} onCancel={() => navigateToView("dashboard")} />
            )}
            {activeView === "edit" && selectedItemId && (
              <AddEditFormView editItemId={selectedItemId} artifacts={artifacts} currentUser={currentUser}
                onSave={handleSaveItem} onCancel={() => navigateToView("item-detail", selectedItemId)} />
            )}
            {activeView === "bulk" && (
              <BulkImportView onImportSuccess={handleBulkImportSuccess}
                onCancel={() => navigateToView("dashboard")} />
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="no-print bg-[#1c1a18] border-t border-[#2e2622] text-[#8e847a] text-[10px] font-mono py-4 text-center mt-12">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Seclude Hotels Corp. Registered Palace Archives, Udaipur.</p>
          <p className="mt-1 text-[#6e645a]">All transactions immutably recorded on Supabase PostgreSQL. Row-level security enforced.</p>
        </div>
      </footer>

      {isGlobalScannerOpen && (
        <QRScannerModal isOpen={isGlobalScannerOpen} onClose={() => setIsGlobalScannerOpen(false)}
          artifacts={artifacts} onNavigate={navigateToView} />
      )}

      {/* Delete confirmation */}
      {itemToDeleteId && (
        <div className="fixed inset-0 bg-[#1c1a18]/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#fdecda] border-2 border-[#dfb06c] rounded-xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4">
            <div className="bg-[#fad3b4] text-[#a45318] rounded-full w-12 h-12 flex items-center justify-center mx-auto border border-[#dfb06c]">
              <Trash2 className="w-5 h-5 text-red-800" />
            </div>
            <div className="space-y-1.5 text-[#140e0b]">
              <h3 className="font-serif text-sm font-bold tracking-tight">PERMANENT REGISTER DELETION</h3>
              <p className="text-[11px] text-[#736357] font-sans leading-relaxed">
                Are you absolutely certain you wish to withdraw this item from the active lease ledger? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setItemToDeleteId(null)}
                className="flex-1 py-2 border border-[#dfb06c] text-[#5c3d1a] rounded font-mono text-xs font-bold hover:bg-[#fad3b4] transition-all cursor-pointer">
                Cancel
              </button>
              <button onClick={confirmDelete}
                className="flex-1 py-2 bg-red-700 hover:bg-red-800 text-white rounded font-mono text-xs font-bold transition-all cursor-pointer active:scale-95">
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditProfileOpen && currentUser && (
        <EditProfileModal
          currentUser={currentUser}
          onClose={() => setIsEditProfileOpen(false)}
          onSave={(updated) => {
            // Update local state immediately for instant UI feedback
            const updatedUser = { ...currentUser, ...updated };
            setCurrentUser(updatedUser);
            localStorage.setItem("seclude_operator", JSON.stringify(updatedUser));
            setIsEditProfileOpen(false);
            // Save to Supabase in background and refresh from DB
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session?.user) {
                supabase.from("profiles").update({
                  name: updated.name,
                  role: updated.role,
                  avatar_url: updated.avatarUrl || null,
                  last_active: new Date().toISOString()
                }).eq("id", session.user.id).then(({ error }) => {
                  if (error) {
                    console.warn("Profile save error:", error);
                  } else {
                    // Refresh from DB to confirm save
                    fetchProfile(session.user.id).then(profile => {
                      if (profile) {
                        const confirmedUser = {
                          ...currentUser,
                          name: profile.name,
                          role: profile.role,
                          avatarUrl: profile.avatar_url || undefined,
                        };
                        setCurrentUser(confirmedUser);
                        localStorage.setItem("seclude_operator", JSON.stringify(confirmedUser));
                      }
                    });
                  }
                });
              }
            });
          }}
        />
      )}
    </div>
  );
}
