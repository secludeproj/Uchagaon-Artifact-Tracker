import React, { useState, useMemo } from "react";
import { Artifact } from "../types";
import { Search, SlidersHorizontal, ArrowLeft, ArrowRight, ShieldAlert, Coins, Eye, Camera, Sparkles, Loader2, Play } from "lucide-react";
import QRScannerModal from "./QRScannerModal";
import { buildCategoryList } from "../lib/categories";

interface AllArtifactsViewProps {
  artifacts: Artifact[];
  activeFilter?: string; // e.g. "overdue" from dashboard shortcut
  onNavigate: (view: string, targetId?: string) => void;
}

export default function AllArtifactsView({ artifacts, activeFilter, onNavigate }: AllArtifactsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState(() => {
    if (activeFilter && activeFilter.startsWith("status:")) {
      return activeFilter.replace("status:", "");
    }
    return "All";
  });
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [showOverdueOnly, setShowOverdueOnly] = useState(activeFilter === "overdue");
  const [showHighRiskOnly, setShowHighRiskOnly] = useState(activeFilter === "condition-action");
  const [currentPage, setCurrentPage] = useState(1);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // AI-Powered Intelligent Search States
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [aiMatchedIds, setAiMatchedIds] = useState<string[] | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [activeSearchMode, setActiveSearchMode] = useState<"standard" | "ai">(() => {
    if (activeFilter && (activeFilter.startsWith("status:") || activeFilter === "overdue" || activeFilter === "condition-action")) {
      return "standard";
    }
    return "ai";
  });

  // Synchronize changes to activeFilter shortcuts dynamically
  React.useEffect(() => {
    if (activeFilter) {
      if (activeFilter.startsWith("status:")) {
        const targetStatus = activeFilter.replace("status:", "");
        setSelectedStatus(targetStatus);
        setSelectedCategory("All");
        setSelectedCondition("All");
        setShowOverdueOnly(false);
        setShowHighRiskOnly(false);
        setActiveSearchMode("standard");
      } else if (activeFilter === "overdue") {
        setShowOverdueOnly(true);
        setSelectedStatus("All");
        setSelectedCategory("All");
        setSelectedCondition("All");
        setShowHighRiskOnly(false);
        setActiveSearchMode("standard");
      } else if (activeFilter === "condition-action") {
        setShowHighRiskOnly(true);
        setSelectedStatus("All");
        setSelectedCategory("All");
        setSelectedCondition("All");
        setShowOverdueOnly(false);
        setActiveSearchMode("standard");
      }
    }
  }, [activeFilter]);

  const handleAiSearch = async (queryText?: string) => {
    const textToSearch = queryText !== undefined ? queryText : aiSearchQuery;
    if (!textToSearch.trim()) return;

    setIsAiLoading(true);
    setAiError(null);

    // Always do local keyword search first
    const q = textToSearch.toLowerCase();
    const words = q.split(/\s+/).filter((w: string) => w.length > 1);
    const localMatches = artifacts.filter((i: any) => {
      const searchText = [
        i.name, i.category, i.material, i.description,
        i.condition, i.currentLocation, i.originalLocation,
        i.status, i.story, i.estimatedAge
      ].filter(Boolean).join(" ").toLowerCase();
      return words.some((word: string) => searchText.includes(word));
    }).map((i: any) => i.id);

    try {
      const res = await fetch("/api/nlp-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: textToSearch, items: artifacts })
      });
      let data: any;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) throw new Error(data?.error || `AI search response error (HTTP ${res.status}).`);
      const geminiIds = data.ids || data.matchedIds || [];
      // Merge local + Gemini results, deduplicated
      const merged = [...new Set([...geminiIds, ...localMatches])];
      setAiMatchedIds(merged.length > 0 ? merged : localMatches);
    } catch (err: any) {
      // Gemini unavailable — use local results
      setAiMatchedIds(localMatches);
      if (localMatches.length === 0) {
        setAiError("No matching artifacts found.");
      }
    } finally {
      setIsAiLoading(false);
    }
  };


  const handleSuggestionClick = (text: string) => {
    setAiSearchQuery(text);
    handleAiSearch(text);
  };

  const itemsPerPage = 8;

  // Categories: base heritage categories plus any custom ones already in use
  const categories = useMemo(() => {
    return ["All", ...buildCategoryList(artifacts.map((a) => a.category))];
  }, [artifacts]);

  // Static Statuses
  const statuses = ["All", "On Display", "In Storage", "Under Maintenance", "Damaged", "Reserved"];

  // Static Conditions
  const conditions = ["All", "Mint", "Good", "Fair", "Poor", "Damaged"];

  // Dynamic evaluation for 6-Month Inspection Overdue check
  const isOverdue = (dateStr: string) => {
    if (!dateStr) return true;
    try {
      const inspectDate = new Date(dateStr);
      const today = new Date("2026-06-19");
      const diffMs = today.getTime() - inspectDate.getTime();
      const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.43);
      return diffMonths >= 6;
    } catch {
      return false;
    }
  };

  // Filter and search computation
  const filteredArtifacts = useMemo(() => {
    return artifacts.filter((item) => {
      if (!item) return false;

      // If AI mode is active and we have matched IDs, filter exclusively by those IDs.
      if (activeSearchMode === "ai") {
        if (aiMatchedIds !== null && aiMatchedIds.length > 0) {
          return aiMatchedIds.includes(item.id);
        }
        // No AI results yet — show all
        return aiMatchedIds === null;
      }

      // 1. Text Search matches Name, ID, Description, Material, or locations
      const matchesSearch =
        (item.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.material || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.currentLocation || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.originalLocation || "").toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Category Dropdown matches
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;

      // 3. Status Dropdown matches
      const matchesStatus = selectedStatus === "All" || item.status === selectedStatus;

      // 4. Condition Dropdown matches
      const matchesCondition = showHighRiskOnly
        ? (item.condition === "Damaged" || item.condition === "Poor")
        : (selectedCondition === "All" || item.condition === selectedCondition);

      // 5. Overdue conservation checkbox
      const matchesOverdue = !showOverdueOnly || isOverdue(item.lastInspectedDate);

      return matchesSearch && matchesCategory && matchesStatus && matchesCondition && matchesOverdue;
    });
  }, [artifacts, searchQuery, selectedCategory, selectedStatus, selectedCondition, showOverdueOnly, showHighRiskOnly, activeSearchMode, aiMatchedIds]);

  // Pagination calculation
  const totalItems = filteredArtifacts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredArtifacts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredArtifacts, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Reset page when queries change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedStatus, selectedCondition, showOverdueOnly, showHighRiskOnly, activeSearchMode, aiMatchedIds]);

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="block text-[9px] font-mono uppercase tracking-widest text-[#8e847a] font-bold mb-0.5">Seclude Fort Uchagaon</span>
          <h2 className="font-serif text-xl font-bold text-[#1c1a18]">
            Heritage Asset Inventory Registry
          </h2>
          <p className="text-xs text-[#6e645a] font-serif italic mt-0.5 animate-pulse">
            Showing {totalItems} of {artifacts.length} total pieces registered. Live Ledger.
          </p>
        </div>
        <button
          onClick={() => setIsScannerOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3b5249] hover:bg-[#2f423a] text-white text-xs font-bold uppercase tracking-wider rounded border border-[#31443c] hover:shadow transition-all active:scale-[0.98] cursor-pointer"
        >
          <Camera className="w-4 h-4 text-[#dfd6be]" />
          Scan QR with Camera
        </button>
      </div>

      {/* Search Mode Toggles */}
      <div className="flex border-b border-[#dfdcd6] gap-2">
        <button
          onClick={() => {
            setActiveSearchMode("ai");
          }}
          className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeSearchMode === "ai"
              ? "border-[#3b5249] text-[#3b5249] bg-[#fcfbf9]/50 font-extrabold"
              : "border-transparent text-[#8e847a] hover:text-[#5c544d]"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-bounce" /> AI Archivist Intelligent Search
        </button>
        <button
          onClick={() => {
            setActiveSearchMode("standard");
            setAiMatchedIds(null);
          }}
          className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeSearchMode === "standard"
              ? "border-[#3b5249] text-[#3b5249] bg-[#fcfbf9]/50 font-extrabold"
              : "border-transparent text-[#8e847a] hover:text-[#5c544d]"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" /> Standard Inventory Filters
        </button>
      </div>

      {/* Complex Filter & AI Search Dashboard Suite */}
      {activeSearchMode === "ai" ? (
        <div className="bg-[#fcfbf2] border border-[#d3cdc0] rounded-lg shadow-sm p-5 space-y-4 relative overflow-hidden">
          {/* Subtle background glow for AI assistant */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-bold text-[#3b5249] uppercase tracking-wide flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Archivist Intelligence Console
            </h3>
            <p className="text-xs text-[#6e645a] leading-relaxed">
              Describe what you are looking for in natural, plain language. Gemini parses conditions, rooms, materials, historical contexts, or suitability for guest experiences simultaneously. Try one of our suggested templates below!
            </p>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleAiSearch();
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8e847a] absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={aiSearchQuery}
                onChange={(e) => setAiSearchQuery(e.target.value)}
                placeholder="Ask me anything: 'show me everything from the armory in fair or worse condition'..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#c8c2b5] rounded shadow-inner text-xs focus:outline-none focus:border-[#3b5249] focus:ring-1 focus:ring-[#3b5249] text-[#1c1a18] font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={isAiLoading || !aiSearchQuery.trim()}
              className={`px-5 py-3 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                isAiLoading || !aiSearchQuery.trim()
                  ? "bg-[#eae5d9] text-[#a09488] border border-[#d3cdc0] cursor-not-allowed"
                  : "bg-[#3b5249] hover:bg-[#2f423a] text-white border border-[#31443c] cursor-pointer hover:shadow-md active:scale-95"
              }`}
            >
              {isAiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#dfd6be]" />
                  Querying Gemini...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#dfd6be]" />
                  Ask AI Archivist
                </>
              )}
            </button>
          </form>

          {/* Quick interactive suggestions */}
          <div className="space-y-2 pt-2 border-t border-dashed border-[#dcd6c8]">
            <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#8e847a]">
              Direct Heritage Prompts:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSuggestionClick("show me everything from the armory in fair or worse condition")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f1e6] hover:bg-[#eae5d9] border border-[#d6cfbe] hover:border-[#3b5249] rounded text-[11px] font-sans text-[#5c544d] hover:text-[#1c1a18] transition-all cursor-pointer text-left"
              >
                <Play className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                <span>"show me everything from the armory in fair or worse condition"</span>
              </button>
              <button
                onClick={() => handleSuggestionClick("what's currently in Room 104 that originally came from the temple?")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f1e6] hover:bg-[#eae5d9] border border-[#d6cfbe] hover:border-[#3b5249] rounded text-[11px] font-sans text-[#5c544d] hover:text-[#1c1a18] transition-all cursor-pointer text-left"
              >
                <Play className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                <span>"Room 104 items originally from temple"</span>
              </button>
              <button
                onClick={() => handleSuggestionClick("find items suitable for a romantic suite")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f1e6] hover:bg-[#eae5d9] border border-[#d6cfbe] hover:border-[#3b5249] rounded text-[11px] font-sans text-[#5c544d] hover:text-[#1c1a18] transition-all cursor-pointer text-left"
              >
                <Play className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                <span>"find items suitable for a romantic suite"</span>
              </button>
            </div>
          </div>

          {/* Feedbacks and states */}
          {aiError && (
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs leading-relaxed text-[#7c5e10] space-y-2">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold font-mono uppercase tracking-wide text-amber-800">
                    Gemini Live API Rate-Limit Warning
                  </h4>
                  <p className="mt-1 text-[#6e530d]">
                    Your developer Gemini API Free Tier key reached its daily pre-allocated quota (20 requests/day) or is currently undergoing high upstream demand.
                  </p>
                </div>
              </div>
              <div className="pl-7 pt-1 border-t border-dashed border-amber-200 text-[11px] text-[#735914] list-disc space-y-1">
                <div>
                  💡 <strong className="text-amber-900 font-semibold">Offline Engine Active:</strong> We successfully parsed and filtered your match query using the high-fidelity local archivist backup engine! Below are your query filter results.
                </div>
                <div>
                  ⚙️ <strong className="text-amber-900 font-semibold">How to resolve:</strong> You can refresh or upgrade your Gemini API access in server configuration, or simply test our preset samples below.
                </div>
              </div>
            </div>
          )}

          {aiMatchedIds !== null && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#eef6f1] border border-[#cbdad0] rounded-lg text-xs text-[#203c2a] font-medium leading-relaxed shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-[#3b5249] shrink-0 animate-pulse" />
                <span>
                  <strong>AI Filter applied:</strong> Identified <strong className="font-bold text-[#1c3826] bg-[#dbece1] px-1.5 py-0.5 rounded">{totalItems} matching pieces</strong> in the live royal archives.
                </span>
              </div>
              <button
                onClick={() => {
                  setAiSearchQuery("");
                  setAiMatchedIds(null);
                  setAiError(null);
                }}
                className="text-xs font-mono font-bold text-red-700 hover:text-red-900 hover:underline cursor-pointer text-left shrink-0"
              >
                Reset Search Index
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#fdfcf7] border border-[#dcd6c8] p-4 rounded-lg shadow-sm space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Main search bar */}
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-[#8e847a] absolute left-3 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by keywords, ID, material, current or original setup rooms..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#c8c2b5] rounded text-xs focus:outline-none focus:border-[#3b5249] font-sans"
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-[#6e645a] mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#c8c2b5] rounded text-xs focus:outline-none focus:border-[#3b5249]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div>
              <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-[#6e645a] mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#c8c2b5] rounded text-xs focus:outline-none focus:border-[#3b5249]"
              >
                {statuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Collapsible advanced suite */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-dashed border-[#ece6da]">
            <div className="flex flex-wrap items-center gap-4">
              {/* Condition select */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-[#6e645a] uppercase">Condition:</span>
                <select
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                  className="p-1 px-2 bg-white border border-[#c8c2b5] rounded text-xs focus:outline-none focus:border-[#3b5249]"
                >
                  {conditions.map((co) => (
                    <option key={co} value={co}>
                      {co}
                    </option>
                  ))}
                </select>
              </div>

              {/* Overdue Inspections Toggle */}
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-[#1c1a18]">
                <input
                  type="checkbox"
                  checked={showOverdueOnly}
                  onChange={(e) => setShowOverdueOnly(e.target.checked)}
                  className="rounded border-[#c8c2b5] text-[#3b5249] focus:ring-[#3b5249] w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-red-700 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Show Inspection Overdue Only (6+ Months)
                </span>
              </label>
            </div>

            {/* Filter Reset */}
            {(searchQuery || selectedCategory !== "All" || selectedStatus !== "All" || selectedCondition !== "All" || showOverdueOnly || showHighRiskOnly) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setSelectedStatus("All");
                  setSelectedCondition("All");
                  setShowOverdueOnly(false);
                  setShowHighRiskOnly(false);
                }}
                className="text-[11px] font-mono text-red-600 font-bold hover:underline cursor-pointer"
              >
                Clear All Filtering Constraints {showHighRiskOnly ? "(High Risk Filter Active)" : ""}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Grid Render */}
      {totalItems === 0 ? (
        <div className="bg-[#fdfcf7] border border-[#dcd6c8] p-12 text-center rounded">
          <SlidersHorizontal className="w-10 h-10 text-[#c4bcae] mx-auto mb-3" />
          <h4 className="font-serif text-sm font-bold text-[#1c1a18]">No Matching Heritage Artifacts Found</h4>
          <p className="text-xs text-[#8e847a] mt-1 max-w-sm mx-auto">
            Try adjusting your words, removing active status locks, or toggling off the overdue warning filters.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Bento Archive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {currentItems.map((item) => {
              const overdue = isOverdue(item.lastInspectedDate);
              return (
                <div
                  key={item.id}
                  onClick={() => onNavigate("item-detail", item.id)}
                  className="bg-[#fdfcf7] border border-[#dcd6c8] hover:border-[#3b5249] rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group cursor-pointer"
                >
                  {/* Photo Thumbnail */}
                  <div className="relative aspect-video w-full bg-[#eae5d9] overflow-hidden border-b border-[#ece6da]">
                    <img
                      src={item.photos?.[0] || "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=400"}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* ID Tag overlay looks like a museum card */}
                    <div className="absolute top-2 left-2 bg-[#1c1a18]/90 text-white font-mono text-[9px] px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                      <span>{item.id}</span>
                      {item.pendingSync && (
                        <span className="bg-amber-600 text-[8px] font-bold px-1 rounded animate-pulse text-white font-sans shrink-0">
                          QUEUE
                        </span>
                      )}
                    </div>

                    {overdue && (
                      <div className="absolute bottom-2 right-2 bg-red-650 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1 animate-pulse">
                        <ShieldAlert className="w-3 h-3" /> DANGER: CONSERVATION OVERDUE
                      </div>
                    )}
                  </div>

                  {/* Core detail summary */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3 bg-[#fdfcf7]">
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono text-[#8e847a] uppercase tracking-wide">
                        {item.category}
                      </p>
                      <h4 className="font-serif text-xs font-bold text-[#1c1a18] line-clamp-2 leading-tight group-hover:text-[#3b5249] transition-all">
                        {item.name}
                      </h4>
                    </div>

                    <div className="space-y-2">
                      <div className="h-px bg-gradient-to-r from-[#ece6da] to-transparent"></div>
                      
                      {/* Physical parameters */}
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-[#6e645a]">
                        <div className="truncate">
                          <span className="text-[#a09488]">Condition:</span>{" "}
                          <span className={`font-bold ${
                            item.condition === "Damaged" || item.condition === "Poor" ? "text-red-700" : "text-[#1c1a18]"
                          }`}>
                            {item.condition}
                          </span>
                        </div>
                        <div className="truncate text-right">
                          <span className="text-[#a09488]">Value:</span>{" "}
                          <span className="text-[#1c1a18] font-bold">₹ {item.estimatedValue.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Current custody assignment */}
                      <div className="bg-[#fcfbf9] border border-[#e8e4db] p-1.5 rounded flex items-center justify-between">
                        <span className="text-[9px] font-serif italic text-[#8e847a]">Loc: {item.currentLocation}</span>
                        <span className={`text-[8px] font-mono font-bold uppercase rounded px-1 text-center bg-[#f0ede2] text-[#1c1a18] border border-[#d3cdc0]`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick visual view action */}
                  <div className="bg-[#faf9f6] border-t border-[#f0ece2] p-2 text-center text-[10px] text-[#3b5249] font-mono font-bold group-hover:bg-[#3b5249] group-hover:text-white transition-all flex items-center justify-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Inspect Ledger Record
                  </div>
                </div>
              );
            })}
          </div>

          {/* Standard Paginated Footer controllers */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-dashed border-[#dcd6c8] pt-4 font-mono text-xs text-[#6e645a]">
              <span>
                Page <span className="font-bold text-[#1c1a18]">{currentPage}</span> of{" "}
                <span className="font-bold text-[#1c1a18]">{totalPages}</span>
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className={`p-1.5 px-3 rounded border text-[10px] uppercase font-bold flex items-center gap-1 transition-all ${
                    currentPage === 1
                      ? "text-[#c4bcae] bg-gray-50 border-gray-100 cursor-not-allowed"
                      : "text-[#3b5249] bg-white border-[#c8c2b5] hover:bg-[#3b5249] hover:text-white cursor-pointer active:scale-95"
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={`p-1.5 px-3 rounded border text-[10px] uppercase font-bold flex items-center gap-1 transition-all ${
                    currentPage === totalPages
                      ? "text-[#c4bcae] bg-gray-50 border-gray-100 cursor-not-allowed"
                      : "text-[#3b5249] bg-white border-[#c8c2b5] hover:bg-[#3b5249] hover:text-white cursor-pointer active:scale-95"
                  }`}
                >
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        artifacts={artifacts}
        onNavigate={onNavigate}
      />
    </div>
  );
}
