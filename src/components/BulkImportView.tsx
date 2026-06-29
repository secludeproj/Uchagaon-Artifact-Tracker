import React, { useState } from "react";
import { FileSpreadsheet, Upload, CheckCircle, AlertTriangle, ArrowRightLeft } from "lucide-react";

interface BulkImportViewProps {
  onImportSuccess: (importedItems: any[]) => void;
  onCancel: () => void;
}

export default function BulkImportView({ onImportSuccess, onCancel }: BulkImportViewProps) {
  const [csvContent, setCsvContent] = useState("");
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [parseError, setParseError] = useState("");
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const sampleTemplate = `name,category,estimatedAge,material,condition,estimatedValue,originalLocation,currentLocation,status,handlingNotes
"Late Mughal Ivory Dagger","Weaponry & Armor","approx. 220 years","Ivory, steel blade","Fair",18000,"Palace North Armory","Hotel Lobby display-1","On Display","Handle with custom gloves"
"Embroidered Mughal Zardozi Tapestry","Textiles & Carpets","approx. 140/years","Silk filaments, gold threads","Good",35000,"Zenana Dining Salon","Suite Room 102 Lounge","On Display","Keep away from humidity"
"Uchagaon Terracotta Glazed Pot","Ceramics & Pottery","approx. 90 years","Clay, cobalt slip","Poor",4500,"Queens Courtyard Garden","Restaurant Patio Gallery","On Display","Inspect monthly for cracks"`;

  const handleLoadTemplate = () => {
    setCsvContent(sampleTemplate.trim());
    handleParseCsv(sampleTemplate.trim());
  };

  const handleParseCsv = (rawText: string) => {
    setParseError("");
    setPreviewRows([]);
    
    if (!rawText.trim()) {
      setParseError("Please input CSV raw row-lines values first.");
      return;
    }

    try {
      const lines = rawText.split("\n");
      if (lines.length < 2) {
        setParseError("CSV input must contain at least a single header row and matching body values.");
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
      const parsedRows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Custom comma splitting regex to obey internal quote commas (e.g. "Weaponry, Arms")
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
        const rowValues = matches.map(val => val.trim().replace(/^["']|["']$/g, ""));

        const rowObj: Record<string, string> = {};
        headers.forEach((hdr, colIdx) => {
          rowObj[hdr] = rowValues[colIdx] || "";
        });

        parsedRows.push(rowObj);
      }

      setPreviewRows(parsedRows);
    } catch (err: any) {
      setParseError(`CSV Parsing syntax fault: ${err.message}`);
    }
  };

  const handleExecuteImport = () => {
    if (previewRows.length === 0) return;
    onImportSuccess(previewRows);
    setSuccessCount(previewRows.length);
    setCsvContent("");
    setPreviewRows([]);
  };

  return (
    <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded shadow-lg overflow-hidden max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-[#3b5249] text-white p-4 px-6 border-b border-[#2d3e37]">
        <h3 className="font-serif text-base font-bold flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-[#eae2d0]" /> Bulk Excel/CSV Catalogue Importer
        </h3>
        <p className="text-[10px] font-mono text-[#a8baa2] uppercase tracking-wider mt-0.5">
          Process batch heritage files spreadsheet updates
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h4 className="font-serif text-sm font-bold text-[#1a1a17]">Paste Raw Spreadsheet CSV Grid Data</h4>
          <p className="text-xs text-[#5c544d] max-w-xl leading-relaxed mt-1">
            Rather than editing individual files by hand, you can mass-import dozens of assets at a time. Copy columns from Excel, paste them below in comma-separated values, and verify before committing.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-mono font-bold text-[#5c544d]">
            <span>SPREADSHEET FORMAT TERMINAL</span>
            <button
              onClick={handleLoadTemplate}
              className="text-[#3b5249] underline hover:text-[#52645b] cursor-pointer"
            >
              Load Reference Sample Template
            </button>
          </div>

          <textarea
            value={csvContent}
            onChange={(e) => {
              setCsvContent(e.target.value);
              handleParseCsv(e.target.value);
            }}
            placeholder={`name,category,estimatedAge,material,condition,estimatedValue,originalLocation,currentLocation,status,handlingNotes\n"Uchagaon Sword","Weaponry & Armor","150 years","steel,gold","Good",24000,"East Saloon","Lobby","On Display","No raw hands touch"`}
            rows={10}
            className="w-full text-xs font-mono p-3 bg-[#faf9f6] border border-[#c4beaf] rounded focus:outline-none focus:border-[#3b5249] "
          />
        </div>

        {/* Errors & Analytics */}
        {parseError && (
          <div className="p-3 bg-red-50 border border-red-150 rounded text-red-700 text-xs flex gap-1.5 items-center">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {successCount !== null && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-150 rounded text-emerald-800 text-xs flex gap-1.5 items-center font-bold">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Success: Batch committed {successCount} heritage artifacts to the live database!</span>
          </div>
        )}

        {/* Parsed Previews list table */}
        {previewRows.length > 0 && (
          <div className="space-y-2.5">
            <span className="block text-[10px] font-mono font-bold tracking-widest text-[#5c544d]">
              VERIFY PREVIEW ({previewRows.length} RECORDS PARSED)
            </span>

            <div className="border border-[#e2dbce] rounded overflow-hidden divide-y divide-[#ece6da] bg-white max-h-44 overflow-y-auto">
              <table className="min-w-full text-left text-xs text-[#1c1a18] font-sans">
                <thead className="bg-[#f0ece2] font-mono text-[9px] uppercase tracking-wide text-[#6e645a] sticky top-0 border-b border-[#e2dbce]">
                  <tr>
                    <th className="p-2 py-1 px-3">Name</th>
                    <th className="p-2 py-1">Category</th>
                    <th className="p-2 py-1">Est Age</th>
                    <th className="p-2 py-1">Value</th>
                    <th className="p-2 py-1">Current Hall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece6da]">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2 px-3 font-semibold text-[#111110] truncate max-w-[150px]">{row.name || "N/A"}</td>
                      <td className="p-2 italic text-gray-500">{row.category || "N/A"}</td>
                      <td className="p-2 font-mono text-[10px]">{row.estimatedAge || "N/A"}</td>
                      <td className="p-2 font-mono text-amber-800 font-bold">₹ {row.estimatedValue || "0"}</td>
                      <td className="p-2 font-serif text-[11px] text-[#3b5249] font-semibold">{row.currentLocation || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Importer Controls footer button action */}
        <div className="flex justify-between items-center pt-4 border-t border-[#ece6da] font-mono text-xs text-[#6e645a]">
          <button
            onClick={onCancel}
            className="p-2 px-5 bg-white hover:bg-gray-100 border border-[#c4beaf] rounded font-bold uppercase tracking-wide"
          >
            Go Back
          </button>
          
          <button
            disabled={previewRows.length === 0}
            onClick={handleExecuteImport}
            className={`p-2.5 px-6 rounded font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md ${
              previewRows.length === 0 
                ? "bg-gray-100 text-gray-300 border border-gray-200 cursor-not-allowed"
                : "bg-[#3b5249] hover:bg-[#2c3d36] text-white cursor-pointer active:scale-95"
            }`}
          >
            Commits {previewRows.length} Artifacts to database ✓
          </button>
        </div>
      </div>
    </div>
  );
}
