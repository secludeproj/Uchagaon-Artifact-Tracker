import React, { useState } from "react";
import { FileSpreadsheet, CheckCircle, AlertTriangle, CornerDownRight } from "lucide-react";
import { blockForLocation } from "../lib/locations";

interface BulkImportViewProps {
  onImportSuccess: (importedItems: any[]) => void;
  onCancel: () => void;
}

// Sensible defaults for fields that no longer need to be in every row.
const FIELD_DEFAULTS: Record<string, string> = {
  estimatedAge: "Unknown",
  estimatedValue: "",
  status: "On Display",
  condition: "Not Assessed",
  quantity: "1",
};

export default function BulkImportView({ onImportSuccess, onCancel }: BulkImportViewProps) {
  const [csvContent, setCsvContent] = useState("");
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [parseError, setParseError] = useState("");
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const sampleTemplate = `room,block,driveLink,name,category,subCategory,quantity,dimensions,material,estimatedAge,condition,estimatedValue,currentLocation,status,handlingNotes
"Room 3","A Block — Main Haveli","https://drive.google.com/drive/folders/room3-example","Late Mughal Ivory Dagger","Weaponry & Armor","Dagger",1,"32cm length","Ivory, steel blade","approx. 220 years","Fair",18000,,"On Display","Handle with custom gloves"
,,,"Ceremonial Powder Horn","Weaponry & Armor","Powder Horn",2,"18cm length","Horn, brass fittings",,,,,,
"Tiger Room","A Block — Main Haveli","https://drive.google.com/drive/folders/tiger-room-example","Embroidered Zardozi Tapestry","Textiles & Carpets",,1,"210cm x 140cm","Silk filaments, gold threads","approx. 140 years","Good",35000,"Living Room","On Display","Keep away from humidity"
"Sun Room","A Block — Main Haveli",,"Uchagaon Terracotta Glazed Pot","Ceramics & Pottery",,1,,"Clay, cobalt slip","approx. 90 years","Poor",4500,"Room 21",,"Inspect monthly for cracks"`;

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

      // Detect the actual delimiter in use. Pasting straight from a
      // spreadsheet app (Excel/Google Sheets) copies cells as tab-separated,
      // not comma-separated — if we only ever split on commas, every column
      // silently collapses into one and the whole preview shows N/A.
      const headerLine = lines[0];
      const commaCount = (headerLine.match(/,/g) || []).length;
      const tabCount = (headerLine.match(/\t/g) || []).length;
      const multiSpaceCount = (headerLine.match(/ {2,}/g) || []).length;
      let delimiter: string | RegExp = ",";
      if (tabCount > commaCount && tabCount > multiSpaceCount) {
        delimiter = "\t";
      } else if (multiSpaceCount > commaCount) {
        // Some spreadsheet copy/paste renders columns as padded spaces
        // rather than a real tab or comma character.
        delimiter = /\s{2,}/;
      }

      const headers = headerLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ""));
      const parsedRows: any[] = [];

      // Running "merged cell" state, carried down across rows until a new
      // explicit value appears in one of the forward-fill columns.
      let lastRoom = "";
      let lastBlock = "";
      let lastDriveLink = "";

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Splitter that respects quoted commas/tabs and preserves empty
        // fields between delimiters (essential for merged-cell forward-fill
        // blanks).
        const rowValues = splitCsvLine(line, delimiter);

        const rawRow: Record<string, string> = {};
        headers.forEach((hdr, colIdx) => {
          rawRow[hdr] = (rowValues[colIdx] ?? "").trim().replace(/^["']|["']$/g, "");
        });

        // ── Forward-fill room / block / driveLink ──────────────────────────
        const inherited: Record<string, boolean> = {};
        if (rawRow.room) {
          lastRoom = rawRow.room;
        } else {
          inherited.room = true;
        }
        if (rawRow.block) {
          lastBlock = rawRow.block;
        } else {
          inherited.block = true;
        }
        if (rawRow.driveLink) {
          lastDriveLink = rawRow.driveLink;
        } else if (lastDriveLink) {
          inherited.driveLink = true;
        }

        const resolvedRoom = rawRow.room || lastRoom;
        const resolvedBlock = rawRow.block || lastBlock;
        const resolvedDriveLink = rawRow.driveLink || lastDriveLink;

        // ── Location auto-fill (rule: currentLocation = originalLocation
        //    when only one location is given) ─────────────────────────────
        const originalLocation = rawRow.originalLocation || resolvedRoom || "";
        const currentLocation = rawRow.currentLocation || originalLocation;

        // Flag (don't block) a mismatch between the stated block and the
        // block the room actually belongs to, so it's visible in preview.
        const actualBlock = originalLocation ? blockForLocation(originalLocation) : "";
        const blockMismatch = !!(resolvedBlock && actualBlock && actualBlock !== "Other / Custom" && resolvedBlock !== actualBlock);

        // ── Optional-with-defaults fields ──────────────────────────────────
        const quantityNum = parseInt(rawRow.quantity, 10);

        // The database only accepts a fixed set of condition values. Bulk
        // import previously passed whatever text was in the CSV straight
        // through — if even one row out of hundreds had something outside
        // that list (a stray value like "Needs Cleaning", or a leftover
        // Excel force-text quote mark), the *entire* batch insert failed,
        // not just that row. Normalize it here instead, and keep the
        // original text as a handling note rather than silently losing it.
        const rawCondition = (rawRow.condition || "").replace(/^'+|'+$/g, "").trim();
        const VALID_CONDITIONS = ["mint", "good", "fair", "poor", "damaged", "not assessed"];
        let resolvedCondition = FIELD_DEFAULTS.condition;
        let conditionNote = "";
        if (rawCondition) {
          const match = VALID_CONDITIONS.find(v => v === rawCondition.toLowerCase());
          if (match) {
            resolvedCondition = match.replace(/\b\w/g, c => c.toUpperCase());
          } else {
            conditionNote = `Original condition note: "${rawCondition}"`;
          }
        }

        const rowObj: Record<string, any> = {
          name: rawRow.name || "",
          category: rawRow.category || "",
          subCategory: rawRow.subCategory || undefined,
          quantity: !isNaN(quantityNum) && quantityNum > 0 ? quantityNum : Number(FIELD_DEFAULTS.quantity),
          dimensions: rawRow.dimensions || "",
          material: rawRow.material || "",
          estimatedAge: rawRow.estimatedAge || FIELD_DEFAULTS.estimatedAge,
          condition: resolvedCondition,
          estimatedValue: rawRow.estimatedValue ? Number(rawRow.estimatedValue) || 0 : null,
          originalLocation,
          currentLocation,
          status: rawRow.status || FIELD_DEFAULTS.status,
          handlingNotes: [rawRow.handlingNotes || "", conditionNote].filter(Boolean).join(" | "),
          driveLink: resolvedDriveLink || undefined,

          // Preview-only bookkeeping — stripped before the actual DB insert.
          _room: resolvedRoom,
          _block: resolvedBlock,
          _inherited: inherited,
          _blockMismatch: blockMismatch,
          _conditionNormalized: !!conditionNote,
          _actualBlock: actualBlock,
        };

        parsedRows.push(rowObj);
      }

      setPreviewRows(parsedRows);
    } catch (err: any) {
      setParseError(`CSV Parsing syntax fault: ${err.message}`);
    }
  };

  const handleExecuteImport = () => {
    if (previewRows.length === 0) return;

    // Strip the preview-only helper fields before handing rows off to the
    // actual Supabase insert path.
    const cleanRows = previewRows.map(({ _room, _block, _inherited, _blockMismatch, _actualBlock, _conditionNormalized, ...rest }) => rest);

    onImportSuccess(cleanRows);
    setSuccessCount(cleanRows.length);
    setCsvContent("");
    setPreviewRows([]);
  };

  const mismatchCount = previewRows.filter(r => r._blockMismatch).length;
  const conditionNormalizedCount = previewRows.filter(r => r._conditionNormalized).length;

  return (
    <div className="bg-[#fdfcf7] border border-[#dcd6c8] rounded shadow-lg overflow-hidden max-w-4xl mx-auto">
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
          <p className="text-xs text-[#5c544d] max-w-2xl leading-relaxed mt-1.5 bg-[#f7f5f0] border border-[#eae5d9] rounded p-2.5">
            <strong className="text-[#3b5249]">Merged-cell style grouping:</strong> leave <code className="font-mono bg-white px-1 rounded border border-[#e2dbce]">room</code>, <code className="font-mono bg-white px-1 rounded border border-[#e2dbce]">block</code>, and <code className="font-mono bg-white px-1 rounded border border-[#e2dbce]">driveLink</code> blank on rows after the first for a given room — they'll carry down automatically, same as merged cells in Excel. <code className="font-mono bg-white px-1 rounded border border-[#e2dbce]">estimatedAge</code>, <code className="font-mono bg-white px-1 rounded border border-[#e2dbce]">condition</code>, <code className="font-mono bg-white px-1 rounded border border-[#e2dbce]">estimatedValue</code>, and <code className="font-mono bg-white px-1 rounded border border-[#e2dbce]">status</code> are optional now too, with sensible defaults if left blank.
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
            placeholder={`room,block,driveLink,name,category,subCategory,quantity,dimensions,material,estimatedAge,condition,estimatedValue,currentLocation,status,handlingNotes\n"Room 1","A Block — Main Haveli","https://drive.google.com/...","Uchagaon Sword","Weaponry & Armor",,1,,"steel,gold","150 years","Good",24000,"Room 21","On Display","No raw hands touch"`}
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

        {mismatchCount > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs flex gap-1.5 items-center">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {mismatchCount} row{mismatchCount === 1 ? "" : "s"} list a <code className="font-mono">block</code> that doesn't match the room's actual block — check the ⚠ marked rows below. Import isn't blocked, just flagged for your review.
            </span>
          </div>
        )}

        {conditionNormalizedCount > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs flex gap-1.5 items-center">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {conditionNormalizedCount} row{conditionNormalizedCount === 1 ? "" : "s"} had a <code className="font-mono">condition</code> value the database doesn't accept (e.g. "Needs Cleaning" instead of Mint/Good/Fair/Poor/Damaged) — set to "Not Assessed" and the original text kept in that row's handling notes so nothing is lost.
            </span>
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
              VERIFY PREVIEW ({previewRows.length} RECORDS PARSED) — <CornerDownRight className="inline w-3 h-3 -mt-0.5" /> marks a value inherited from a row above
            </span>

            <div className="border border-[#e2dbce] rounded overflow-hidden divide-y divide-[#ece6da] bg-white max-h-64 overflow-y-auto overflow-x-auto">
              <table className="min-w-[900px] text-left text-xs text-[#1c1a18] font-sans">
                <thead className="bg-[#f0ece2] font-mono text-[9px] uppercase tracking-wide text-[#6e645a] sticky top-0 border-b border-[#e2dbce]">
                  <tr>
                    <th className="p-2 py-1 px-3">Room / Block</th>
                    <th className="p-2 py-1">Name</th>
                    <th className="p-2 py-1">Category</th>
                    <th className="p-2 py-1">Sub-Cat</th>
                    <th className="p-2 py-1">Qty</th>
                    <th className="p-2 py-1">Dimensions</th>
                    <th className="p-2 py-1">Est Age</th>
                    <th className="p-2 py-1">Condition</th>
                    <th className="p-2 py-1">Value</th>
                    <th className="p-2 py-1">Current Loc</th>
                    <th className="p-2 py-1">Status</th>
                    <th className="p-2 py-1">Drive Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece6da]">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className={`hover:bg-gray-50 ${row._blockMismatch ? "bg-amber-50" : ""}`}>
                      <td className="p-2 px-3 font-serif text-[11px] text-[#3b5249] font-semibold whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          {row._inherited?.room && <CornerDownRight className="w-3 h-3 text-gray-400 shrink-0" />}
                          {row._room || "N/A"}
                        </span>
                        <span className="flex items-center gap-1 text-[9px] font-mono text-gray-500 font-normal">
                          {row._inherited?.block && <CornerDownRight className="w-2.5 h-2.5 text-gray-400 shrink-0" />}
                          {row._block || "—"}
                          {row._blockMismatch && (
                            <span title={`Room actually belongs to ${row._actualBlock}`} className="text-amber-600">⚠</span>
                          )}
                        </span>
                      </td>
                      <td className="p-2 font-semibold text-[#111110] truncate max-w-[150px]">{row.name || "N/A"}</td>
                      <td className="p-2 italic text-gray-500">{row.category || "N/A"}</td>
                      <td className="p-2 text-gray-500">{row.subCategory || "—"}</td>
                      <td className="p-2 font-mono text-center">{row.quantity}</td>
                      <td className="p-2 font-mono text-[10px]">{row.dimensions || "—"}</td>
                      <td className="p-2 font-mono text-[10px]">{row.estimatedAge}</td>
                      <td className="p-2 font-mono text-[10px]">{row.condition}</td>
                      <td className="p-2 font-mono text-amber-800 font-bold">{row.estimatedValue !== null ? `₹ ${row.estimatedValue}` : "—"}</td>
                      <td className="p-2 font-serif text-[11px] text-[#3b5249] font-semibold">{row.currentLocation || "N/A"}</td>
                      <td className="p-2 font-mono text-[10px]">{row.status}</td>
                      <td className="p-2 max-w-[120px] truncate">
                        {row.driveLink ? (
                          <span className="flex items-center gap-1 text-[10px]">
                            {row._inherited?.driveLink && <CornerDownRight className="w-2.5 h-2.5 text-gray-400 shrink-0" />}
                            <a href={row.driveLink} target="_blank" rel="noreferrer" className="text-blue-700 underline truncate">link</a>
                          </span>
                        ) : "—"}
                      </td>
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

// Splits a single CSV line on commas while respecting quoted fields (so a
// comma inside "Weaponry, Arms" doesn't split into two columns) and, unlike
// the previous regex-based approach, correctly preserves empty fields
// between commas — which is essential for merged-cell forward-fill blanks.
function splitCsvLine(line: string, delimiter: string | RegExp = ","): string[] {
  if (delimiter instanceof RegExp) {
    // This branch bypassed quote-stripping entirely before — any field
    // Excel wrapped in quotes (which it does for values containing special
    // characters, or sometimes just inconsistently) kept its literal " "
    // characters instead of having them stripped like the comma/tab path does.
    return line.trim().split(delimiter).map(v => v.trim().replace(/^"(.*)"$/, "$1"));
  }

  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside a quoted field (the "" convention) — emit
        // one literal " and skip the second quote character.
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
