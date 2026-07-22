import React, { useMemo, useState } from "react";
import { Artifact } from "../types";
import { groupByRoom } from "../lib/locations";
import { getPublicStoryUrl } from "../lib/propertyConfig";
import { SECLUDE_LOGO_DATA_URL } from "../lib/secludeLogoAsset";
import QRGenerator from "./QRGenerator";
import SecludeLogo from "./SecludeLogo";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import {
  BookOpen,
  Printer,
  FileText,
  CheckSquare,
  Square,
  Pencil,
  X,
  Save,
  Loader2,
  Search,
} from "lucide-react";

interface GuestStoryQRHubViewProps {
  artifacts: Artifact[];
  onBack: () => void;
  canEditStory: boolean;
  onUpdateStory: (itemId: string, patch: { story: string; description: string }) => Promise<void>;
}

export default function GuestStoryQRHubView({ artifacts, onBack, canEditStory, onUpdateStory }: GuestStoryQRHubViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupByRoomEnabled, setGroupByRoomEnabled] = useState(true);
  const [editingItem, setEditingItem] = useState<Artifact | null>(null);
  const [storyDraft, setStoryDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const groups = useMemo(() => groupByRoom(artifacts), [artifacts]);

  // Search only narrows the checklist to pick from — it never deselects an
  // already-checked item even if it scrolls out of view while searching.
  const query = searchQuery.trim().toLowerCase();
  const matchesSearch = (item: Artifact) =>
    !query ||
    [item.name, item.id, item.category, item.subCategory, item.material]
      .filter(Boolean)
      .some((f) => (f as string).toLowerCase().includes(query));
  const visibleGroups = query
    ? groups.map((g) => ({ ...g, items: g.items.filter(matchesSearch) })).filter((g) => g.items.length > 0)
    : groups;

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectRoom = (items: Artifact[]) => {
    const ids = items.map((i) => i.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds((prev) => (prev.length === artifacts.length ? [] : artifacts.map((a) => a.id)));
  };

  const openEditModal = (item: Artifact) => {
    setEditingItem(item);
    setStoryDraft(item.story || "");
    setDescriptionDraft(item.description || "");
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    setSavingEdit(true);
    try {
      await onUpdateStory(editingItem.id, { story: storyDraft, description: descriptionDraft });
      setEditingItem(null);
    } catch (err) {
      console.error("Failed to save guest story content:", err);
      alert("Could not save the story content. Please check your connection and try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const selectedArtifacts = artifacts.filter((a) => selectedIds.includes(a.id));
  const selectedGroups = groupByRoomEnabled
    ? groups
        .map((g) => ({ ...g, items: g.items.filter((i) => selectedIds.includes(i.id)) }))
        .filter((g) => g.items.length > 0)
    : [{ block: "", room: "", items: selectedArtifacts }];

  const executePrint = () => {
    window.focus();
    window.print();
  };

  const downloadPdfPlacards = async () => {
    if (selectedArtifacts.length === 0) return;
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const colWidth = 82;
      const rowHeight = 66;
      const colGap = 14;
      const rowGap = 8;
      const startX = 16;
      let startY = 18;
      let cursor = 0; // index within current page's 6-slot grid (2 cols x 3 rows)
      const perPage = 6;
      let pageHasContent = false;

      const orderedItems: { item: Artifact; room: string }[] = groupByRoomEnabled
        ? selectedGroups.flatMap((g) => g.items.map((item) => ({ item, room: g.room })))
        : selectedArtifacts.map((item) => ({ item, room: item.currentLocation || "" }));

      let lastRoom: string | null = null;

      for (let i = 0; i < orderedItems.length; i++) {
        const { item, room } = orderedItems[i];

        // Force a fresh page when the room changes in grouped mode, so each
        // room's placards are physically easy to separate and carry as a set.
        const roomChanged = groupByRoomEnabled && room !== lastRoom;
        if (pageHasContent && (cursor % perPage === 0 || roomChanged)) {
          doc.addPage();
          cursor = 0;
        }
        lastRoom = room;
        pageHasContent = true;

        if (cursor % perPage === 0 && groupByRoomEnabled) {
          doc.setFont("courier", "bold");
          doc.setFontSize(9);
          doc.setTextColor(60, 55, 50);
          doc.text(`ROOM: ${room.toUpperCase()}`, startX, 12);
        }

        const pageIdx = cursor % perPage;
        const col = pageIdx % 2;
        const row = Math.floor(pageIdx / 2);
        const x = startX + col * (colWidth + colGap);
        const y = startY + row * (rowHeight + rowGap);

        const storyUrl = getPublicStoryUrl(item);
        const qrDataUrl = await QRCode.toDataURL(storyUrl, {
          margin: 1,
          width: 150,
          color: { dark: "#1c1a18", light: "#ffffff" },
        });

        doc.setDrawColor(180, 170, 150);
        doc.setLineWidth(0.4);
        doc.setLineDashPattern([2, 2], 0);
        doc.roundedRect(x, y, colWidth, rowHeight, 3, 3, "S");
        doc.setLineDashPattern([], 0);

        try {
          doc.addImage(SECLUDE_LOGO_DATA_URL, "PNG", x + colWidth / 2 - 13, y + 5, 26, 6.2, undefined, "FAST");
        } catch (_) {}

        doc.setFont("courier", "bold");
        doc.setFontSize(5.5);
        doc.setTextColor(140, 130, 115);
        doc.text("SCAN FOR THE STORY", x + colWidth / 2, y + 15, { align: "center" });

        const qrSize = 30;
        const qrX = x + colWidth / 2 - qrSize / 2;
        const qrY = y + 18;
        doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

        doc.setFont("times", "bold");
        doc.setFontSize(9);
        doc.setTextColor(28, 26, 24);
        const nameLines = doc.splitTextToSize(item.name || "Unnamed Piece", colWidth - 10);
        doc.text(nameLines.slice(0, 2), x + colWidth / 2, y + qrSize + 25, { align: "center" });

        cursor++;
      }

      doc.save("SECLUDE-GUEST-STORY-QR-PLACARDS.pdf");
    } catch (err) {
      console.error("Guest story PDF generation failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#dfd6be] pb-3">
        <div>
          <span className="block text-[9px] font-mono uppercase tracking-widest text-[#8e847a] font-bold mb-0.5">Seclude Fort Uchagaon</span>
          <h2 className="font-serif text-xl font-bold text-[#1c1a18] flex items-center gap-1.5">
            <BookOpen className="w-5 h-5 text-[#3b5249]" /> Guest Story QR Printing Hub
          </h2>
          <p className="text-xs text-[#6e645a] font-serif italic mt-0.5">
            Generate and print guest-facing "scan for the story" placards, organized room-by-room for physical placement.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <button onClick={onBack} className="p-1 px-3 border border-[#c4beaf] hover:bg-[#eae5d9] rounded font-bold uppercase cursor-pointer">
            Back
          </button>

          <button
            onClick={() => setGroupByRoomEnabled((v) => !v)}
            className={`p-1 px-3 rounded font-bold uppercase border cursor-pointer ${
              groupByRoomEnabled ? "bg-[#3b5249] text-white border-[#2f423a]" : "bg-white border-[#beb39e] hover:bg-[#eae5d9]"
            }`}
          >
            Room-Wise Grouping: {groupByRoomEnabled ? "On" : "Off"}
          </button>

          <button onClick={handleSelectAll} className="p-1 px-3 bg-white hover:bg-[#eae5d9] border border-[#beb39e] rounded font-bold uppercase cursor-pointer">
            {selectedIds.length === artifacts.length ? "Deselect All" : "Select All Pieces"}
          </button>

          <button
            disabled={selectedIds.length === 0}
            onClick={downloadPdfPlacards}
            className={`p-1 px-4 text-white rounded font-bold uppercase flex items-center gap-1.5 border shadow transition active:scale-95 ${
              selectedIds.length === 0 ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed" : "bg-[#8c745c] border-[#735d48] hover:bg-[#735d48] cursor-pointer"
            }`}
          >
            <FileText className="w-4 h-4 text-amber-200" /> Download PDF ({selectedIds.length})
          </button>

          <button
            disabled={selectedIds.length === 0}
            onClick={executePrint}
            className={`p-1 px-4 rounded font-bold uppercase flex items-center gap-1.5 border shadow ${
              selectedIds.length === 0 ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed" : "bg-white border-[#beb39e] text-[#1c1a18] hover:bg-gray-50 cursor-pointer"
            }`}
          >
            <Printer className="w-4 h-4 text-emerald-800" /> Print via Browser
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: room-grouped checklist */}
        <div className="no-print lg:col-span-4 bg-[#fdfcf7] border border-[#dcd6c8] rounded shadow-sm p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <h4 className="font-serif text-sm font-bold text-[#1c1a18]">Room-by-Room Checklist</h4>
            <p className="text-[10px] font-mono text-[#8e847a]">Select items, or check off a whole room at once.</p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8e847a] absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search room, name, ID, category, material..."
              className="w-full pl-8 pr-8 py-2 bg-white border border-[#c8c2b5] rounded text-xs focus:outline-none focus:border-[#3b5249] font-sans"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")} className="absolute right-2.5 top-2.5 text-[#8e847a] hover:text-[#1c1a18] cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="h-px bg-[#ece6da]"></div>

          {query && visibleGroups.length === 0 && (
            <p className="text-[10px] font-mono text-[#8e847a] text-center py-4">No items match "{searchQuery}".</p>
          )}

          {visibleGroups.map(({ block, room, items }) => {
            const allSelected = items.every((i) => selectedIds.includes(i.id));
            const someSelected = items.some((i) => selectedIds.includes(i.id));
            return (
              <div key={room} className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => toggleSelectRoom(items)}
                  className="w-full flex items-center justify-between gap-2 px-1 py-1 hover:bg-[#f6f2ec] rounded cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#3b5249]">
                    {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : someSelected ? <Square className="w-3.5 h-3.5 text-[#8c745c]" /> : <Square className="w-3.5 h-3.5 text-gray-300" />}
                    {room}
                  </span>
                  <span className="text-[9px] font-mono text-[#8e847a]">{items.length}</span>
                </button>
                <div className="pl-4 space-y-1">
                  {items.map((item) => {
                    const selected = selectedIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`p-1.5 rounded border text-xs flex items-center justify-between gap-1.5 hover:bg-[#f6f2ec] border-transparent ${
                          selected ? "bg-[#f5efe4] border-[#d2cca0]" : "bg-[#fcfbf9]"
                        }`}
                      >
                        <button type="button" onClick={() => toggleSelectItem(item.id)} className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer text-left">
                          {selected ? <CheckSquare className="w-3.5 h-3.5 text-[#3b5249] shrink-0" /> : <Square className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                          <span className="truncate text-[#1c1a18]">{item.name}</span>
                        </button>
                        {canEditStory && (
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            title="Edit guest story content"
                            className="shrink-0 p-1 text-[#8c745c] hover:text-[#3b5249] hover:bg-[#eae5d9] rounded cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT: printable placard grid, grouped by room */}
        <div className="lg:col-span-8 space-y-4">
          <div className="no-print p-2 bg-[#eae2d0] rounded text-center text-[10px] font-mono italic text-[#5c544d] border border-[#dfd6be]">
            👇 Live rendered placards. Print pages strip all navigation. Toggle room-wise grouping above.
          </div>

          {selectedArtifacts.length === 0 ? (
            <div className="bg-[#fdfcf7] border border-[#dcd6c8] p-12 text-center rounded text-[#8e847a] no-print">
              <BookOpen className="w-8 h-8 text-[#beb5a1] mx-auto mb-2" />
              <p className="text-xs">No items checked in the room-by-room checklist on the left.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {selectedGroups.map((g) => (
                <div key={g.room || "flat"} className="space-y-3 break-inside-avoid">
                  {groupByRoomEnabled && (
                    <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-[#3b5249] border-b border-[#dfd6be] pb-1 print-page-break-inside-avoid">
                      {g.block} — {g.room}
                    </h3>
                  )}
                  <div className="p-4 bg-white rounded border border-[#ece6da] print:border-none print:p-0 grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-6">
                    {g.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 bg-white border-2 border-dashed border-[#beb39e] print:border-2 print:border-slate-800 rounded-lg flex flex-col items-center text-center gap-2 relative overflow-hidden break-inside-avoid shadow-sm print:shadow-none"
                      >
                        <div className="flex items-center gap-1.5">
                          <SecludeLogo variant="mark" className="text-[#3b5249]" style={{ height: "14px", width: "14px" }} />
                          <span className="text-[6.5px] font-mono tracking-widest text-[#8e847a] uppercase font-bold leading-none">Scan For The Story</span>
                        </div>
                        <div className="w-24 h-24 bg-white flex items-center justify-center p-1 border border-gray-150 rounded">
                          <QRGenerator value={getPublicStoryUrl(item)} className="w-full h-full text-[#1c1a18]" />
                        </div>
                        <h4 className="font-serif text-xs font-bold text-[#1c1a18] tracking-tight leading-normal line-clamp-2">{item.name}</h4>
                        <p className="text-[8.5px] font-mono text-[#8e847a]">{item.currentLocation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Story Modal */}
      {editingItem && (
        <div className="no-print fixed inset-0 bg-[#1c1a18]/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#fdfcf7] border border-[#dcd6c8] w-full max-w-lg rounded-xl shadow-2xl relative">
            <div className="bg-[#1c1a18] p-4 text-white flex items-center justify-between border-b border-[#3e3835] rounded-t-xl">
              <div>
                <span className="font-serif font-semibold text-sm text-[#f5efe4]">Edit Guest Story Content</span>
                <p className="text-[10px] font-mono text-[#a8baa2] mt-0.5">{editingItem.name} ({editingItem.id})</p>
              </div>
              <button onClick={() => setEditingItem(null)} className="p-1 hover:bg-[#322f2b] rounded-full text-gray-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#6e645a]">
                  Story (shown to guests — falls back to description if empty)
                </label>
                <textarea
                  value={storyDraft}
                  onChange={(e) => setStoryDraft(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 bg-white border border-[#c8c2b5] rounded text-sm focus:outline-none focus:border-[#3b5249] font-serif"
                  placeholder="The poetic narrative shown on the public guest story page..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#6e645a]">
                  Description (fallback, also used elsewhere in the catalog)
                </label>
                <textarea
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-[#c8c2b5] rounded text-sm focus:outline-none focus:border-[#3b5249]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs font-mono font-bold uppercase bg-white border border-[#c4beaf] rounded hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="px-4 py-2 bg-[#3b5249] hover:bg-[#2f423a] text-white text-xs font-bold uppercase rounded flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
