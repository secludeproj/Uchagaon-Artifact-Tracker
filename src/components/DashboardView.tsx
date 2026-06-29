import React from "react";
import { Artifact } from "../types";
import { 
  Briefcase, 
  ShieldAlert, 
  Coins, 
  Layers, 
  Compass, 
  Clock, 
  PlusCircle, 
  QrCode, 
  FileSpreadsheet, 
  Activity, 
  Sparkles,
  Camera,
  CalendarDays,
  BellRing,
  CheckCircle2,
  ChevronRight
} from "lucide-react";
import ConservationAnalytics from "./ConservationAnalytics";

interface DashboardViewProps {
  artifacts: Artifact[];
  currentUser: { name: string; email: string; role: string };
  onNavigate: (view: string, targetId?: string) => void;
  onScanClick: () => void;
  onSeedData?: () => void;
}

export default function DashboardView({ artifacts, currentUser, onNavigate, onScanClick, onSeedData }: DashboardViewProps) {
  // Calculations
  const totalCount = artifacts.length;
  
  const totalValue = artifacts.reduce((sum, item) => sum + (Number(item.estimatedValue) || 0), 0);

  // Status breakdown
  const statusCounts = artifacts.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Category counts
  const categoryCounts = artifacts.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Conservation Overdue: Flag if not inspected in over 6 months
  const checkOverdue = (dateStr: string) => {
    if (!dateStr) return true;
    try {
      const inspectDate = new Date(dateStr);
      const today = new Date("2026-06-19"); // Absolute consistent reference date
      const diffMs = today.getTime() - inspectDate.getTime();
      const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.43);
      return diffMonths >= 6;
    } catch {
      return false;
    }
  };

  const overdueItems = artifacts.filter(item => checkOverdue(item.lastInspectedDate));

  // Recently updated / added items
  const sortedByRecent = [...artifacts].sort((a, b) => {
    return new Date(b.addedDate || 0).getTime() - new Date(a.addedDate || 0).getTime();
  });
  const recentItems = sortedByRecent.slice(0, 3);

  // Upcoming Conservation Schedule: items due within 90 days (not already overdue)
  const TODAY = new Date("2026-06-27");
  const upcomingSchedule = artifacts
    .filter(a => a.lastInspectedDate)
    .map(a => {
      const lastDate = new Date(a.lastInspectedDate);
      const dueDate = new Date(lastDate);
      dueDate.setMonth(dueDate.getMonth() + 6);
      const daysUntilDue = Math.ceil((dueDate.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
      return { ...a, dueDate, daysUntilDue };
    })
    .filter(a => a.daysUntilDue >= 0 && a.daysUntilDue <= 90)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    .slice(0, 6);

  // Active inventory categories
  const categoriesList = [
    "Weaponry & Armor",
    "Artwork & Paintings",
    "Furniture",
    "Textiles & Carpets",
    "Ceramics & Pottery",
    "Metalwork",
    "Religious & Ceremonial",
    "Manuscripts & Books",
    "Jewelry & Ornaments",
    "Other"
  ];

  return (
    <div className="space-y-6">
      {/* Decorative Jali Backdrop Banner */}
      <div className="relative bg-[#3b5249] text-[#fdfcf7] rounded-lg p-6 overflow-hidden border border-[#2e3f38] shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Abstract watermark graphic */}
        <div className="absolute right-0 top-0 opacity-10 translate-x-10 -translate-y-10 scale-150">
          <Compass className="w-60 h-60" />
        </div>

        <div className="z-10 relative space-y-1">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[#a8baa2] font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> SECLUDE REGISTRY ACTIVE REPORT
          </p>
          <h2 className="font-serif text-2xl font-bold tracking-tight">
            Heritage Custody & Preservation Console
          </h2>
          <p className="text-xs text-[#dce6dc] max-w-xl font-serif italic">
            "We hold the heritage artifacts in custody, pledged to inspect regularly and restore each artifact to its sovereign place at lease-end."
          </p>
        </div>

        <div className="z-10 relative bg-[#eae2d0] text-[#1c1a18] px-4 py-2 rounded border border-[#dfd6be] shadow-sm font-mono text-[11px] font-bold self-start md:self-auto uppercase flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#3b5249]" /> Period Day: Year 1 / Month 1
        </div>
      </div>

      {/* Quick Interactive Actions Banner */}
      <div className="bg-[#eae5d9] border border-[#beb39e] p-5 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start md:items-center gap-3.5">
          <div className="p-3 bg-[#3b5249] text-white rounded-lg shadow-inner shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-bold text-[#1c1a18] uppercase tracking-wide">
              Scan Physical QR Code Tag
            </h4>
            <p className="text-xs text-[#5c544d] font-sans leading-relaxed mt-0.5">
              Point your camera at any Seclude heritage sticker to immediately identify and pull open its specific registry card, logs, and inspections file.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={onScanClick}
            className="p-2 px-6 bg-[#3b5249] hover:bg-[#2c3d36] text-white font-mono text-[10px] font-bold uppercase tracking-wider rounded border border-[#2e3f38] shadow hover:shadow-md transition-all cursor-pointer active:scale-95 text-center"
          >
            Launch QR Scanner
          </button>
          {artifacts.length === 0 && onSeedData && (
            <button
              onClick={onSeedData}
              className="p-2 px-4 bg-amber-700 hover:bg-amber-800 text-white font-mono text-[10px] font-bold uppercase tracking-wider rounded border border-amber-600 shadow hover:shadow-md transition-all cursor-pointer active:scale-95 text-center"
            >
              ✦ Load Sample Artifacts
            </button>
          )}
        </div>
      </div>

      {/* Main Core Metric Rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div 
          onClick={() => onNavigate("all")}
          className="bg-[#fdfcf7] border border-[#dcd6c8] p-5 rounded-lg shadow-sm relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-[#3b5249] hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#6e645a] group-hover:text-[#3b5249] transition-all">
              Total Heritage items
            </span>
            <div className="p-2 rounded bg-[#eae3d5] text-[#2c3d35] border border-[#d2cca0] group-hover:bg-[#3b5249] group-hover:text-white transition-all">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-serif text-3xl font-extrabold text-[#111110] group-hover:text-[#3b5249] transition-colors">{totalCount}</h3>
            <p className="text-[10px] text-[#8e847a] mt-1 font-sans">
              Perfectly tracked catalog items
            </p>
          </div>
          <span className="text-[9px] font-mono text-[#3b5249] mt-2 opacity-0 group-hover:opacity-100 transition-all">
            View Registry catalog →
          </span>
        </div>

        {/* Insurance Valuation */}
        <div 
          onClick={(currentUser?.role?.trim()?.toUpperCase() === "ADMIN") ? () => onNavigate("reconcile") : undefined}
          className={`bg-[#fdfcf7] border border-[#dcd6c8] p-5 rounded-lg shadow-sm relative overflow-hidden flex flex-col justify-between ${
            (currentUser?.role?.trim()?.toUpperCase() === "ADMIN") 
              ? "cursor-pointer hover:border-[#5a2c82] hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group" 
              : "cursor-default"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`font-mono text-[10px] uppercase font-bold tracking-wider ${
              (currentUser?.role?.trim()?.toUpperCase() === "ADMIN") ? "text-[#6e645a] group-hover:text-[#5a2c82] transition-colors" : "text-[#6e645a]"
            }`}>
              Insurance Protection
            </span>
            <div className={`p-2 rounded bg-[#f3edf8]/80 text-[#5a2c82] border border-[#d6cce2] ${
              (currentUser?.role?.trim()?.toUpperCase() === "ADMIN") ? "group-hover:bg-[#5a2c82] group-hover:text-white transition-all" : ""
            }`}>
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`font-serif text-3xl font-extrabold text-[#111110] ${
              (currentUser?.role?.trim()?.toUpperCase() === "ADMIN") ? "group-hover:text-[#5a2c82] transition-colors" : ""
            }`}>
              ₹ {totalValue.toLocaleString()}
            </h3>
            <p className="text-[10px] text-[#8e847a] mt-1 font-sans">
              Collection replacement cost cover
            </p>
          </div>
          {(currentUser?.role?.trim()?.toUpperCase() === "ADMIN") && (
            <span className="text-[9px] font-mono text-[#5a2c82] mt-2 opacity-0 group-hover:opacity-100 transition-all">
              View Value protection dossier →
            </span>
          )}
        </div>

        {/* Conservation Alarms */}
        <div 
          onClick={() => onNavigate("all", "overdue")}
          className={`bg-[#fdfcf7] border p-5 rounded-lg shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group ${
            overdueItems.length > 0 ? "border-red-350 bg-[#fffbf9] hover:border-red-500" : "border-[#dcd6c8] hover:border-[#3b5249]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-red-700">
              Conservation Alerts
            </span>
            <div className={`p-2 rounded ${overdueItems.length > 0 ? "bg-red-150 text-red-700 border border-red-200 group-hover:bg-red-700 group-hover:text-white" : "bg-gray-100 text-gray-400 group-hover:bg-[#3b5249] group-hover:text-white"} transition-all`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`font-serif text-3xl font-extrabold ${overdueItems.length > 0 ? "text-red-700" : "text-[#111110]"} group-hover:text-red-700 transition-colors`}>
              {overdueItems.length}
            </h3>
            <p className="text-[10px] text-red-650 mt-1 font-mono font-bold uppercase tracking-tight">
              {overdueItems.length > 0 ? "⚠️ Overdue 6-Month Inspection" : "All Inspections current"}
            </p>
          </div>
          <span className="text-[9px] font-mono mt-2 opacity-0 group-hover:opacity-100 transition-all text-red-700">
            Audit inspection schedules →
          </span>
        </div>

        {/* Active display coverage */}
        <div 
          onClick={() => onNavigate("location")}
          className="bg-[#fdfcf7] border border-[#dcd6c8] p-5 rounded-lg shadow-sm flex flex-col justify-between cursor-pointer hover:border-[#3b5249] hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#6e645a] group-hover:text-[#3b5249] transition-all">
              Active Lobby display
            </span>
            <div className="p-2 rounded bg-emerald-50 text-[#3b5249] border border-emerald-100 group-hover:bg-[#3b5249] group-hover:text-white transition-all">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-serif text-3xl font-extrabold text-[#111110] group-hover:text-[#3b5249] transition-colors">
              {statusCounts["On Display"] || 0}
            </h3>
            <p className="text-[10px] text-[#8e847a] mt-1 font-mono">
              On Display / {statusCounts["In Storage"] || 0} in Vault Storage
            </p>
          </div>
          <span className="text-[9px] font-mono text-[#3b5249] mt-2 opacity-0 group-hover:opacity-100 transition-all">
            Inspect room spatial map →
          </span>
        </div>
      </div>

      {/* Bento Grid layout for Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Category Registry Log */}
        <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded shadow-sm p-5 space-y-4">
          <div>
            <h4 className="font-serif text-sm font-bold text-[#111110]">
              Heritage Category Breakdown
            </h4>
            <p className="text-[10px] font-mono text-[#8e847a] uppercase mt-0.5">
              Assigned Palace Classes
            </p>
          </div>
          <div className="h-px bg-[#ece6da]"></div>
          <div className="space-y-2.5">
            {categoriesList.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const percent = totalCount > 0 ? (count / totalCount) * 100 : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-[#1c1a18]">
                    <span className="truncate">{cat}</span>
                    <span className="font-mono text-[#5c544d] font-bold">{count}</span>
                  </div>
                  {/* Ledger styled progress timeline bar */}
                  <div className="w-full h-1.5 bg-[#eae5d9] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#3b5249]" 
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Status Allocation and Quick Controls */}
        <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded shadow-sm p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div>
              <h4 className="font-serif text-sm font-bold text-[#111110]">
                Conservation Custody Statuses
              </h4>
              <p className="text-[10px] font-mono text-[#8e847a] uppercase mt-0.5">
                Current Custody Allocation
              </p>
            </div>
            <div className="h-px bg-[#ece6da]"></div>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "On Display", color: "bg-emerald-500", text: "text-emerald-800", bg: "bg-emerald-50" },
                { name: "In Storage", color: "bg-amber-600", text: "text-amber-800", bg: "bg-amber-50" },
                { name: "Under Maintenance", color: "bg-blue-500", text: "text-blue-800", bg: "bg-blue-50" },
                { name: "Damaged", color: "bg-red-500", text: "text-red-800", bg: "bg-red-50" },
                { name: "Reserved", color: "bg-purple-500", text: "text-purple-800", bg: "bg-purple-50" }
              ].map((st) => {
                const count = statusCounts[st.name] || 0;
                return (
                  <button 
                    key={st.name} 
                    type="button"
                    onClick={() => onNavigate("all", "status:" + st.name)}
                    className={`p-2.5 rounded border border-[#ebdcc3] ${st.bg} flex flex-col justify-between text-left cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all active:scale-95 focus:outline-none focus:ring-1 focus:ring-[#3b5249]`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${st.color}`}></span>
                      <span className="text-[10px] font-sans font-semibold text-[#34302c]">{st.name}</span>
                    </div>
                    <span className="font-serif text-lg font-extrabold mt-1 text-[#111110]">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <span className="block text-[9px] font-mono font-bold tracking-widest text-[#8e847a] uppercase">
              Field Action Hub
            </span>
            <div className={`grid ${
              (currentUser?.role?.trim()?.toUpperCase() === "OWNER VIEW" || currentUser?.role?.trim()?.toUpperCase() === "OWNER" || currentUser?.role?.trim()?.toUpperCase() === "READ-ONLY" || currentUser?.role?.trim()?.toUpperCase() === "READ ONLY") 
                ? "grid-cols-1" 
                : "grid-cols-3"
            } gap-2`}>
              {!(currentUser?.role?.trim()?.toUpperCase() === "OWNER VIEW" || currentUser?.role?.trim()?.toUpperCase() === "OWNER" || currentUser?.role?.trim()?.toUpperCase() === "READ-ONLY" || currentUser?.role?.trim()?.toUpperCase() === "READ ONLY") && (
                <button 
                  onClick={() => onNavigate("add")}
                  className="flex flex-col items-center justify-center p-2.5 bg-[#3b5249] hover:bg-[#2e3f38] text-white rounded text-center transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <PlusCircle className="w-5 h-5 mb-1.5" />
                  <span className="text-[9px] font-mono font-bold">Add Item</span>
                </button>
              )}
              <button 
                onClick={() => onNavigate("qrhub")}
                className="flex flex-col items-center justify-center p-2.5 bg-[#eae2d0] hover:bg-[#dfd6be] border border-[#c4bcae] text-[#1c1a18] rounded text-center transition-all cursor-pointer shadow-sm active:scale-95 text-center"
              >
                <QrCode className="w-5 h-5 mb-1.5 text-[#3b5249]" />
                <span className="text-[9px] font-mono font-bold">QR Labels</span>
              </button>
              {!(currentUser?.role?.trim()?.toUpperCase() === "OWNER VIEW" || currentUser?.role?.trim()?.toUpperCase() === "OWNER" || currentUser?.role?.trim()?.toUpperCase() === "READ-ONLY" || currentUser?.role?.trim()?.toUpperCase() === "READ ONLY") && (
                <button 
                  onClick={() => onNavigate("bulk")}
                  className="flex flex-col items-center justify-center p-2.5 bg-[#ece6da] hover:bg-[#dfd7ca] border border-[#c4beaf] text-[#5c544d] rounded text-center transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <FileSpreadsheet className="w-5 h-5 mb-1.5 text-[#3b5249]" />
                  <span className="text-[9px] font-mono font-bold">CSV Import</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Recently Cataloged Field Entries */}
        <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded shadow-sm p-5 space-y-4">
          <div>
            <h4 className="font-serif text-sm font-bold text-[#111110]">
              Recent Catalog Acquisitions
            </h4>
            <p className="text-[10px] font-mono text-[#8e847a] uppercase mt-0.5">
              Live Field Reports Feed
            </p>
          </div>
          <div className="h-px bg-[#ece6da]"></div>

          <div className="space-y-3">
            {recentItems.length === 0 ? (
              <p className="text-xs text-[#a09488] italic text-center py-8">No pieces added in this log.</p>
            ) : (
              recentItems.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => onNavigate("item-detail", item.id)}
                  className="group flex gap-3 p-2 rounded hover:bg-[#f5efe4] border border-transparent hover:border-[#dfd2be] transition-all cursor-pointer"
                >
                  <img 
                    src={item.photos?.[0] || "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=200"} 
                    alt={item.name}
                    className="w-12 h-12 rounded object-cover border border-[#d2cca0] group-hover:scale-105 transition-all bg-[#eae5d9]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h5 className="text-xs font-semibold text-[#1c1a18] truncate group-hover:text-[#3b5249] transition-all flex items-center gap-1.5">
                        <span className="truncate">{item.name}</span>
                        {item.pendingSync && (
                          <span className="bg-amber-100 text-amber-800 text-[8px] px-1 rounded animate-pulse font-mono uppercase font-bold shrink-0">
                            Syncing
                          </span>
                        )}
                      </h5>
                      <span className="inline-flex items-center gap-1 mt-0.5 text-[9px] font-mono text-[#6e645a]">
                        ID: <span className="text-[#3b5249] font-bold">{item.id}</span> | {item.category}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] mt-1 font-sans">
                      <span className="text-[#8e847a] italic">In {item.currentLocation}</span>
                      <span className={`px-1.5 py-0.5 font-mono text-[9px] uppercase font-bold tracking-tight rounded bg-amber-50 text-amber-800 border border-amber-100`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Preservation Prioritization Dashboard Visualizer (Charts moved here) */}
      <div className="my-6">
        <ConservationAnalytics artifacts={artifacts} onNavigate={onNavigate} />
      </div>

      {/* ── Upcoming Conservation Schedule Panel ── */}
      <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded-lg shadow-sm overflow-hidden">
        {/* Panel Header */}
        <div className="border-b border-[#ece6da] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#fdfcf7] to-[#f4f0e6]">
          <div>
            <h3 className="font-serif text-base font-bold text-[#1c1a18] flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#3b5249]" />
              Upcoming Conservation Inspections
            </h3>
            <p className="text-[10px] font-mono text-[#8e847a] uppercase mt-0.5 tracking-wider">
              Artifacts with scheduled inspections due within 90 days
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {overdueItems.length > 0 && (
              <button
                onClick={() => onNavigate("all", "overdue")}
                className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wide hover:bg-red-100 transition-all cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5" />
                {overdueItems.length} Overdue
              </button>
            )}
            <button
              onClick={() => onNavigate("all")}
              className="flex items-center gap-1.5 bg-[#3b5249] text-white px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wide hover:bg-[#2e3f38] transition-all cursor-pointer"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Schedule Body */}
        {upcomingSchedule.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-60" />
            <p className="font-serif text-sm font-bold text-[#1c1a18]">All Clear for 90 Days</p>
            <p className="text-[11px] text-[#8e847a] font-sans max-w-xs mx-auto leading-relaxed">
              No artifacts are due for conservation inspection in the next 90 days. The heritage ledger is in excellent custody standing.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#ece6da]">
            {/* Column Header */}
            <div className="hidden sm:grid grid-cols-12 gap-3 px-5 py-2 bg-[#f7f5f0] text-[9px] font-mono font-bold uppercase tracking-widest text-[#8e847a]">
              <div className="col-span-4">Artifact</div>
              <div className="col-span-2">Condition</div>
              <div className="col-span-3">Last Inspected</div>
              <div className="col-span-2">Due Date</div>
              <div className="col-span-1 text-right">Days Left</div>
            </div>

            {upcomingSchedule.map((item) => {
              const urgency = item.daysUntilDue <= 14
                ? { row: "bg-red-50/40 hover:bg-red-50", days: "bg-red-100 text-red-800 border-red-200", label: "text-red-600" }
                : item.daysUntilDue <= 30
                ? { row: "hover:bg-amber-50/40", days: "bg-amber-50 text-amber-800 border-amber-200", label: "text-amber-600" }
                : { row: "hover:bg-[#f5efe4]", days: "bg-emerald-50 text-emerald-800 border-emerald-100", label: "text-emerald-700" };

              const condColor: Record<string, string> = {
                Mint: "bg-teal-100 text-teal-800 border-teal-200",
                Good: "bg-emerald-100 text-emerald-800 border-emerald-200",
                Fair: "bg-amber-100 text-amber-800 border-amber-200",
                Poor: "bg-orange-100 text-orange-800 border-orange-200",
                Damaged: "bg-red-100 text-red-800 border-red-200",
              };

              return (
                <div
                  key={item.id}
                  onClick={() => onNavigate("item-detail", item.id)}
                  className={`grid grid-cols-12 gap-3 px-5 py-3.5 cursor-pointer transition-all ${urgency.row} items-center`}
                >
                  {/* Artifact Name & ID */}
                  <div className="col-span-12 sm:col-span-4 min-w-0">
                    <p className="font-serif text-xs font-bold text-[#1c1a18] truncate">{item.name}</p>
                    <p className="font-mono text-[9px] text-[#8e847a] mt-0.5 truncate">
                      {item.id} · {item.currentLocation}
                    </p>
                  </div>

                  {/* Condition */}
                  <div className="col-span-4 sm:col-span-2">
                    <span className={`inline-block text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${condColor[item.condition] || condColor.Good}`}>
                      {item.condition}
                    </span>
                  </div>

                  {/* Last Inspected */}
                  <div className="col-span-4 sm:col-span-3">
                    <span className="text-[10px] font-mono text-[#5c544d]">
                      {new Date(item.lastInspectedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>

                  {/* Due Date */}
                  <div className="col-span-4 sm:col-span-2">
                    <span className="text-[10px] font-mono text-[#5c544d]">
                      {item.dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>

                  {/* Days Remaining badge */}
                  <div className="hidden sm:flex col-span-1 justify-end">
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${urgency.days}`}>
                      {item.daysUntilDue}d
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        <div className="border-t border-[#ece6da] px-5 py-3 bg-[#faf8f4] flex items-center gap-2 text-[10px] font-mono text-[#8e847a]">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>
            Conservation cycle: 6-month mandatory inspection per Seclude Palace Heritage Trust charter. 
            <span className="text-red-600 font-bold"> Red = &lt;14 days</span>, 
            <span className="text-amber-600 font-bold"> Amber = &lt;30 days</span>, 
            <span className="text-emerald-700 font-bold"> Green = &lt;90 days</span>.
          </span>
        </div>
      </div>

      {/* Dynamic Activity Audit Trail Indicator */}
      <div className="bg-[#f0ece2] border border-[#d3cdc0] rounded p-4 font-mono text-[10px] text-[#5c544d] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Activity className="w-4 h-4 text-[#3b5249]" />
          <span>REALTIME BACKEND ACTIVE: Live registry synchronized for all connected staff</span>
        </div>
        {(currentUser?.role?.trim()?.toUpperCase() === "ADMIN") && (
          <button 
            onClick={() => onNavigate("team")}
            className="underline hover:text-[#1c1a18] font-bold cursor-pointer"
          >
            View Team Activity Ledger
          </button>
        )}
      </div>
    </div>
  );
}
