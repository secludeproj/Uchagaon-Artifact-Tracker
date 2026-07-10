import React, { useState, useMemo, useRef } from "react";
import { Artifact } from "../types";
import { 
  FileText, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  Printer, 
  Upload, 
  Download, 
  RefreshCw, 
  XCircle, 
  PlusCircle, 
  ArrowRight, 
  Search 
} from "lucide-react";
import SecludeLogo from "./SecludeLogo";

interface ReconciliationReportViewProps {
  artifacts: Artifact[];
  onBack: () => void;
}

interface ReconciledItem {
  id: string;
  name: string;
  category: string;
  estimatedValue: number;
  
  // Lease record info
  originalLocation: string;
  originalCondition: string;
  
  // Active inventory info (if present)
  currentLocation: string;
  currentCondition: string;
  status: string;
  
  classification: "Matched" | "Relocated" | "Condition Changed" | "Missing" | "Added";
  notes: string;
}

export default function ReconciliationReportView({ artifacts, onBack }: ReconciliationReportViewProps) {
  const [csvUploaded, setCsvUploaded] = useState(false);
  const [reconciledList, setReconciledList] = useState<ReconciledItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"All" | "Matched" | "Relocated" | "Condition Changed" | "Missing" | "Added">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isInsideIframe, setIsInsideIframe] = useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined" && window.self !== window.top) {
      setIsInsideIframe(true);
    }
  }, []);

  // Parse CSV state machine supporting quotes and commas
  function parseCSV(text: string): any[] {
    const lines: string[] = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];
      if (c === '"') {
        if (inQuotes && next === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push("");
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') {
          i++;
        }
        lines.push(JSON.stringify(row));
        row = [""];
      } else {
        row[row.length - 1] += c;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(JSON.stringify(row));
    }

    if (lines.length === 0) return [];
    const parsedLines = lines.map(l => JSON.parse(l) as string[]);
    const headers = parsedLines[0].map(h => h.trim().toLowerCase());
    
    const results: any[] = [];
    for (let i = 1; i < parsedLines.length; i++) {
      const values = parsedLines[i];
      if (values.length === 0 || (values.length === 1 && values[0] === "")) continue;
      
      const obj: any = {};
      headers.forEach((header, idx) => {
        obj[header] = (values[idx] || "").trim();
      });
      results.push(obj);
    }
    return results;
  }

  // Correlate active system inventory against uploaded list
  const runReconciliation = (csvRows: any[]) => {
    try {
      const activeAudited = [...artifacts].filter(a => a && a.id);
      const usedSystemIds = new Set<string>();
      const usedSystemNames = new Set<string>();
      
      const matchedAnalysisList: ReconciledItem[] = [];

      // Process original lease inventory records
      csvRows.forEach((row, rIdx) => {
        if (!row) return;
        const rawId = String(row.id || row["item id"] || row["asset id"] || row["code"] || row["identifier"] || "").trim();
        const rawName = String(row.name || row["item name"] || row["title"] || row["artifact name"] || "").trim();
        const rawLoc = String(row.location || row["original location"] || row["spot"] || row["leased location"] || row["room"] || "").trim();
        const rawCond = String(row.condition || row["state"] || row["quality"] || row["condition level"] || "Good").trim();
        const rawCategory = String(row.category || row["type"] || row["item category"] || "Unspecified").trim();
        const rawValue = parseFloat(String(row.value || row["estimated value"] || row["price"] || row["worth"] || "0").replace(/[^0-9.]/g, "")) || 0;

        if (!rawName && !rawId) return; // Skip empty rows

        // Try searching by ID
        let sysMatch = activeAudited.find(
          (a) => rawId !== "" && (a.id || "").toLowerCase().trim() === rawId.toLowerCase().trim()
        );

        // Try searching by name if no ID match
        if (!sysMatch) {
          sysMatch = activeAudited.find(
            (a) => (a.name || "").toLowerCase().trim() === rawName.toLowerCase().trim() && !usedSystemNames.has(a.name || "")
          );
        }

        if (sysMatch) {
          usedSystemIds.add(sysMatch.id);
          usedSystemNames.add(sysMatch.name || "");

          const sysLocation = sysMatch.currentLocation || "";
          const sysCondition = sysMatch.condition || "";

          const locDiffer = sysLocation.toLowerCase().trim() !== rawLoc.toLowerCase().trim();
          const condDiffer = sysCondition.toLowerCase().trim() !== rawCond.toLowerCase().trim();

          let classification: "Matched" | "Relocated" | "Condition Changed" = "Matched";
          let notes = "Verified matching in catalogued location and quality.";

          if (condDiffer) {
            classification = "Condition Changed";
            notes = `Condition alert! Original Lease: '${rawCond}', Current: '${sysCondition}'`;
          } else if (locDiffer) {
            classification = "Relocated";
            notes = `Relocated: Leased to '${rawLoc}', but active in '${sysLocation}'`;
          }

          matchedAnalysisList.push({
            id: sysMatch.id,
            name: sysMatch.name || rawName,
            category: sysMatch.category || rawCategory,
            estimatedValue: sysMatch.estimatedValue || rawValue,
            originalLocation: rawLoc,
            originalCondition: rawCond,
            currentLocation: sysLocation,
            currentCondition: sysCondition,
            status: sysMatch.status || "Unknown",
            classification,
            notes
          });
        } else {
        // Missing! Exists in Original lease CSV, but not found in current live inventory system
        matchedAnalysisList.push({
          id: rawId || `PRE-${100 + rIdx}`,
          name: rawName,
          category: rawCategory,
          estimatedValue: rawValue,
          originalLocation: rawLoc,
          originalCondition: rawCond,
          currentLocation: "MISSING FROM DATABASE",
          currentCondition: "UNKNOWN",
          status: "Missing In Action",
          classification: "Missing",
          notes: "Property owner ledger shows this item was leased, but it is absent from active digital tracker files!"
        });
      }
    });

    // Add remaining system-only items (Added: In system, but wasn't in original tenant CSV)
    activeAudited.forEach((sysItem) => {
      if (!usedSystemIds.has(sysItem.id) && !usedSystemNames.has(sysItem.name || "")) {
        matchedAnalysisList.push({
          id: sysItem.id,
          name: sysItem.name || "Unnamed Item",
          category: sysItem.category || "Unspecified",
          estimatedValue: sysItem.estimatedValue || 0,
          originalLocation: "NOT IN LEASE RECORD",
          originalCondition: "NOT IN LEASE RECORD",
          currentLocation: sysItem.currentLocation || "",
          currentCondition: sysItem.condition || "",
          status: sysItem.status || "Unknown",
          classification: "Added",
          notes: "Newer acquisition or undocumented custom addition. Exists in database, but absent from owner's original list."
        });
      }
    });

      setReconciledList(matchedAnalysisList);
      setCsvUploaded(true);
    } catch (err: any) {
      console.error("Reconciliation error:", err);
      alert("Failed to process reconciliation: " + (err.message || "Unknown error"));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const rows = parseCSV(text);
        if (rows.length === 0) {
          alert("The CSV file is empty or formatted incorrectly. Please inspect headings.");
          return;
        }
        runReconciliation(rows);
      } catch (err) {
        console.error(err);
        alert("An error occurred while parsing the lease CSV file.");
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        try {
          const rows = parseCSV(text);
          runReconciliation(rows);
        } catch (err) {
          alert("Failed to parse dropped CSV. Please check formatting.");
        }
      };
      reader.readAsText(file);
    }
  };

  const downloadTemplateCsv = () => {
    let csvString = "ID,Name,Original Location,Original Condition,Category,Estimated Value\n";
    if (artifacts.length > 0) {
      artifacts.slice(0, 5).forEach(item => {
        csvString += `"${item.id}","${item.name}","${item.originalLocation}","${item.condition}","${item.category}","${item.estimatedValue}"\n`;
      });
    } else {
      csvString += `"HR-001","Sample Item Name","Room 1","Mint","Sculptures","15000"\n`;
    }
    
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "palace_lease_inventory_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter & Search calculations
  const filteredList = useMemo(() => {
    return reconciledList.filter((item) => {
      const matchesFilter = activeFilter === "All" || item.classification === activeFilter;
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.notes.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [reconciledList, activeFilter, searchQuery]);

  const stats = useMemo(() => {
    const totals = { All: reconciledList.length, Matched: 0, Relocated: 0, "Condition Changed": 0, Missing: 0, Added: 0 };
    reconciledList.forEach((item) => {
      totals[item.classification]++;
    });
    return totals;
  }, [reconciledList]);

  const printReport = () => {
    window.focus();
    window.print();
  };

  const exportToCSV = () => {
    if (reconciledList.length === 0) return;
    
    // Prepare headers
    const headers = ["Item ID", "Artifact Title", "Category", "Estimated Value", "Original Location", "Original Condition", "Current Location", "Current Condition", "Classification", "Notes"];
    
    // Convert list to CSV rows
    const csvContentRows = reconciledList.map(item => [
      item.id,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.category.replace(/"/g, '""')}"`,
      item.estimatedValue,
      `"${item.originalLocation.replace(/"/g, '""')}"`,
      `"${item.originalCondition.replace(/"/g, '""')}"`,
      `"${item.currentLocation.replace(/"/g, '""')}"`,
      `"${item.currentCondition.replace(/"/g, '""')}"`,
      item.classification,
      `"${item.notes.replace(/"/g, '""')}"`
    ]);
    
    // Build csv string
    const csvString = [headers.join(","), ...csvContentRows.map(e => e.join(","))].join("\n");
    
    // Create Blob and download
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `palace_lease_reconciliation_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="no-print flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#dfd6be] pb-3">
        <div>
          <span className="block text-[9px] font-mono uppercase tracking-widest text-[#8e847a] font-bold mb-0.5">Seclude Fort Uchagaon</span>
          <h2 className="font-serif text-xl font-bold text-[#1c1a18]">
            Palace Lease Reconciliation Audit
          </h2>
          <p className="text-xs text-[#6e645a] font-serif italic mt-0.5">
            Compare estate trustees' pre-lease ledgers side-by-side with living digital records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onBack}
            className="no-print p-1.5 px-3 border border-[#c4beaf] hover:bg-[#eae5d9] text-xs font-mono font-bold uppercase rounded cursor-pointer transition-all active:scale-95"
          >
            Go Back
          </button>
          
          {csvUploaded && (
            <>
              <button
                onClick={exportToCSV}
                className="no-print p-1.5 px-3 bg-[#8c7b6c] hover:bg-[#7a6a5b] text-white text-xs font-mono font-bold uppercase rounded shadow flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 border border-[#7a6a5b]"
              >
                <Download className="w-3.5 h-3.5 text-[#fcfcf9]" /> Export Results to CSV
              </button>
              
              <button
                onClick={printReport}
                className="no-print p-1.5 px-3 bg-[#3b5249] border border-[#2e3f38] text-white hover:bg-[#2c3d36] text-xs font-mono font-bold uppercase rounded shadow flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-300" /> Export Dossier to PDF
              </button>
            </>
          )}
        </div>
      </div>
      {/* 2. CSV Upload Phase */}
      {!csvUploaded ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-all bg-[#FAF9F5] ${
                dragActive 
                  ? "border-[#3b5249] bg-emerald-50/50 scale-[1.01]" 
                  : "border-[#beb5a1] hover:border-[#3b5249]"
              }`}
            >
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                id="lease-csv-upload-input"
              />
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-[#3b5249] border border-emerald-200">
                  <Upload className="w-6 h-6 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif text-sm font-bold text-gray-800">
                    Upload Original Palace Master Lease CSV Record
                  </h4>
                  <p className="text-xs text-[#736357] leading-relaxed">
                    Triggers comparative compliance algorithms for location alignment, structural safety checks, and custody presence.
                  </p>
                </div>
                
                <div className="pt-2 flex flex-wrap justify-center gap-3">
                  <label 
                    htmlFor="lease-csv-upload-input" 
                    className="p-2 px-4 bg-[#3b5249] text-white hover:bg-[#2c3d36] text-xs font-mono font-bold uppercase rounded-md shadow cursor-pointer transition-all active:scale-95 text-center"
                  >
                    Select CSV File
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-lg flex gap-3 items-start text-xs">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-800 shrink-0 mt-0.5" />
              <div className="space-y-1 text-emerald-950">
                <span className="font-bold uppercase tracking-wider block text-[10px]">What columns can the auditor present?</span>
                <p className="leading-relaxed text-[#405249]">
                  In comparison lists, the system matches columns named or containing: <span className="font-bold">ID</span> (or Code), <span className="font-bold">Name</span> (or Title), <span className="font-bold">Original Location</span> (or Leased Room), <span className="font-bold">Original Condition</span> (or Quality), and <span className="font-bold">Estimated Value</span>.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[#FAF9F5] border border-[#dfd6be] p-5 rounded-xl space-y-4">
              <h3 className="font-serif text-sm font-bold text-[#1c1a18] uppercase tracking-wider border-b border-[#dfd6be] pb-2">
                Lease Auditing Guidelines
              </h3>
              <p className="text-xs text-[#5c544d] leading-relaxed">
                Comparative analysis runs fully client-side against active Firestore inventory parameters. Missing or mismatch events notify operators to trigger local physically gated quarantine searches.
              </p>
              
              <button
                type="button"
                onClick={downloadTemplateCsv}
                className="w-full p-2.5 bg-white border border-[#beb5a1] hover:bg-gray-50 text-[10px] font-mono font-bold uppercase rounded text-gray-700 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-gray-500" /> Download Sample CSV Template
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 3. Reconciled Results Screen */
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Quick Metrics Cards */}
          <div className="no-print grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: "All", count: stats.All, color: "border-[#dcd6c8] bg-white text-gray-800", filter: "All" },
              { label: "Matched", count: stats.Matched, color: "border-emerald-200 bg-emerald-50/40 text-emerald-950", filter: "Matched" },
              { label: "Relocated", count: stats.Relocated, color: "border-amber-200 bg-amber-50/40 text-amber-900", filter: "Relocated" },
              { label: "Condition Changed", count: stats["Condition Changed"], color: "border-purple-200 bg-purple-50/40 text-purple-950", filter: "Condition Changed" },
              { label: "Missing In Action", count: stats.Missing, color: "border-red-200 bg-red-50/40 text-red-950", filter: "Missing" },
              { label: "Added", count: stats.Added, color: "border-blue-200 bg-blue-50/40 text-blue-950", filter: "Added" }
            ].map((st, sIdx) => {
              return (
                <button
                  key={st.label}
                  onClick={() => setActiveFilter(st.filter as any)}
                  className={`border p-3 rounded-lg text-left transition-all hover:shadow cursor-pointer relative ${st.color} ${
                    activeFilter === st.filter ? "ring-2 ring-[#3b5249] ring-offset-1" : "opacity-85"
                  }`}
                >
                  <span className="block text-[8px] font-mono font-bold uppercase tracking-wider text-gray-400">
                    {st.label}
                  </span>
                  <span className="block font-serif text-lg font-black mt-1">
                    {st.count} Items
                  </span>
                </button>
              );
            })}
          </div>

          {/* Controls Bar */}
          <div className="no-print flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#faf8f4] border border-[#dfd6be] p-3 rounded-lg">
            {/* Search */}
            <div className="w-full sm:max-w-xs relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search audit names or notes..."
                className="w-full text-xs pl-8 pr-3 py-1.5.5 bg-white border border-[#c8c2b5] rounded focus:outline-none focus:border-[#3b5249]"
              />
            </div>

            {/* Filter buttons inline */}
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1.5 sm:pb-0">
              <button
                type="button"
                onClick={() => {
                  setCsvUploaded(false);
                  setReconciledList([]);
                }}
                className="p-1 px-2.5 bg-[#8c7b6c] text-white font-mono text-[9px] font-bold uppercase rounded hover:bg-[#7a6a5b] flex items-center gap-1 cursor-pointer transition active:scale-95"
              >
                <RefreshCw className="w-3 h-3" /> Re-upload CSV
              </button>
            </div>
          </div>

          {/* 4. Display Ledger Report Case */}
          <div className="p-6 md:p-8 bg-white border border-[#c4beaf] rounded-lg space-y-6 shadow-md print:shadow-none print:border-none print:p-0">
            
            {/* Stamp Stamp */}
            <div className="text-center space-y-1.5 py-4 border-b-2 border-double border-[#beb39e] relative">
              <div className="flex justify-center mb-2">
                <SecludeLogo variant="horizontal" style={{ height: "40px", width: "auto" }} />
              </div>
              <span className="font-mono text-[9px] font-bold text-[#5c544d] uppercase tracking-widest block">
                LEASING RECONCILIATION AUDIT COMPLIANCE REPORT
              </span>
              <h3 className="font-serif text-lg md:text-xl font-bold tracking-tight text-[#1c1a18]">
                ESTATE OWNER RECONCILIATION DOSSIER
              </h3>
              <p className="text-[10px] font-mono text-[#6e645a] leading-relaxed uppercase">
                AUDITED ON: {new Date().toISOString().split("T")[0]} &bull; SECLUDE HOTELS — UCHAGAON FORT
              </p>
            </div>

            {/* Introductory compliance statement */}
            <p className="text-[11px] text-[#5c544d] font-serif leading-relaxed italic text-center max-w-2xl mx-auto">
              "This report presents a thorough cross-examination of the pre-lease Master Inventory requested by the Owner, automatically mapped with live Firestore digital custody catalogs. Displaced coordinates or degraded condition ratings generate immediate compliance notifications."
            </p>

            {/* Main breakdown chart listing */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#ece6da] pb-1.5">
                <h4 className="font-serif text-xs font-bold text-[#1c1a18] uppercase tracking-wide">
                  Active Comparison ledger ({filteredList.length} Items Listed)
                </h4>
                {activeFilter !== "All" && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                    Filter: Only {activeFilter}
                  </span>
                )}
              </div>

              <div className="border border-[#e2dbce] rounded-lg overflow-hidden">
                <table className="min-w-full text-left text-[11px] text-[#1c1a18] font-sans">
                  <thead className="bg-[#f2eee4] font-mono text-[8px] uppercase tracking-wider text-[#6e645a] border-b border-[#e2dbce]">
                    <tr>
                      <th className="p-2 px-3 font-bold">ID / Spot Code</th>
                      <th className="p-2 font-bold">Artifact Title</th>
                      <th className="p-2 font-bold">Owner Lease Baseline</th>
                      <th className="p-2 font-bold">Live System State</th>
                      <th className="p-2 font-bold">Discrepancy Grade</th>
                      <th className="p-2 font-bold text-right">Value $</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ece6da] bg-white">
                    {filteredList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-450 italic">
                          No items match the active search or classification filter.
                        </td>
                      </tr>
                    ) : (
                      filteredList.map((item) => {
                        let classBadge = "";
                        if (item.classification === "Matched") classBadge = "bg-emerald-50 border border-emerald-100 text-emerald-950 font-bold";
                        else if (item.classification === "Relocated") classBadge = "bg-amber-50 border border-amber-200 text-amber-950 font-bold";
                        else if (item.classification === "Condition Changed") classBadge = "bg-purple-50 border border-purple-200 text-purple-950 font-bold border-dashed";
                        else if (item.classification === "Missing") classBadge = "bg-red-50 border border-red-200 text-red-950 font-bold font-mono text-[9px]";
                        else if (item.classification === "Added") classBadge = "bg-blue-50 border border-blue-200 text-blue-950 font-bold text-[9px]";

                        return (
                          <tr key={item.id} className="hover:bg-gray-50/50 align-top">
                            {/* ID */}
                            <td className="p-2 px-3 font-mono font-bold text-[#3b5249]">{item.id}</td>
                            
                            {/* Title & Category */}
                            <td className="p-2">
                              <span className="font-bold text-gray-800 line-clamp-1">{item.name}</span>
                              <span className="text-[9px] text-gray-400 block italic leading-none">{item.category}</span>
                            </td>

                            {/* Base state */}
                            <td className="p-2 text-[#5c544d] space-y-0.5 text-[10px]">
                              {item.classification === "Added" ? (
                                <span className="text-gray-400 italic">No entry</span>
                              ) : (
                                <>
                                  <div className="leading-tight"><span className="text-[8.5px] uppercase font-mono text-gray-400 text-right">Room:</span> {item.originalLocation}</div>
                                  <div className="leading-tight"><span className="text-[8.5px] uppercase font-mono text-gray-400">Cond:</span> {item.originalCondition}</div>
                                </>
                              )}
                            </td>

                            {/* Live state */}
                            <td className="p-2 text-[#5c544d] space-y-0.5 text-[10px]">
                              {item.classification === "Missing" ? (
                                <span className="text-red-700 font-bold italic leading-tight">⚠️ OUT OF SYSTEM</span>
                              ) : (
                                <>
                                  <div className="leading-tight"><span className="text-[8.5px] uppercase font-mono text-gray-400">Room:</span> <span className={item.classification === "Relocated" ? "text-amber-800 font-semibold" : ""}>{item.currentLocation}</span></div>
                                  <div className="leading-tight"><span className="text-[8.5px] uppercase font-mono text-gray-400">Cond:</span> <span className={item.classification === "Condition Changed" ? "text-purple-850 font-semibold" : ""}>{item.currentCondition}</span></div>
                                </>
                              )}
                            </td>

                            {/* Grade classification & specific notes */}
                            <td className="p-2 space-y-1">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[8.5px] uppercase tracking-wide leading-none ${classBadge}`}>
                                {item.classification}
                              </span>
                              <p className="text-[9.5px] text-gray-500 leading-normal max-w-[200px] italic">
                                {item.notes}
                              </p>
                            </td>

                            {/* Value */}
                            <td className="p-2 font-mono text-right font-semibold text-[#1c1a18]">
                              ₹ {(item.estimatedValue ?? 0).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Official Audit Signature Stamp Signoff block */}
            <div className="pt-12 grid grid-cols-2 gap-8 md:gap-12 font-mono text-[8px] md:text-[9px] uppercase tracking-wider text-[#6e645a] border-t border-dashed border-[#beb39e]">
              <div className="space-y-6">
                <p>Audited and verified for Heritage Registry: <br /><strong>UCHAGAON HERITAGE REGISTRY TRUSTEE</strong></p>
                <div className="border-b border-gray-400 w-3/4"></div>
                <p>Signature & Seal Stamp</p>
              </div>
              <div className="space-y-6 text-right">
                <p>Acknowledged for Seclude Operators lessee: <br /><strong>SECLUDE HOTELS MAIN PRINCIPAL COMPLIANCE AUDITOR</strong></p>
                <div className="border-b border-gray-400 w-3/4 ml-auto"></div>
                <p>Signature & Seal Stamp</p>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
